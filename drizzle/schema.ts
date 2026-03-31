import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Workers ──────────────────────────────────────────────────────────────────
export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  department: mysqlEnum("department", ["seo", "design", "development", "management", "various"]).notNull(),
  costPerHour: decimal("costPerHour", { precision: 10, scale: 2 }).notNull(),
  salePricePerHour: decimal("salePricePerHour", { precision: 10, scale: 2 }).notNull(),
  clockifyUserId: varchar("clockifyUserId", { length: 100 }),
  clockifyUserEmail: varchar("clockifyUserEmail", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

// ─── Project Types ────────────────────────────────────────────────────────────
export const projectTypes = mysqlTable("project_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  avgSeoHours: decimal("avgSeoHours", { precision: 6, scale: 2 }).default("0"),
  avgDesignHours: decimal("avgDesignHours", { precision: 6, scale: 2 }).default("0"),
  avgDevHours: decimal("avgDevHours", { precision: 6, scale: 2 }).default("0"),
  avgVariousHours: decimal("avgVariousHours", { precision: 6, scale: 2 }).default("0"),
  sampleCount: int("sampleCount").default(0),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectType = typeof projectTypes.$inferSelect;
export type InsertProjectType = typeof projectTypes.$inferInsert;

// ─── Fixed Costs ──────────────────────────────────────────────────────────────
export const fixedCosts = mysqlTable("fixed_costs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  monthlyAmount: decimal("monthlyAmount", { precision: 10, scale: 2 }).notNull(),
  projectAllocationPct: decimal("projectAllocationPct", { precision: 5, scale: 2 }).notNull(),
  category: mysqlEnum("category", ["management", "infrastructure", "licenses", "other"]).notNull(),
  holdedSource: boolean("holdedSource").default(false),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FixedCost = typeof fixedCosts.$inferSelect;
export type InsertFixedCost = typeof fixedCosts.$inferInsert;

// ─── Commissions ─────────────────────────────────────────────────────────────
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  appliesTo: mysqlEnum("appliesTo", ["subtotal", "with_management"]).default("with_management").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;

// ─── Budgets ──────────────────────────────────────────────────────────────────
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  budgetNumber: varchar("budgetNumber", { length: 30 }).notNull().unique(),
  projectName: varchar("projectName", { length: 200 }).notNull(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  projectTypeId: int("projectTypeId"),
  managementPct: decimal("managementPct", { precision: 5, scale: 2 }).default("40"),
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected"]).default("draft").notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0"),
  totalSale: decimal("totalSale", { precision: 10, scale: 2 }).default("0"),
  grossMargin: decimal("grossMargin", { precision: 10, scale: 2 }).default("0"),
  grossMarginPct: decimal("grossMarginPct", { precision: 5, scale: 2 }).default("0"),
  fixedCostsAmount: decimal("fixedCostsAmount", { precision: 10, scale: 2 }).default("0"),
  netMargin: decimal("netMargin", { precision: 10, scale: 2 }).default("0"),
  netMarginPct: decimal("netMarginPct", { precision: 5, scale: 2 }).default("0"),
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  holdedContactId: varchar("holdedContactId", { length: 100 }),
  holdedDocumentId: varchar("holdedDocumentId", { length: 100 }),
  createdBy: int("createdBy"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── Budget Lines ─────────────────────────────────────────────────────────────
export const budgetLines = mysqlTable("budget_lines", {
  id: int("id").autoincrement().primaryKey(),
  budgetId: int("budgetId").notNull(),
  workerId: int("workerId"),
  area: mysqlEnum("area", ["seo", "design", "development", "management", "commission", "various", "fixed"]).notNull(),
  description: varchar("description", { length: 300 }).notNull(),
  estimatedHours: decimal("estimatedHours", { precision: 6, scale: 2 }).default("0"),
  costPerHour: decimal("costPerHour", { precision: 10, scale: 2 }).default("0"),
  salePricePerHour: decimal("salePricePerHour", { precision: 10, scale: 2 }).default("0"),
  lineCost: decimal("lineCost", { precision: 10, scale: 2 }).default("0"),
  lineSale: decimal("lineSale", { precision: 10, scale: 2 }).default("0"),
  isFixedPrice: boolean("isFixedPrice").default(false),
  fixedPrice: decimal("fixedPrice", { precision: 10, scale: 2 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = typeof budgetLines.$inferInsert;

// ─── Project History ──────────────────────────────────────────────────────────
export const projectHistory = mysqlTable("project_history", {
  id: int("id").autoincrement().primaryKey(),
  clockifyProjectId: varchar("clockifyProjectId", { length: 100 }),
  projectName: varchar("projectName", { length: 200 }).notNull(),
  projectTypeId: int("projectTypeId"),
  realSeoHours: decimal("realSeoHours", { precision: 6, scale: 2 }).default("0"),
  realDesignHours: decimal("realDesignHours", { precision: 6, scale: 2 }).default("0"),
  realDevHours: decimal("realDevHours", { precision: 6, scale: 2 }).default("0"),
  realVariousHours: decimal("realVariousHours", { precision: 6, scale: 2 }).default("0"),
  realTotalHours: decimal("realTotalHours", { precision: 6, scale: 2 }).default("0"),
  estimatedTotalHours: decimal("estimatedTotalHours", { precision: 6, scale: 2 }).default("0"),
  efficiencyStatus: mysqlEnum("efficiencyStatus", ["efficient", "correct", "excess"]),
  benefitPct: decimal("benefitPct", { precision: 5, scale: 2 }),
  syncedAt: timestamp("syncedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectHistory = typeof projectHistory.$inferSelect;
export type InsertProjectHistory = typeof projectHistory.$inferInsert;

// ─── Integration Config ───────────────────────────────────────────────────────
export const integrationConfig = mysqlTable("integration_config", {
  id: int("id").autoincrement().primaryKey(),
  service: mysqlEnum("service", ["holded", "clockify"]).notNull().unique(),
  apiKey: varchar("apiKey", { length: 200 }),
  workspaceId: varchar("workspaceId", { length: 100 }),
  isConnected: boolean("isConnected").default(false),
  lastTestedAt: timestamp("lastTestedAt"),
  lastSyncedAt: timestamp("lastSyncedAt"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntegrationConfig = typeof integrationConfig.$inferSelect;
