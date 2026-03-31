#!/usr/bin/env python3
"""Seed script for Balinot presupuestos database"""
import os
import subprocess
import sys

# Read DATABASE_URL from environment or .env file
db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    # Try to read from .env
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

if not db_url:
    print("ERROR: DATABASE_URL not found")
    sys.exit(1)

# Parse MySQL URL: mysql://user:pass@host:port/db
import re
match = re.match(r'mysql://([^:]+):([^@]+)@([^:]+):(\d+)/([^?]+)', db_url)
if not match:
    print(f"ERROR: Cannot parse DATABASE_URL: {db_url[:50]}...")
    sys.exit(1)

user, password, host, port, database = match.groups()

try:
    import mysql.connector
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mysql-connector-python", "-q"])
    import mysql.connector

conn = mysql.connector.connect(
    host=host, port=int(port), user=user, password=password, database=database
)
cursor = conn.cursor()

print("Seeding database...")

# Workers
workers = [
    ("Yaiza", "seo", 62.00, 186.00),
    ("Enrique", "design", 130.00, 390.00),
    ("Rafa", "design", 130.00, 390.00),
    ("Jose Luis", "development", 91.00, 273.00),
    ("Ana Navarro", "development", 98.00, 294.00),
    ("Ángel", "development", 91.00, 273.00),
    ("Fran", "development", 91.00, 273.00),
    ("Sergio", "development", 91.00, 273.00),
    ("Antonio", "various", 62.00, 186.00),
    ("MWM (Externo)", "development", 270.00, 405.00),
]
for name, dept, cost, sale in workers:
    cursor.execute("""
        INSERT INTO workers (name, department, costPerHour, salePricePerHour, isActive)
        VALUES (%s, %s, %s, %s, 1)
        ON DUPLICATE KEY UPDATE name=name
    """, (name, dept, cost, sale))
print("✓ Workers seeded")

# Project types
project_types = [
    ("Web corporativa", "web-corporativa", 11.00, 28.00, 45.00, 5.00, 15),
    ("Tienda online", "tienda-online", 14.00, 45.00, 80.00, 8.00, 8),
    ("Landing page", "landing-page", 4.00, 12.00, 10.00, 2.00, 10),
    ("App web", "app-web", 8.00, 35.00, 120.00, 5.00, 4),
    ("Branding", "branding", 2.00, 40.00, 5.00, 3.00, 6),
]
for name, slug, seo, design, dev, various, count in project_types:
    cursor.execute("""
        INSERT INTO project_types (name, slug, avgSeoHours, avgDesignHours, avgDevHours, avgVariousHours, sampleCount)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE name=name
    """, (name, slug, seo, design, dev, various, count))
print("✓ Project types seeded")

# Fixed costs
fixed_costs = [
    ("Puestos de gestión y dirección", 6500.00, 10.00, "management", 1),
    ("Gastos fijos mensuales", 7000.00, 10.00, "infrastructure", 0),
]
for name, amount, pct, cat, holded in fixed_costs:
    cursor.execute("""
        INSERT INTO fixed_costs (name, monthlyAmount, projectAllocationPct, category, holdedSource, isActive)
        VALUES (%s, %s, %s, %s, %s, 1)
        ON DUPLICATE KEY UPDATE name=name
    """, (name, amount, pct, cat, holded))
print("✓ Fixed costs seeded")

# Commissions
commissions = [
    ("Comisión Luis", 10.00, "with_management", 1),
    ("Comisión Balinot", 10.00, "with_management", 0),
]
for name, pct, applies, active in commissions:
    cursor.execute("""
        INSERT INTO commissions (name, percentage, appliesTo, isActive)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE name=name
    """, (name, pct, applies, active))
print("✓ Commissions seeded")

# Integration config
integrations = [
    ("holded", "f977bfa9e6ac57f4072aacece09bee0b", None, 1),
    ("clockify", "ZjZiZTA0YmUtODI2NC00NjUwLWI2N2EtMGU0MmU5ZDEzNmE2", "6482fd5c6d156776d0ed07be", 1),
]
for service, api_key, ws_id, connected in integrations:
    cursor.execute("""
        INSERT INTO integration_config (service, apiKey, workspaceId, isConnected)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE apiKey=%s, workspaceId=%s, isConnected=%s
    """, (service, api_key, ws_id, connected, api_key, ws_id, connected))
print("✓ Integration config seeded")

conn.commit()
cursor.close()
conn.close()
print("✅ Seed complete!")
