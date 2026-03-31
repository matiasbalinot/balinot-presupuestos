import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Import tables
const { workers, projectTypes, fixedCosts, commissions, integrationConfig } = await import("../drizzle/schema.js");

console.log("Seeding database...");

// Workers
await db.insert(workers).values([
  { name: "Yaiza", department: "seo", costPerHour: "62.00", salePricePerHour: "186.00", isActive: true },
  { name: "Enrique", department: "design", costPerHour: "130.00", salePricePerHour: "390.00", isActive: true },
  { name: "Rafa", department: "design", costPerHour: "130.00", salePricePerHour: "390.00", isActive: true },
  { name: "Jose Luis", department: "development", costPerHour: "91.00", salePricePerHour: "273.00", isActive: true },
  { name: "Ana Navarro", department: "development", costPerHour: "98.00", salePricePerHour: "294.00", isActive: true },
  { name: "Ángel", department: "development", costPerHour: "91.00", salePricePerHour: "273.00", isActive: true },
  { name: "Fran", department: "development", costPerHour: "91.00", salePricePerHour: "273.00", isActive: true },
  { name: "Sergio", department: "development", costPerHour: "91.00", salePricePerHour: "273.00", isActive: true },
  { name: "Antonio", department: "various", costPerHour: "62.00", salePricePerHour: "186.00", isActive: true },
  { name: "MWM (Externo)", department: "development", costPerHour: "270.00", salePricePerHour: "405.00", isActive: true },
]).onDuplicateKeyUpdate({ set: { name: workers.name } }).catch(() => {});

console.log("✓ Workers seeded");

// Project types
await db.insert(projectTypes).values([
  { name: "Web corporativa", slug: "web-corporativa", avgSeoHours: "11.00", avgDesignHours: "28.00", avgDevHours: "45.00", avgVariousHours: "5.00", sampleCount: 15 },
  { name: "Tienda online", slug: "tienda-online", avgSeoHours: "14.00", avgDesignHours: "45.00", avgDevHours: "80.00", avgVariousHours: "8.00", sampleCount: 8 },
  { name: "Landing page", slug: "landing-page", avgSeoHours: "4.00", avgDesignHours: "12.00", avgDevHours: "10.00", avgVariousHours: "2.00", sampleCount: 10 },
  { name: "App web", slug: "app-web", avgSeoHours: "8.00", avgDesignHours: "35.00", avgDevHours: "120.00", avgVariousHours: "5.00", sampleCount: 4 },
  { name: "Branding", slug: "branding", avgSeoHours: "2.00", avgDesignHours: "40.00", avgDevHours: "5.00", avgVariousHours: "3.00", sampleCount: 6 },
]).onDuplicateKeyUpdate({ set: { name: projectTypes.name } }).catch(() => {});

console.log("✓ Project types seeded");

// Fixed costs
await db.insert(fixedCosts).values([
  { name: "Puestos de gestión y dirección", monthlyAmount: "6500.00", projectAllocationPct: "10.00", category: "management", holdedSource: true, isActive: true },
  { name: "Gastos fijos mensuales", monthlyAmount: "7000.00", projectAllocationPct: "10.00", category: "infrastructure", holdedSource: false, isActive: true },
]).onDuplicateKeyUpdate({ set: { name: fixedCosts.name } }).catch(() => {});

console.log("✓ Fixed costs seeded");

// Commissions
await db.insert(commissions).values([
  { name: "Comisión Luis", percentage: "10.00", appliesTo: "with_management", isActive: true },
  { name: "Comisión Balinot", percentage: "10.00", appliesTo: "with_management", isActive: false },
]).onDuplicateKeyUpdate({ set: { name: commissions.name } }).catch(() => {});

console.log("✓ Commissions seeded");

// Integration config
await db.insert(integrationConfig).values([
  { service: "holded", apiKey: "f977bfa9e6ac57f4072aacece09bee0b", isConnected: true },
  { service: "clockify", apiKey: "ZjZiZTA0YmUtODI2NC00NjUwLWI2N2EtMGU0MmU5ZDEzNmE2", workspaceId: "6482fd5c6d156776d0ed07be", isConnected: true },
]).onDuplicateKeyUpdate({ set: { service: integrationConfig.service } }).catch(() => {});

console.log("✓ Integration config seeded");

console.log("✅ Seed complete!");
await connection.end();
