import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

// Parse the URL
const parsed = new URL(url);
const host = parsed.hostname;
const port = parseInt(parsed.port) || 3306;
const user = parsed.username;
const password = parsed.password;
const database = parsed.pathname.replace('/', '');
const ssl = parsed.searchParams.get('ssl-mode') === 'VERIFY_IDENTITY' ? { rejectUnauthorized: true } : { rejectUnauthorized: false };

const conn = await mysql.createConnection({ host, port, user, password, database, ssl });

// Reset all averages to 0 — they will be populated from Clockify sync
await conn.execute(`UPDATE project_types SET avgSeoHours = '0', avgDesignHours = '0', avgDevHours = '0', sampleCount = 0`);
console.log('✓ Medias históricas reseteadas a 0');

// Show current project types
const [rows] = await conn.execute('SELECT id, name, avgSeoHours, avgDesignHours, avgDevHours, sampleCount FROM project_types');
console.table(rows);

await conn.end();
