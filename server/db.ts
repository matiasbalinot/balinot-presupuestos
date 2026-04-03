import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  BudgetLine,
  InsertBudget,
  InsertBudgetLine,
  InsertCommission,
  InsertFixedCost,
  InsertProjectHistory,
  InsertProjectHistoryWorker,
  InsertProjectType,
  InsertUser,
  InsertWorker,
  budgetLines,
  budgets,
  commissions,
  fixedCosts,
  integrationConfig,
  projectHistory,
  projectHistoryWorkers,
  projectTypes,
  users,
  workers,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── Workers ──────────────────────────────────────────────────────────────────
export async function getAllWorkers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workers).orderBy(workers.department, workers.name);
}

export async function getActiveWorkers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workers).where(eq(workers.isActive, true)).orderBy(workers.department, workers.name);
}

export async function upsertWorker(data: InsertWorker & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(workers).set(rest).where(eq(workers.id, id));
    return id;
  }
  const result = await db.insert(workers).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function deleteWorker(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(workers).set({ isActive: false }).where(eq(workers.id, id));
}

// ─── Project Types ────────────────────────────────────────────────────────────
export async function getAllProjectTypes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectTypes).orderBy(projectTypes.name);
}

export async function upsertProjectType(data: InsertProjectType & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(projectTypes).set(rest).where(eq(projectTypes.id, id));
    return id;
  }
  const result = await db.insert(projectTypes).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

// ─── Fixed Costs ──────────────────────────────────────────────────────────────
export async function getAllFixedCosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fixedCosts).where(eq(fixedCosts.isActive, true)).orderBy(fixedCosts.category, fixedCosts.name);
}

export async function upsertFixedCost(data: InsertFixedCost & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(fixedCosts).set(rest).where(eq(fixedCosts.id, id));
    return id;
  }
  const result = await db.insert(fixedCosts).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

// ─── Commissions ─────────────────────────────────────────────────────────────
export async function getAllCommissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissions).where(eq(commissions.isActive, true)).orderBy(commissions.name);
}

export async function upsertCommission(data: InsertCommission & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(commissions).set(rest).where(eq(commissions.id, id));
    return id;
  }
  const result = await db.insert(commissions).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
export async function getAllBudgets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgets).orderBy(desc(budgets.createdAt));
}

export async function getBudgetById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getBudgetWithLines(id: number) {
  const db = await getDb();
  if (!db) return null;
  const budget = await getBudgetById(id);
  if (!budget) return null;
  const lines = await db.select().from(budgetLines).where(eq(budgetLines.budgetId, id)).orderBy(budgetLines.sortOrder, budgetLines.id);
  return { ...budget, lines };
}

export async function createBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(budgets).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function updateBudget(id: number, data: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(budgets).set(data).where(eq(budgets.id, id));
}

export async function deleteBudgetLines(budgetId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(budgetLines).where(eq(budgetLines.budgetId, budgetId));
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(budgetLines).where(eq(budgetLines.budgetId, id));
  await db.delete(budgets).where(eq(budgets.id, id));
}

export async function insertBudgetLines(lines: InsertBudgetLine[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (lines.length === 0) return;
  await db.insert(budgetLines).values(lines);
}

export async function getNextBudgetNumber(): Promise<string> {
  const db = await getDb();
  if (!db) return `PRES-${new Date().getFullYear()}-001`;
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(budgets)
    .where(sql`YEAR(createdAt) = ${year}`);
  const count = Number(result[0]?.count ?? 0) + 1;
  return `PRES-${year}-${String(count).padStart(3, "0")}`;
}

export async function getDashboardStats(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return null;

  // Default range: current month (UTC-based to avoid mysql2 timezone issues)
  const now = new Date();
  const rangeFrom = from ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const rangeTo = to ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  // Use UNIX_TIMESTAMP() to avoid mysql2 timezone serialization issues.
  // mysql2 serializes JS Date objects using the server's local timezone (UTC-4),
  // which shifts the range by 4 hours in MySQL. Comparing unix timestamps avoids this.
  const fromTs = Math.floor(rangeFrom.getTime() / 1000);
  const toTs = Math.floor(rangeTo.getTime() / 1000);

  const [totalInRange, statusCounts, recentBudgets] = await Promise.all([
    db
      .select({ total: sql<number>`COALESCE(SUM(totalSale), 0)`, count: sql<number>`COUNT(*)` })
      .from(budgets)
      .where(sql`UNIX_TIMESTAMP(createdAt) >= ${fromTs} AND UNIX_TIMESTAMP(createdAt) <= ${toTs}`),
    db
      .select({ status: budgets.status, count: sql<number>`COUNT(*)`, avgMargin: sql<number>`AVG(netMarginPct)` })
      .from(budgets)
      .where(sql`UNIX_TIMESTAMP(createdAt) >= ${fromTs} AND UNIX_TIMESTAMP(createdAt) <= ${toTs}`)
      .groupBy(budgets.status),
    db
      .select()
      .from(budgets)
      .where(sql`UNIX_TIMESTAMP(createdAt) >= ${fromTs} AND UNIX_TIMESTAMP(createdAt) <= ${toTs}`)
      .orderBy(desc(budgets.createdAt))
      .limit(50),
  ]);

  return { totalInRange: totalInRange[0], statusCounts, recentBudgets };
}

// ─── Project History ──────────────────────────────────────────────────────────
export async function getAllProjectHistory() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectHistory).orderBy(desc(projectHistory.syncedAt));
}

export async function upsertProjectHistory(data: InsertProjectHistory & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(projectHistory).set(rest).where(eq(projectHistory.id, id));
    return id;
  }
  if (data.clockifyProjectId) {
    const existing = await db
      .select()
      .from(projectHistory)
      .where(eq(projectHistory.clockifyProjectId, data.clockifyProjectId))
      .limit(1);
    if (existing[0]) {
      await db.update(projectHistory).set(data).where(eq(projectHistory.clockifyProjectId, data.clockifyProjectId));
      return existing[0].id;
    }
  }
  const result = await db.insert(projectHistory).values(data);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function recalcProjectTypeAverages(projectTypeId: number) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select()
    .from(projectHistory)
    .where(and(eq(projectHistory.projectTypeId, projectTypeId), sql`realTotalHours > 0`));

  if (rows.length === 0) return;

  const avg = (field: keyof typeof rows[0]) =>
    rows.reduce((sum, r) => sum + Number(r[field] ?? 0), 0) / rows.length;

  await db
    .update(projectTypes)
    .set({
      avgSeoDays: String(avg("realSeoDays").toFixed(2)),
      avgDesignDays: String(avg("realDesignDays").toFixed(2)),
      avgDevDays: String(avg("realDevDays").toFixed(2)),
      avgVariousDays: String(avg("realVariousDays").toFixed(2)),
      sampleCount: rows.length,
      lastSyncedAt: new Date(),
    })
    .where(eq(projectTypes.id, projectTypeId));
}

//// ─── Project History Workers ──────────────────────────────────────────────────

export async function getProjectHistoryWorkers(projectHistoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectHistoryWorkers)
    .where(eq(projectHistoryWorkers.projectHistoryId, projectHistoryId))
    .orderBy(projectHistoryWorkers.department, projectHistoryWorkers.workerName);
}

/** Upsert de jornadas de un trabajador en un proyecto histórico.
 *  Si ya existe (mismo projectHistoryId + workerName), actualiza; si no, inserta.
 *  totalDays se calcula automáticamente: (hoursFromClockify + hoursAdjustment) / 7
 */
export async function upsertProjectHistoryWorker(
  data: InsertProjectHistoryWorker & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const HOURS_PER_DAY = 7;
  const hoursFrom = Number(data.hoursFromClockify ?? 0);
  const hoursAdj = Number(data.hoursAdjustment ?? 0);
  const totalDays = (hoursFrom + hoursAdj) / HOURS_PER_DAY;
  const payload = { ...data, totalDays: String(totalDays.toFixed(2)) };

  if (data.id) {
    const { id, ...rest } = payload;
    await db.update(projectHistoryWorkers).set(rest).where(eq(projectHistoryWorkers.id, data.id));
    return data.id;
  }

  // Check for existing row by projectHistoryId + workerName
  const existing = await db
    .select()
    .from(projectHistoryWorkers)
    .where(
      and(
        eq(projectHistoryWorkers.projectHistoryId, data.projectHistoryId),
        eq(projectHistoryWorkers.workerName, data.workerName)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(projectHistoryWorkers)
      .set(payload)
      .where(eq(projectHistoryWorkers.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db.insert(projectHistoryWorkers).values(payload as any);
  return Number((result as any)[0]?.insertId ?? 0);
}

export async function clearProjectHistoryWorkers(projectHistoryId: number) {
  const db = await getDb();
  if (!db) return;
  // Solo borra los workers que vinieron de Clockify (isManual = false) para preservar ajustes manuales
  await db.delete(projectHistoryWorkers)
    .where(and(eq(projectHistoryWorkers.projectHistoryId, projectHistoryId), eq(projectHistoryWorkers.isManual, false)));
}
export async function deleteProjectHistoryWorker(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(projectHistoryWorkers).where(eq(projectHistoryWorkers.id, id));
}

/** Recalcula las jornadas agregadas del proyecto histórico a partir de sus workers */
export async function recalcProjectHistoryTotals(projectHistoryId: number) {
  const db = await getDb();
  if (!db) return;
  const wRows = await db
    .select()
    .from(projectHistoryWorkers)
    .where(eq(projectHistoryWorkers.projectHistoryId, projectHistoryId));

  let seoDays = 0, designDays = 0, devDays = 0, variousDays = 0;
  for (const w of wRows) {
    const days = Number(w.totalDays ?? 0);
    if (w.department === "seo") seoDays += days;
    else if (w.department === "design") designDays += days;
    else if (w.department === "development") devDays += days;
    else variousDays += days;
  }
  const totalDays = seoDays + designDays + devDays + variousDays;
  const efficiency: "efficient" | "correct" | "excess" =
    totalDays < 2.5 ? "efficient" : totalDays < 5 ? "correct" : "excess";

  await db
    .update(projectHistory)
    .set({
      realSeoDays: String(seoDays.toFixed(2)),
      realDesignDays: String(designDays.toFixed(2)),
      realDevDays: String(devDays.toFixed(2)),
      realVariousDays: String(variousDays.toFixed(2)),
      realTotalDays: String(totalDays.toFixed(2)),
      efficiencyStatus: efficiency,
    })
    .where(eq(projectHistory.id, projectHistoryId));
}

// ─── Integration Config ──────────────────────────────────────────────────
export async function getIntegrationConfig(service: "holded" | "clockify") {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(integrationConfig).where(eq(integrationConfig.service, service)).limit(1);
  return result[0] ?? null;
}

export async function upsertIntegrationConfig(service: "holded" | "clockify", data: Partial<typeof integrationConfig.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getIntegrationConfig(service);
  if (existing) {
    await db.update(integrationConfig).set(data).where(eq(integrationConfig.service, service));
  } else {
    await db.insert(integrationConfig).values({ service, ...data } as any);
  }
}
