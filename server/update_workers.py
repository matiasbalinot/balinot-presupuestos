"""
Actualiza los trabajadores en la BD con las tarifas correctas confirmadas por el usuario.
"""
import os, re
import mysql.connector

raw_url = os.environ.get("DATABASE_URL", "")
# Parse mysql://user:pass@host:port/db?params
m = re.match(r"mysql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)", raw_url)
if not m:
    raise ValueError(f"No se pudo parsear DATABASE_URL: {raw_url}")
user, password, host, port, database = m.groups()

conn = mysql.connector.connect(
    host=host, port=int(port), user=user, password=password,
    database=database, ssl_disabled=False
)
cur = conn.cursor()

# Datos definitivos del equipo
workers = [
    # (name, department, costPerDay, salePricePerDay, isExternal)
    ("Antonio",      "various",     91,  273, False),
    ("Yaiza",        "seo",         62,  186, False),
    ("Rafa",         "design",     240,  480, False),
    ("Enrique",      "design",     130,  390, False),
    ("Ángel",        "development", 91,  273, False),
    ("Jose Luis",    "development", 91,  273, False),
    ("Sergio",       "development", 91,  273, False),
    ("Fran",         "development",240,  480, False),
    ("Ana Navarro",  "development", 98,  294, False),
    ("MWM",          "external",   270,  405, True),
    ("Alfonso Cala", "external",   180,  350, True),
]

# Primero, ver qué hay en la BD
cur.execute("SELECT id, name, department, costPerDay, salePricePerDay FROM workers")
existing = {row[1]: row for row in cur.fetchall()}
print("Trabajadores actuales en BD:")
for name, row in existing.items():
    print(f"  {row}")

print("\nAplicando cambios...")
for name, dept, cost, sale, is_ext in workers:
    if name in existing:
        cur.execute(
            "UPDATE workers SET department=%s, costPerDay=%s, salePricePerDay=%s, isExternal=%s WHERE name=%s",
            (dept, cost, sale, is_ext, name)
        )
        print(f"  UPDATED: {name} → {dept}, {cost}€/j, {sale}€/j")
    else:
        cur.execute(
            "INSERT INTO workers (name, department, costPerDay, salePricePerDay, isExternal, isActive) VALUES (%s,%s,%s,%s,%s,1)",
            (name, dept, cost, sale, is_ext)
        )
        print(f"  INSERTED: {name} → {dept}, {cost}€/j, {sale}€/j")

# Eliminar trabajadores que ya no están en la lista (excepto los que no están en la lista)
valid_names = [w[0] for w in workers]
for name in list(existing.keys()):
    if name not in valid_names:
        print(f"  DEACTIVATING (not in list): {name}")
        cur.execute("UPDATE workers SET isActive=0 WHERE name=%s", (name,))

conn.commit()
print("\nVerificación final:")
cur.execute("SELECT name, department, costPerDay, salePricePerDay, isExternal, isActive FROM workers ORDER BY department, name")
for row in cur.fetchall():
    status = "ACTIVO" if row[5] else "INACTIVO"
    ext = " [EXTERNO]" if row[4] else ""
    print(f"  {row[0]}{ext} | {row[1]} | {row[2]}€/j coste | {row[3]}€/j venta | {status}")

cur.close()
conn.close()
print("\nDone.")
