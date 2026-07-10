import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createDatabase } from './database.mjs';

function loadLocalEnv() {
  try {
    const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // The command also supports deployment environments that provide DATABASE_URL directly.
  }
}

loadLocalEnv();

const migrationsDir = resolve('db/migrations');
const database = createDatabase();

if (!database.configured) {
  throw new Error('DATABASE_URL is required before running migrations.');
}

await database.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

for (const fileName of migrationFiles) {
  const sql = readFileSync(join(migrationsDir, fileName), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const applied = await database.query('SELECT checksum FROM schema_migrations WHERE id = $1', [fileName]);
  if (applied.rowCount) {
    if (applied.rows[0].checksum !== checksum) {
      throw new Error(`Migration ${fileName} has changed after being applied.`);
    }
    continue;
  }

  await database.transaction(async (client) => {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)', [fileName, checksum]);
  });
  console.log(`Applied ${fileName}`);
}

await database.close();
