import { createDataSource } from './data-source';

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('Define DATABASE_URL en backend/.env.');
  const db = createDataSource(process.env.DATABASE_URL);
  await db.initialize();
  try {
    const migrations = await db.runMigrations({ transaction: 'all' });
    console.log(`Migraciones aplicadas: ${migrations.map(m => m.name).join(', ') || 'ninguna pendiente'}`);
  } finally { await db.destroy(); }
}
migrate().catch(error => { console.error(error instanceof Error ? error.message : 'Falló la migración.'); process.exitCode = 1; });
