import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBudget,
  deleteBudgetLines,
  deleteWorker,
  getAllBudgets,
  getAllCommissions,
  getAllFixedCosts,
  getAllProjectHistory,
  getAllProjectTypes,
  getAllUsers,
  getAllWorkers,
  getActiveWorkers,
  getBudgetWithLines,
  getDashboardStats,
  getIntegrationConfig,
  getNextBudgetNumber,
  insertBudgetLines,
  recalcProjectTypeAverages,
  updateBudget,
  upsertCommission,
  upsertFixedCost,
  upsertIntegrationConfig,
  upsertProjectHistory,
  upsertProjectType,
  upsertWorker,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import axios from "axios";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo el superadmin puede realizar esta acción." });
  return next({ ctx });
});

// ─── Workers router ───────────────────────────────────────────────────────────
const workersRouter = router({
  list: protectedProcedure.query(() => getAllWorkers()),
  listActive: protectedProcedure.query(() => getActiveWorkers()),
  upsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        department: z.enum(["seo", "design", "development", "management", "various"]),
        costPerDay: z.string(),
        salePricePerDay: z.string(),
        clockifyUserId: z.string().optional(),
        clockifyUserEmail: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => upsertWorker(input as any)),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => deleteWorker(input.id)),
});

// ─── Project types router ─────────────────────────────────────────────────────
const projectTypesRouter = router({
  list: protectedProcedure.query(() => getAllProjectTypes()),
  upsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        slug: z.string().min(1),
        avgSeoDays: z.string().optional(),
        avgDesignDays: z.string().optional(),
        avgDevDays: z.string().optional(),
        avgVariousDays: z.string().optional(),
      })
    )
    .mutation(({ input }) => upsertProjectType(input as any)),
});

// ─── Fixed costs router ───────────────────────────────────────────────────────
const fixedCostsRouter = router({
  list: protectedProcedure.query(() => getAllFixedCosts()),
  upsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        monthlyAmount: z.string(),
        projectAllocationPct: z.string(),
        category: z.enum(["management", "infrastructure", "licenses", "other"]),
        holdedSource: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => upsertFixedCost(input as any)),
});

// ─── Commissions router ───────────────────────────────────────────────────────
const commissionsRouter = router({
  list: protectedProcedure.query(() => getAllCommissions()),
  upsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        percentage: z.string(),
        appliesTo: z.enum(["subtotal", "with_management"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => upsertCommission(input as any)),
});

// ─── Budgets router ───────────────────────────────────────────────────────────
const BudgetLineInput = z.object({
  id: z.number().optional(),
  workerId: z.number().nullable().optional(),
  area: z.enum(["seo", "design", "development", "management", "commission", "various", "fixed"]),
  description: z.string(),
  estimatedDays: z.string().optional(),
  costPerDay: z.string().optional(),
  salePricePerDay: z.string().optional(),
  lineCost: z.string().optional(),
  lineSale: z.string().optional(),
  isFixedPrice: z.boolean().optional(),
  fixedPrice: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
});

const budgetsRouter = router({
  list: protectedProcedure.query(() => getAllBudgets()),
  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getBudgetWithLines(input.id)),
  dashboard: protectedProcedure.query(() => getDashboardStats()),
  nextNumber: protectedProcedure.query(() => getNextBudgetNumber()),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        projectName: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().optional(),
        projectTypeId: z.number().nullable().optional(),
        managementPct: z.string().optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
        totalCost: z.string().optional(),
        totalSale: z.string().optional(),
        grossMargin: z.string().optional(),
        grossMarginPct: z.string().optional(),
        fixedCostsAmount: z.string().optional(),
        netMargin: z.string().optional(),
        netMarginPct: z.string().optional(),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        holdedContactId: z.string().optional(),
        lines: z.array(BudgetLineInput),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, lines, ...budgetData } = input;

      // Alert owner if margin < 20%
      const netMarginPct = parseFloat(budgetData.netMarginPct ?? "0");
      if (netMarginPct < 20 && netMarginPct > 0) {
        await notifyOwner({
          title: `⚠️ Presupuesto con margen bajo: ${budgetData.projectName}`,
          content: `El presupuesto para "${budgetData.projectName}" (cliente: ${budgetData.clientName}) tiene un margen neto del ${netMarginPct.toFixed(1)}%, por debajo del umbral del 20%. Revísalo antes de enviarlo.`,
        }).catch(() => {});
      }

      if (id) {
        await updateBudget(id, budgetData as any);
        await deleteBudgetLines(id);
        if (lines.length > 0) {
          await insertBudgetLines(lines.map((l, i) => ({ ...l, budgetId: id, sortOrder: i } as any)));
        }
        return { id };
      } else {
        const budgetNumber = await getNextBudgetNumber();
        const newId = await createBudget({ ...budgetData, budgetNumber, createdBy: ctx.user.id } as any);
        if (lines.length > 0) {
          await insertBudgetLines(lines.map((l, i) => ({ ...l, budgetId: newId, sortOrder: i } as any)));
        }
        return { id: newId };
      }
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["draft", "sent", "accepted", "rejected"]) }))
    .mutation(async ({ input }) => {
      const data: any = { status: input.status };
      if (input.status === "sent") data.sentAt = new Date();
      await updateBudget(input.id, data);
      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const original = await getBudgetWithLines(input.id);
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });
      const budgetNumber = await getNextBudgetNumber();
      const { id: _id, budgetNumber: _bn, createdAt: _ca, updatedAt: _ua, sentAt: _sa, holdedDocumentId: _hd, lines, ...rest } = original as any;
      const newId = await createBudget({ ...rest, budgetNumber, status: "draft", createdBy: ctx.user.id });
      if (lines?.length > 0) {
        await insertBudgetLines(lines.map(({ id: _lid, createdAt: _lca, ...l }: any) => ({ ...l, budgetId: newId })));
      }
      return { id: newId };
    }),
});

// ─── Holded router ────────────────────────────────────────────────────────────
const HOLDED_BASE = "https://api.holded.com/api/invoicing/v1";

async function holdedGet(apiKey: string, path: string) {
  const res = await axios.get(`${HOLDED_BASE}${path}`, { headers: { key: apiKey } });
  return res.data;
}

async function holdedPost(apiKey: string, path: string, body: unknown) {
  const res = await axios.post(`${HOLDED_BASE}${path}`, body, {
    headers: { key: apiKey, "Content-Type": "application/json" },
  });
  return res.data;
}

const holdedRouter = router({
  testConnection: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const contacts = await holdedGet(input.apiKey, "/contacts?page=1&limit=1");
        await upsertIntegrationConfig("holded", { apiKey: input.apiKey, isConnected: true, lastTestedAt: new Date() });
        return { success: true, message: "Conexión con Holded establecida correctamente." };
      } catch {
        return { success: false, message: "No se pudo conectar con Holded. Verifica la API key." };
      }
    }),

  searchContacts: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const config = await getIntegrationConfig("holded");
      if (!config?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Holded no está configurado." });
      try {
        const contacts = await holdedGet(config.apiKey, `/contacts?name=${encodeURIComponent(input.query)}`);
        return Array.isArray(contacts) ? contacts.slice(0, 10) : [];
      } catch {
        return [];
      }
    }),

  sendEstimate: protectedProcedure
    .input(
      z.object({
        budgetId: z.number(),
        contactId: z.string().optional(),
        contactName: z.string(),
        contactEmail: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config = await getIntegrationConfig("holded");
      if (!config?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Holded no está configurado." });

      const budget = await getBudgetWithLines(input.budgetId);
      if (!budget) throw new TRPCError({ code: "NOT_FOUND" });

      const lines = (budget as any).lines ?? [];
      const items = lines
        .filter((l: any) => l.area !== "commission" && l.area !== "management")
        .map((l: any) => ({
          name: l.description,
          desc: l.isFixedPrice ? "Precio fijo" : `${parseFloat(l.estimatedDays ?? "0").toFixed(2)} jornadas`,
          units: l.isFixedPrice ? 1 : parseFloat(l.estimatedDays ?? "0"),
          price: l.isFixedPrice ? parseFloat(l.fixedPrice ?? "0") : parseFloat(l.salePricePerDay ?? "0"),
          tax: 21,
        }));

      const body: any = {
        contactName: input.contactName,
        date: Math.floor(Date.now() / 1000),
        desc: `Presupuesto — ${budget.projectName}`,
        notes: budget.notes ?? "",
        items,
      };
      if (input.contactId) body.contactId = input.contactId;
      if (input.contactEmail) body.contactEmail = input.contactEmail;

      try {
        const result = await holdedPost(config.apiKey, "/documents/estimate", body);
        await updateBudget(input.budgetId, {
          holdedDocumentId: result.id,
          holdedContactId: input.contactId,
          status: "sent",
          sentAt: new Date(),
        });
        return { success: true, holdedDocumentId: result.id };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err?.response?.data?.message ?? "Error al enviar a Holded." });
      }
    }),

  syncFixedCosts: adminProcedure.mutation(async () => {
    const config = await getIntegrationConfig("holded");
    if (!config?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Holded no está configurado." });

    // Get expenses from Holded to estimate fixed costs
    try {
      const expenses = await holdedGet(config.apiKey, "/documents/purchase?limit=50");
      return { success: true, message: "Sincronización completada.", count: Array.isArray(expenses) ? expenses.length : 0 };
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al sincronizar gastos desde Holded." });
    }
  }),

  getConfig: protectedProcedure.query(() => getIntegrationConfig("holded")),
  saveConfig: adminProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(({ input }) => upsertIntegrationConfig("holded", { apiKey: input.apiKey })),
});

// ─── Clockify router ──────────────────────────────────────────────────────────
const CLOCKIFY_BASE = "https://api.clockify.me/api/v1";
const CLOCKIFY_REPORTS = "https://reports.api.clockify.me/v1";

// Department mapping by worker name
const DEPT_MAP: Record<string, "seo" | "design" | "development" | "various"> = {
  enrique: "design",
  rafa: "design",
  yaiza: "seo",
  "jose luis": "development",
  "josé luis": "development",
  ana: "development",
  angel: "development",
  ángel: "development",
  fran: "development",
  francisco: "development",
  sergio: "development",
  antonio: "various",
};

function getDeptFromName(name: string): "seo" | "design" | "development" | "various" {
  const lower = name.toLowerCase();
  for (const [key, dept] of Object.entries(DEPT_MAP)) {
    if (lower.includes(key)) return dept;
  }
  return "various";
}

const clockifyRouter = router({
  testConnection: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const res = await axios.get(`${CLOCKIFY_BASE}/user`, { headers: { "X-Api-Key": input.apiKey } });
        const wsId = res.data.activeWorkspace;
        await upsertIntegrationConfig("clockify", {
          apiKey: input.apiKey,
          workspaceId: wsId,
          isConnected: true,
          lastTestedAt: new Date(),
        });
        return { success: true, message: `Conectado como ${res.data.name}. Workspace: ${wsId}` };
      } catch {
        return { success: false, message: "No se pudo conectar con Clockify. Verifica la API key." };
      }
    }),

  getWorkspaceMembers: protectedProcedure.query(async () => {
    const config = await getIntegrationConfig("clockify");
    if (!config?.apiKey || !config?.workspaceId) return [];
    try {
      const res = await axios.get(`${CLOCKIFY_BASE}/workspaces/${config.workspaceId}/users`, {
        headers: { "X-Api-Key": config.apiKey },
      });
      return res.data.map((u: any) => ({ id: u.id, name: u.name, email: u.email }));
    } catch {
      return [];
    }
  }),

  syncProjects: adminProcedure
    .input(z.object({ projectTypeId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const config = await getIntegrationConfig("clockify");
      if (!config?.apiKey || !config?.workspaceId)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Clockify no está configurado." });

      const wsId = config.workspaceId;
      const headers = { "X-Api-Key": config.apiKey };

      // Get all projects
      const projectsRes = await axios.get(`${CLOCKIFY_BASE}/workspaces/${wsId}/projects?page-size=200`, { headers });
      const projects: any[] = projectsRes.data;

      // Get workspace members to map by department
      const membersRes = await axios.get(`${CLOCKIFY_BASE}/workspaces/${wsId}/users`, { headers });
      const members: any[] = membersRes.data;

      let synced = 0;
      for (const project of projects.slice(0, 50)) {
        try {
          // Get summary report for this project
          const reportRes = await axios.post(
            `${CLOCKIFY_REPORTS}/workspaces/${wsId}/reports/summary`,
            {
              dateRangeStart: "2020-01-01T00:00:00Z",
              dateRangeEnd: new Date().toISOString(),
              summaryFilter: { groups: ["USER"] },
              projects: { ids: [project.id], contains: "CONTAINS" },
            },
            { headers: { "X-Api-Key": config.apiKey, "Content-Type": "application/json" } }
          );

          const groupOne = reportRes.data?.groupOne ?? [];
          let seoH = 0, designH = 0, devH = 0, variousH = 0;

          for (const group of groupOne) {
            const userId = group.id;
            const member = members.find((m: any) => m.id === userId);
            const dept = member ? getDeptFromName(member.name) : "various";
            const hours = (group.duration ?? 0) / 3600;
            if (dept === "seo") seoH += hours;
            else if (dept === "design") designH += hours;
            else if (dept === "development") devH += hours;
            else variousH += hours;
          }

          const totalH = seoH + designH + devH + variousH;
          if (totalH < 0.1) continue;

          // Convert hours to workdays (8h = 1 day)
          const HOURS_PER_DAY = 8;
          const seoDays = seoH / HOURS_PER_DAY;
          const designDays = designH / HOURS_PER_DAY;
          const devDays = devH / HOURS_PER_DAY;
          const variousDays = variousH / HOURS_PER_DAY;
          const totalDays = totalH / HOURS_PER_DAY;

          const efficiency = totalDays > 0
            ? totalDays < 2.5 ? "efficient" : totalDays < 5 ? "correct" : "excess"
            : undefined;

          await upsertProjectHistory({
            clockifyProjectId: project.id,
            projectName: project.name,
            projectTypeId: input.projectTypeId ?? null,
            realSeoDays: String(seoDays.toFixed(2)),
            realDesignDays: String(designDays.toFixed(2)),
            realDevDays: String(devDays.toFixed(2)),
            realVariousDays: String(variousDays.toFixed(2)),
            realTotalDays: String(totalDays.toFixed(2)),
            efficiencyStatus: efficiency as any,
            syncedAt: new Date(),
          } as any);
          synced++;
        } catch {
          // Skip projects that fail
        }
      }

      // Recalc averages if projectTypeId given
      if (input.projectTypeId) {
        await recalcProjectTypeAverages(input.projectTypeId);
      }

      await upsertIntegrationConfig("clockify", { lastSyncedAt: new Date() });
      return { success: true, synced, total: projects.length };
    }),

  getConfig: protectedProcedure.query(() => getIntegrationConfig("clockify")),
  saveConfig: adminProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(({ input }) => upsertIntegrationConfig("clockify", { apiKey: input.apiKey })),
});

// ─── Project history router ───────────────────────────────────────────────────
const historyRouter = router({
  list: protectedProcedure.query(() => getAllProjectHistory()),
  updateType: protectedProcedure
    .input(z.object({ id: z.number(), projectTypeId: z.number() }))
    .mutation(async ({ input }) => {
      await upsertProjectHistory({ id: input.id, projectTypeId: input.projectTypeId } as any);
      await recalcProjectTypeAverages(input.projectTypeId);
      return { success: true };
    }),
});

// ─── LLM router ───────────────────────────────────────────────────────────────
const llmRouter = router({
  recommend: protectedProcedure
    .input(
      z.object({
        projectTypeSlug: z.string(),
        projectName: z.string(),
        currentLines: z.array(z.object({ area: z.string(), description: z.string(), estimatedDays: z.string() })),
      })
    )
    .mutation(async ({ input }) => {
      const history = await getAllProjectHistory();
      const types = await getAllProjectTypes();
      const type = types.find((t) => t.slug === input.projectTypeSlug);

      const historyContext = history
        .slice(0, 20)
        .map((h) => `- ${h.projectName}: SEO ${(h as any).realSeoDays}j, Diseño ${(h as any).realDesignDays}j, Dev ${(h as any).realDevDays}j (${h.efficiencyStatus ?? "sin estado"})`)
        .join("\n");

      const prompt = `Eres un consultor experto en agencias de diseño y desarrollo web. Analiza el siguiente presupuesto y el histórico de proyectos similares para dar recomendaciones concretas.

PROYECTO: ${input.projectName}
TIPOLOGÍA: ${type?.name ?? input.projectTypeSlug}
MEDIAS HISTÓRICAS: SEO ${(type as any)?.avgSeoDays ?? 0}j, Diseño ${(type as any)?.avgDesignDays ?? 0}j, Desarrollo ${(type as any)?.avgDevDays ?? 0}j

LÍNEAS ACTUALES DEL PRESUPUESTO:
${input.currentLines.map((l) => `- ${l.area.toUpperCase()} — ${l.description}: ${l.estimatedDays}j`).join("\n")}

HISTÓRICO DE PROYECTOS SIMILARES:
${historyContext}

Proporciona 3-4 recomendaciones específicas y accionables sobre:
1. Si las horas estimadas son realistas comparadas con el histórico
2. Qué áreas suelen generar exceso de horas en proyectos similares
3. Ajustes concretos que mejorarían la rentabilidad
4. Riesgos específicos a tener en cuenta

Responde en español, de forma concisa y directa. Usa viñetas (•). Máximo 200 palabras.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres un consultor experto en gestión de proyectos para agencias digitales. Responde siempre en español." },
          { role: "user", content: prompt },
        ],
      });

      const content = response?.choices?.[0]?.message?.content ?? "No se pudieron generar recomendaciones en este momento.";
      return { recommendations: content };
    }),
});

// ─── Users router ─────────────────────────────────────────────────────────────
const usersRouter = router({
  list: adminProcedure.query(() => getAllUsers()),
});

// ─── App router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workers: workersRouter,
  projectTypes: projectTypesRouter,
  fixedCosts: fixedCostsRouter,
  commissions: commissionsRouter,
  budgets: budgetsRouter,
  holded: holdedRouter,
  clockify: clockifyRouter,
  history: historyRouter,
  llm: llmRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
