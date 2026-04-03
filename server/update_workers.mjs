import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await mysql.createConnection(url);

const workers = [
  // [name, department, costPerDay, salePricePerDay, isExternal]
  ['Antonio',      'various',      91,  273, false],
  ['Yaiza',        'seo',          62,  186, false],
  ['Rafa',         'design',      240,  480, false],
  ['Enrique',      'design',      130,  390, false],
  ['Ángel',        'development',  91,  273, false],
  ['Jose Luis',    'development',  91,  273, false],
  ['Sergio',       'development',  91,  273, false],
  ['Fran',         'development', 240,  480, false],
  ['Ana Navarro',  'development',  98,  294, false],
  ['MWM',          'external',    270,  405, true],
  ['Alfonso Cala', 'external',    180,  350, true],
];

const [existing] = await conn.execute('SELECT id, name FROM workers');
const existingMap = Object.fromEntries(existing.map(r => [r.name, r.id]));

console.log('Aplicando cambios...');
for (const [name, dept, cost, sale, isExt] of workers) {
  if (existingMap[name]) {
    await conn.execute(
      'UPDATE workers SET department=?, costPerHour=?, salePricePerHour=?, isExternal=?, isActive=1 WHERE name=?',
      [dept, cost, sale, isExt ? 1 : 0, name]
    );
    console.log(`  UPDATED: ${name} → ${dept}, ${cost}€/j coste, ${sale}€/j venta`);
  } else {
    await conn.execute(
      'INSERT INTO workers (name, department, costPerHour, salePricePerHour, isExternal, isActive) VALUES (?,?,?,?,?,1)',
      [name, dept, cost, sale, isExt ? 1 : 0]
    );
    console.log(`  INSERTED: ${name} → ${dept}, ${cost}€/j coste, ${sale}€/j venta`);
  }
}

// Desactivar trabajadores que no están en la lista
const validNames = workers.map(w => w[0]);
for (const row of existing) {
  if (!validNames.includes(row.name)) {
    await conn.execute('UPDATE workers SET isActive=0 WHERE id=?', [row.id]);
    console.log(`  DEACTIVATED: ${row.name}`);
  }
}

console.log('\nVerificación final:');
const [final] = await conn.execute(
  'SELECT name, department, costPerHour, salePricePerHour, isExternal, isActive FROM workers ORDER BY isActive DESC, department, name'
);
for (const r of final) {
  const status = r.isActive ? 'ACTIVO' : 'INACTIVO';
  const ext = r.isExternal ? ' [EXT]' : '';
  console.log(`  ${r.name}${ext} | ${r.department} | ${r.costPerHour}€/j | ${r.salePricePerHour}€/j | ${status}`);
}

await conn.end();
console.log('\nDone.');
