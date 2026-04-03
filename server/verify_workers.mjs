import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verify current state
console.log('\n=== CURRENT WORKERS IN DB ===');
const [rows] = await conn.execute(
  'SELECT id, name, department, isExternal, costPerHour, salePricePerHour, isActive FROM workers ORDER BY department, name'
);
console.log(`${'Name'.padEnd(20)} ${'Dept'.padEnd(15)} ${'Ext'.padEnd(5)} ${'Cost/j'.padEnd(10)} ${'Sale/j'.padEnd(10)} Active`);
console.log('-'.repeat(70));
for (const r of rows) {
  console.log(`${r.name.padEnd(20)} ${r.department.padEnd(15)} ${String(r.isExternal).padEnd(5)} ${String(r.costPerHour).padEnd(10)} ${String(r.salePricePerHour).padEnd(10)} ${r.isActive}`);
}

// Expected values
const expected = [
  { name: 'Antonio',     department: 'various',     isExternal: 0, cost: 91,  sale: 273 },
  { name: 'Yaiza',       department: 'seo',         isExternal: 0, cost: 62,  sale: 186 },
  { name: 'Rafa',        department: 'design',      isExternal: 0, cost: 240, sale: 480 },
  { name: 'Enrique',     department: 'design',      isExternal: 0, cost: 130, sale: 390 },
  { name: 'Ángel',       department: 'development', isExternal: 0, cost: 91,  sale: 273 },
  { name: 'Jose Luis',   department: 'development', isExternal: 0, cost: 91,  sale: 273 },
  { name: 'Sergio',      department: 'development', isExternal: 0, cost: 91,  sale: 273 },
  { name: 'Fran',        department: 'development', isExternal: 0, cost: 240, sale: 480 },
  { name: 'Ana Navarro', department: 'development', isExternal: 0, cost: 98,  sale: 294 },
  { name: 'MWM',         department: 'external',    isExternal: 1, cost: 270, sale: 405 },
  { name: 'Alfonso Cala',department: 'external',    isExternal: 1, cost: 180, sale: 350 },
];

console.log('\n=== APPLYING CORRECTIONS ===');
for (const w of expected) {
  const existing = rows.find(r => r.name === w.name);
  if (existing) {
    await conn.execute(
      'UPDATE workers SET department=?, isExternal=?, costPerHour=?, salePricePerHour=?, isActive=1 WHERE name=?',
      [w.department, w.isExternal, w.cost, w.sale, w.name]
    );
    console.log(`✓ Updated: ${w.name}`);
  } else {
    await conn.execute(
      'INSERT INTO workers (name, department, isExternal, costPerHour, salePricePerHour, isActive) VALUES (?,?,?,?,?,1)',
      [w.name, w.department, w.isExternal, w.cost, w.sale]
    );
    console.log(`+ Inserted: ${w.name}`);
  }
}

// Remove Matías if present (management, not a worker for budgets)
// Keep but deactivate any workers not in the expected list
const expectedNames = expected.map(w => w.name);
for (const r of rows) {
  if (!expectedNames.includes(r.name)) {
    await conn.execute('UPDATE workers SET isActive=0 WHERE id=?', [r.id]);
    console.log(`- Deactivated: ${r.name} (not in expected list)`);
  }
}

// Final verification
console.log('\n=== FINAL STATE ===');
const [final] = await conn.execute(
  'SELECT name, department, isExternal, costPerHour, salePricePerHour, isActive FROM workers ORDER BY department, name'
);
console.log(`${'Name'.padEnd(20)} ${'Dept'.padEnd(15)} ${'Ext'.padEnd(5)} ${'Cost/j'.padEnd(10)} ${'Sale/j'.padEnd(10)} Active`);
console.log('-'.repeat(70));
for (const r of final) {
  console.log(`${r.name.padEnd(20)} ${r.department.padEnd(15)} ${String(r.isExternal).padEnd(5)} ${String(r.costPerHour).padEnd(10)} ${String(r.salePricePerHour).padEnd(10)} ${r.isActive}`);
}

await conn.end();
console.log('\nDone.');
