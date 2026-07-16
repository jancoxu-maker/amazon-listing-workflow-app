import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { createDatabase } from './database.mjs';

const scrypt = promisify(scryptCallback);

function loadLocalEnv() {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Hosted environments supply variables directly.
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

loadLocalEnv();

const password = String(process.env.TEST_ACCOUNT_PASSWORD || '');
if (password.length < 10) throw new Error('TEST_ACCOUNT_PASSWORD must be at least 10 characters.');

const testUsers = [
  { email: 'qa-designer@vistamz.test', displayName: 'QA 设计', role: 'designer' },
  { email: 'qa-operator@vistamz.test', displayName: 'QA 运营', role: 'operator' },
  { email: 'qa-admin@vistamz.test', displayName: 'QA 管理员', role: 'admin' }
];

const database = createDatabase();
if (!database.configured) throw new Error('DATABASE_URL is required before creating test accounts.');

for (const user of testUsers) {
  const passwordHash = await hashPassword(password);
  await database.query(
    `INSERT INTO app_users (id, email, display_name, role, status, password_hash)
     VALUES ($1, $2, $3, $4, 'active', $5)
     ON CONFLICT (email) DO UPDATE
       SET display_name = EXCLUDED.display_name,
           role = EXCLUDED.role,
           status = 'active',
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()`,
    [`qa_${randomUUID().replace(/-/g, '')}`, user.email, user.displayName, user.role, passwordHash]
  );
}

console.log('Created 3 QA accounts.');
await database.close();
