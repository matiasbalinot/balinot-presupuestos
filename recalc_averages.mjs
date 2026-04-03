import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Obtener todas las tipologías
const [types] = await conn.query('SELECT id, name FROM project_types');
console.log('Tipologías encontradas:', types.map(t => `${t.id}: ${t.name}`).join(', '));

for (const type of types) {
  // Obtener todos los proyectos con jornadas > 0 para esta tipología
  const [rows] = await conn.query(
    'SELECT realSeoHours, realDesignHours, realDevHours, realVariousHours, realTotalHours FROM project_history WHERE projectTypeId = ? AND realTotalHours > 0',
    [type.id]
  );
  
  if (rows.length === 0) {
    console.log(`  ${type.name}: 0 proyectos con datos`);
    continue;
  }
  
  const avg = (field) => rows.reduce((s, r) => s + Number(r[field] ?? 0), 0) / rows.length;
  
  const avgSeo = avg('realSeoHours');
  const avgDesign = avg('realDesignHours');
  const avgDev = avg('realDevHours');
  const avgVarious = avg('realVariousHours');
  
  await conn.query(
    'UPDATE project_types SET avgSeoHours = ?, avgDesignHours = ?, avgDevHours = ?, avgVariousHours = ?, sampleCount = ?, lastSyncedAt = NOW() WHERE id = ?',
    [avgSeo.toFixed(2), avgDesign.toFixed(2), avgDev.toFixed(2), avgVarious.toFixed(2), rows.length, type.id]
  );
  
  console.log(`  ${type.name} (${rows.length} proyectos): SEO=${avgSeo.toFixed(2)}h, Diseño=${avgDesign.toFixed(2)}h, Dev=${avgDev.toFixed(2)}h, Varios=${avgVarious.toFixed(2)}h`);
}

await conn.end();
console.log('Recálculo completado.');
