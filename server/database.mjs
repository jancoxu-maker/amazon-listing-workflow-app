import pg from 'pg';

const { Pool } = pg;

function normalizeConnectionString(value) {
  try {
    const url = new URL(value);
    if (['prefer', 'require', 'verify-ca'].includes(url.searchParams.get('sslmode'))) {
      url.searchParams.set('sslmode', 'verify-full');
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function createDatabase() {
  const connectionString = normalizeConnectionString(String(process.env.DATABASE_URL || '').trim());
  const useSsl = process.env.DATABASE_SSL === 'true';
  const pool = connectionString
    ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_SIZE || 6)
    })
    : null;

  async function query(text, values = []) {
    if (!pool) {
      const error = new Error('Database is not configured. Set DATABASE_URL before using shared data features.');
      error.code = 'DATABASE_NOT_CONFIGURED';
      throw error;
    }
    return pool.query(text, values);
  }

  async function transaction(handler) {
    if (!pool) {
      const error = new Error('Database is not configured. Set DATABASE_URL before using shared data features.');
      error.code = 'DATABASE_NOT_CONFIGURED';
      throw error;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await handler(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async function health() {
    if (!pool) return { configured: false, reachable: false };
    try {
      await pool.query('SELECT 1');
      return { configured: true, reachable: true };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }

  return {
    configured: Boolean(pool),
    query,
    transaction,
    health,
    close: () => pool?.end()
  };
}
