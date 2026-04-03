import { Express, Request, Response } from "express";
import { getDb } from "./db";
import { budgets, budgetLines, workers, commissions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateBudgetPdf } from "./pdf";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";


export function registerPdfRoutes(app: Express) {
  app.get("/api/pdf/:id", async (req: Request, res: Response) => {
    try {
      // Auth check — usar el mismo nombre de cookie que el SDK de auth
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      const sessionToken = cookies[COOKIE_NAME];
      if (!sessionToken) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const budgetId = parseInt(req.params.id);
      const version = (req.query.version as string) === "internal" ? "internal" : "client";

      if (isNaN(budgetId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Base de datos no disponible" });
        return;
      }

      // Get budget
      const [budget] = await db.select().from(budgets).where(eq(budgets.id, budgetId)).limit(1);
      if (!budget) {
        res.status(404).json({ error: "Presupuesto no encontrado" });
        return;
      }

      // Get lines with worker info
      const lines = await db
        .select({
          id: budgetLines.id,
          area: budgetLines.area,
          description: budgetLines.description,
          estimatedDays: budgetLines.estimatedDays,
          salePricePerDay: budgetLines.salePricePerDay,
          costPerDay: budgetLines.costPerDay,
          lineSale: budgetLines.lineSale,
          lineCost: budgetLines.lineCost,
          isFixedPrice: budgetLines.isFixedPrice,
          fixedPrice: budgetLines.fixedPrice,
          sortOrder: budgetLines.sortOrder,
        })
        .from(budgetLines)
        .where(eq(budgetLines.budgetId, budgetId))
        .orderBy(budgetLines.sortOrder);

      // Get active commissions
      const activeCommissions = await db
        .select()
        .from(commissions)
        .where(eq(commissions.isActive, true));

      // Calculate commission amounts
      const subtotalSale = lines
        .filter(l => !["management", "commission", "fixed"].includes(l.area))
        .reduce((s, l) => s + parseFloat(String(l.lineSale ?? 0)), 0);
      const mgmtPct = parseFloat(String(budget.managementPct ?? 40)) / 100;
      const withMgmtSale = subtotalSale * (1 + mgmtPct);

      const commissionData = activeCommissions.map(c => {
        const base = c.appliesTo === "with_management" ? withMgmtSale : subtotalSale;
        const amount = base * (parseFloat(String(c.percentage)) / 100);
        return { name: c.name, percentage: c.percentage, amount };
      });

      const pdfBuffer = await generateBudgetPdf(
        {
          budgetNumber: budget.budgetNumber,
          projectName: budget.projectName,
          clientName: budget.clientName,
          clientEmail: budget.clientEmail ?? undefined,
          createdAt: budget.createdAt,
          notes: budget.notes ?? undefined,
          internalNotes: budget.internalNotes ?? undefined,
          totalSale: budget.totalSale ?? 0,
          totalCost: budget.totalCost ?? 0,
          grossMargin: budget.grossMargin ?? 0,
          grossMarginPct: budget.grossMarginPct ?? 0,
          netMargin: budget.netMargin ?? 0,
          netMarginPct: budget.netMarginPct ?? 0,
          fixedCostsAmount: budget.fixedCostsAmount ?? 0,
          managementPct: budget.managementPct ?? "40",
          holdedServiceName: (budget as any).holdedServiceName ?? null,
          holdedServiceDesc: (budget as any).holdedServiceDesc ?? null,
          holdedServicePrice: (budget as any).holdedServicePrice ?? null,
          lines: lines.map(l => ({
            ...l,
            estimatedDays: l.estimatedDays ?? "0",
            salePricePerDay: l.salePricePerDay ?? "0",
            costPerDay: l.costPerDay ?? "0",
            lineSale: l.lineSale ?? "0",
            lineCost: l.lineCost ?? "0",
            fixedPrice: l.fixedPrice ?? "0",
            isFixedPrice: l.isFixedPrice ?? false,
          })),
          commissions: commissionData,
        },
        version
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="presupuesto-${budget.budgetNumber}-${version}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("[PDF] Error:", err);
      res.status(500).json({ error: err.message ?? "Error generando PDF" });
    }
  });
}
