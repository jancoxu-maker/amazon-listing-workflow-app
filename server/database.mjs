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
  const queryTimeoutMs = Math.max(1000, Number(process.env.DATABASE_QUERY_TIMEOUT_MS || 10000));
  const retryAttempts = Math.max(1, Math.min(6, Number(process.env.DATABASE_RETRY_ATTEMPTS || 3)));
  const retryBaseMs = Math.max(100, Number(process.env.DATABASE_RETRY_BASE_MS || 500));
  const retryMaxMs = Math.max(retryBaseMs, Number(process.env.DATABASE_RETRY_MAX_MS || 5000));
  const pool = connectionString
    ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_SIZE || 6),
      connectionTimeoutMillis: Math.max(1000, Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 8000)),
      idleTimeoutMillis: Math.max(1000, Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000)),
      query_timeout: queryTimeoutMs,
      statement_timeout: queryTimeoutMs
    })
    : null;

  function assertConfigured() {
    if (!pool) {
      const error = new Error('Database is not configured. Set DATABASE_URL before using shared data features.');
      error.code = 'DATABASE_NOT_CONFIGURED';
      throw error;
    }
  }

  function isReadOnlyQuery(text) {
    return /^\s*(?:SELECT|SHOW|EXPLAIN|WITH\s+.+?\s+SELECT)\b/is.test(String(text || ''));
  }

  function isRetryableConnectionError(error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('quota') || message.includes('limit exceeded') || message.includes('too many connections')) return false;
    return new Set(['08000', '08003', '08006', '08001', '08004', '57P01', '57P02', '57P03', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE']).has(code)
      || message.includes('connection terminated')
      || message.includes('connection timeout')
      || message.includes('socket hang up')
      || message.includes('server closed the connection unexpectedly');
  }

  function wait(ms) {
    return new Promise((resolveWait) => setTimeout(resolveWait, ms));
  }

  async function withConnectionRetry(operation, { attempts = retryAttempts } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt >= attempts || !isRetryableConnectionError(error)) throw error;
        const delay = Math.min(retryMaxMs, retryBaseMs * (2 ** (attempt - 1)));
        await wait(delay);
      }
    }
    throw lastError;
  }

  async function query(text, values = []) {
    assertConfigured();
    if (!isReadOnlyQuery(text)) return pool.query(text, values);
    return withConnectionRetry(() => pool.query(text, values));
  }

  async function transaction(handler) {
    assertConfigured();
    // Only retry acquiring a connection. Never replay a transaction because the
    // server may have committed before a connection error reached the client.
    const client = await withConnectionRetry(() => pool.connect());
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
      await withConnectionRetry(() => pool.query('SELECT 1'));
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
    isRetryableConnectionError,
    close: () => pool?.end()
  };
}
