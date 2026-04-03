import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBudget,
  deleteBudget,
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
        department: z.enum(["seo", "design", "development", "management", "various", "external"]),
        costPerDay: z.string(),
        salePricePerDay: z.string(),
        isExternal: z.boolean().optional(),
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
  area: z.enum(["seo", "design", "development", "management", "commission", "various", "fixed", "branding"]),
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
  dashboard: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }).optional())
    .query(({ input }) => getDashboardStats(input?.from, input?.to)),
  nextNumber: protectedProcedure.query(() => getNextBudgetNumber()),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        projectName: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().optional(),
        clientNif: z.string().optional(),
        clientType: z.enum(["company", "person"]).optional(),
        clientAddress: z.string().optional(),
        clientCity: z.string().optional(),
        clientPostalCode: z.string().optional(),
        clientProvince: z.string().optional(),
        clientCountry: z.string().optional(),
        clientPhone: z.string().optional(),
        clientWebsite: z.string().optional(),
        projectTypeId: z.number().nullable().optional(),
        managementPct: z.string().optional(),
        commissionType: z.enum(["none", "luis", "commercial"]).optional(),
        commissionPct: z.string().optional(),
        commissionAmount: z.string().optional(),
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
        taxKey: z.string().optional(),
        taxRate: z.string().optional(),
        holdedServiceId: z.string().optional(),
        holdedServiceName: z.string().optional(),
        holdedServiceDesc: z.string().optional(),
        holdedServicePrice: z.string().optional(),
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBudget(input.id);
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
        // La API de Holded no filtra por nombre — devuelve todos los contactos en una sola página
        const contacts = await holdedGet(config.apiKey, "/contacts");
        if (!Array.isArray(contacts)) return [];

        const q = input.query.toLowerCase().trim();
        const filtered = q.length >= 2
          ? contacts.filter((c: any) =>
              (c.name ?? "").toLowerCase().includes(q) ||
              (c.email ?? "").toLowerCase().includes(q) ||
              (c.vatnumber ?? "").toLowerCase().includes(q) ||
              (c.code ?? "").toLowerCase().includes(q)
            )
          : contacts;

        return filtered.map((c: any) => ({
          id: c.id ?? "",
          name: c.name ?? "",
          tradeName: c.tradeName ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          mobile: c.mobile ?? "",
          vatnumber: c.vatnumber || c.code || "",
          // isperson: 0 = empresa, 1 = persona
          type: c.isperson === 1 ? "person" : "company",
          // Dirección dentro de billAddress
          address: c.billAddress?.address ?? "",
          city: c.billAddress?.city ?? "",
          postalCode: c.billAddress?.postalCode ?? "",
          province: c.billAddress?.province ?? "",
          country: c.billAddress?.country ?? "España",
          // Website dentro de socialNetworks
          website: c.socialNetworks?.website ?? "",
          // Tipo de contacto en Holded: client, supplier, debtor, creditor
          contactType: c.type ?? "",
        }));
      } catch {
        return [];
      }
    }),

  createContact: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      vatnumber: z.string().optional(),
      type: z.enum(["company", "person"]).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      province: z.string().optional(),
      country: z.string().optional(),
      mobile: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const config = await getIntegrationConfig("holded");
      if (!config?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Holded no está configurado." });
      try {
        const body: any = {
          name: input.name,
          type: "client",
          isperson: input.type === "person" ? 1 : 0,
        };
        if (input.email) body.email = input.email;
        if (input.vatnumber) body.vatnumber = input.vatnumber;
        if (input.mobile) body.mobile = input.mobile;
        if (input.phone) body.phone = input.phone;
        // Dirección en billAddress
        if (input.address || input.city || input.postalCode || input.province || input.country) {
          body.billAddress = {
            address: input.address ?? "",
            city: input.city ?? "",
            postalCode: input.postalCode ?? "",
            province: input.province ?? "",
            country: input.country ?? "España",
          };
        }
        // Website en socialNetworks
        if (input.website) body.socialNetworks = { website: input.website };
        const result = await holdedPost(config.apiKey, "/contacts", body);
        return { success: true, id: result.id ?? result.contactId ?? "", name: input.name };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err?.response?.data?.message ?? "Error al crear el contacto en Holded." });
      }
    }),

  listServices: protectedProcedure.query(async () => {
    const config = await getIntegrationConfig("holded");
    if (!config?.apiKey) return [];
    try {
      const data = await holdedGet(config.apiKey, "/services");
      const services: any[] = Array.isArray(data) ? data : [];
      return services.map((s: any) => ({
        id: s.id ?? "",
        name: s.name ?? "",
        desc: s.desc ?? "",
        price: s.price ?? 0,
        cost: s.cost ?? 0,
        taxes: s.taxes ?? [],
        total: s.total ?? 0,
      }));
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

      // Usar el servicio de Holded seleccionado como única línea del estimate
      const serviceName = budget.holdedServiceName ?? budget.projectName;
      const serviceDesc = budget.holdedServiceDesc ?? "";
      const totalSale = parseFloat(String(budget.totalSale ?? 0));
      const serviceId = budget.holdedServiceId;

      const taxRate = parseFloat(String(budget.taxRate ?? 21));
      const taxKey = budget.taxKey ?? "s_iva_21";

      const item: any = {
        name: serviceName,
        desc: serviceDesc,
        units: 1,
        subtotal: totalSale,
        tax: taxRate,
        taxes: [taxKey],
      };
      if (serviceId) item.serviceId = serviceId;

      const items = [item];

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
    try {
      const expenses = await holdedGet(config.apiKey, "/documents/purchase?limit=50");
      return { success: true, message: "Sincronización completada.", count: Array.isArray(expenses) ? expenses.length : 0 };
    } catch (err: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al sincronizar gastos desde Holded." });
    }
  }),

  // Panel de datos: gastos por concepto con suma total
  getExpenses: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const config = await getIntegrationConfig("holded");
      if (!config?.apiKey) return { expenses: [], total: 0, byCategory: [] };
      try {
        const data = await holdedGet(config.apiKey, "/documents/purchase?limit=100");
        const docs: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        const from = input.dateFrom ? new Date(input.dateFrom).getTime() / 1000 : 0;
        const to = input.dateTo ? new Date(input.dateTo).getTime() / 1000 : Infinity;
        const filtered = docs.filter((d: any) => {
          const ts = d.date ?? d.createdAt ?? 0;
          return ts >= from && ts <= to;
        });
        const expenses = filtered.map((d: any) => ({
          id: d.id ?? d._id ?? "",
          date: d.date ? new Date(d.date * 1000).toISOString().split("T")[0] : null,
          concept: d.desc ?? d.name ?? d.notes ?? "Sin concepto",
          contactName: d.contactName ?? d.contact?.name ?? "",
          total: parseFloat(d.total ?? d.amount ?? 0),
          subtotal: parseFloat(d.subtotal ?? d.total ?? 0),
          docNumber: d.docNumber ?? d.num ?? "",
          status: d.status ?? "",
        }));
        // Group by category using keyword detection
        const MGMT_NAMES = ["fran", "matías", "matias", "antonio", "hidaya"];
        const categoryMap: Record<string, number> = {};
        for (const e of expenses) {
          const conceptLower = (e.concept + " " + e.contactName).toLowerCase();
          let cat = "Otros gastos";
          if (MGMT_NAMES.some(n => conceptLower.includes(n))) cat = "Nóminas gestión";
          else if (conceptLower.includes("nómina") || conceptLower.includes("nomina") || conceptLower.includes("salario")) cat = "Nóminas equipo";
          else if (conceptLower.includes("alquiler") || conceptLower.includes("oficina")) cat = "Alquiler / Oficina";
          else if (conceptLower.includes("software") || conceptLower.includes("licencia") || conceptLower.includes("suscripción") || conceptLower.includes("suscripcion")) cat = "Software y licencias";
          else if (conceptLower.includes("seguro")) cat = "Seguros";
          else if (conceptLower.includes("asesoría") || conceptLower.includes("asesoria") || conceptLower.includes("gestoría") || conceptLower.includes("gestoria")) cat = "Asesoría";
          else if (conceptLower.includes("marketing") || conceptLower.includes("publicidad")) cat = "Marketing";
          categoryMap[cat] = (categoryMap[cat] ?? 0) + e.total;
        }
        const byCategory = Object.entries(categoryMap)
          .map(([name, total]) => ({ name, total: parseFloat(total.toFixed(2)) }))
          .sort((a, b) => b.total - a.total);
        const total = expenses.reduce((s, e) => s + e.total, 0);
        return { expenses, total: parseFloat(total.toFixed(2)), byCategory };
      } catch {
        return { expenses: [], total: 0, byCategory: [] };
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

  // Panel de datos: horas por proyecto y trabajador, medias por trabajador
  getProjectHours: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const config = await getIntegrationConfig("clockify");
      if (!config?.apiKey) return { projects: [], workers: [], limitedToOneYear: false };

      // Resolve workspaceId: from config or fetch from API
      let wsId = config.workspaceId;
      if (!wsId) {
        try {
          const userRes = await axios.get(`${CLOCKIFY_BASE}/user`, { headers: { "X-Api-Key": config.apiKey } });
          wsId = userRes.data.activeWorkspace;
          await upsertIntegrationConfig("clockify", { workspaceId: wsId });
        } catch {
          return { projects: [], workers: [], limitedToOneYear: false };
        }
      }

      const headers = { "X-Api-Key": config.apiKey };
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000);

      // Enforce max 364-day range (plan limitation)
      let dateFrom = input.dateFrom ? new Date(input.dateFrom) : oneYearAgo;
      let dateTo = input.dateTo ? new Date(input.dateTo) : now;
      const diffDays = (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24);
      const limitedToOneYear = diffDays > 364;
      if (limitedToOneYear) dateFrom = new Date(dateTo.getTime() - 364 * 24 * 60 * 60 * 1000);

      const dateFromStr = dateFrom.toISOString().replace(/\.\d{3}Z$/, ".000Z");
      const dateToStr = dateTo.toISOString().replace(/\.\d{3}Z$/, ".999Z");
      try {
        const membersRes = await axios.get(`${CLOCKIFY_BASE}/workspaces/${wsId}/users`, { headers });
        const members: any[] = membersRes.data;
        const projectsRes = await axios.get(`${CLOCKIFY_BASE}/workspaces/${wsId}/projects?page-size=200`, { headers });
        const allProjects: any[] = projectsRes.data;
        const reportRes = await axios.post(
          `${CLOCKIFY_REPORTS}/workspaces/${wsId}/reports/summary`,
          {
            dateRangeStart: dateFromStr,
            dateRangeEnd: dateToStr,
            summaryFilter: { groups: ["PROJECT", "USER"] },
            amountShown: "HIDE_AMOUNT",
          },
          { headers: { "X-Api-Key": config.apiKey, "Content-Type": "application/json" } }
        );
        const groupOne: any[] = reportRes.data?.groupOne ?? [];
        const projectRows = groupOne.map((proj: any) => {
          const meta = allProjects.find((p: any) => p.id === proj.id);
          const workers: { name: string; dept: string; hours: number; days: number }[] = [];
          let seoH = 0, designH = 0, devH = 0, variousH = 0;
          for (const userGroup of (proj.children ?? [])) {
            const member = members.find((m: any) => m.id === userGroup.id);
            const name = member?.name ?? userGroup.name ?? "Desconocido";
            const dept = getDeptFromName(name);
            const hours = parseFloat(((userGroup.duration ?? 0) / 3600).toFixed(2));
            const days = parseFloat((hours / 8).toFixed(2));
            workers.push({ name, dept, hours, days });
            if (dept === "seo") seoH += hours;
            else if (dept === "design") designH += hours;
            else if (dept === "development") devH += hours;
            else variousH += hours;
          }
          const totalH = parseFloat(((proj.duration ?? 0) / 3600).toFixed(2));
          return {
            projectId: proj.id,
            projectName: meta?.name ?? proj.name ?? proj.id,
            totalHours: totalH,
            totalDays: parseFloat((totalH / 8).toFixed(2)),
            seoHours: parseFloat(seoH.toFixed(2)), seoDays: parseFloat((seoH / 8).toFixed(2)),
            designHours: parseFloat(designH.toFixed(2)), designDays: parseFloat((designH / 8).toFixed(2)),
            devHours: parseFloat(devH.toFixed(2)), devDays: parseFloat((devH / 8).toFixed(2)),
            variousHours: parseFloat(variousH.toFixed(2)), variousDays: parseFloat((variousH / 8).toFixed(2)),
            workers,
          };
        }).sort((a: any, b: any) => b.totalHours - a.totalHours);
        // Build worker averages
        const workerMap: Record<string, { name: string; dept: string; totalHours: number; count: number }> = {};
        for (const proj of projectRows) {
          for (const w of proj.workers) {
            if (!workerMap[w.name]) workerMap[w.name] = { name: w.name, dept: w.dept, totalHours: 0, count: 0 };
            workerMap[w.name].totalHours += w.hours;
            workerMap[w.name].count += 1;
          }
        }
        const workerAverages = Object.values(workerMap).map(w => ({
          name: w.name, dept: w.dept,
          totalHours: parseFloat(w.totalHours.toFixed(2)),
          totalDays: parseFloat((w.totalHours / 8).toFixed(2)),
          avgHoursPerProject: parseFloat((w.totalHours / (w.count || 1)).toFixed(2)),
          avgDaysPerProject: parseFloat((w.totalHours / 8 / (w.count || 1)).toFixed(2)),
          projectCount: w.count,
        })).sort((a, b) => b.totalHours - a.totalHours);
        return { projects: projectRows, workers: workerAverages, limitedToOneYear };
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? String(err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error Clockify: ${msg}` });
      }
    }),
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
