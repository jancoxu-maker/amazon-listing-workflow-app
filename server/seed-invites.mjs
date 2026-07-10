import { readFileSync } from 'node:fs';
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
    // Deployment environments provide DATABASE_URL directly.
  }
}

loadLocalEnv();

const defaultInvites = [
  ['invite_01', '内测邀请码 01', '48f3e317987ea2d51b3ca8dfd17c95eddbeb5f186715be4cf2d0f8709f0519db', 'member'],
  ['invite_02', '内测邀请码 02', 'fc59c6c106d2378251a1873a68652192541fa07477f69f44af7b8ccb57d8edb3', 'member'],
  ['invite_03', '内测邀请码 03', '9b058607078caec1266439fbbe95bcc2dca4f67984d86f586dcd5cb8732f63a0', 'member'],
  ['invite_04', '内测邀请码 04', 'b1d010aad39db84d7a2bdd55513180c74e8febb7514a29f76a4c276b5e9f409e', 'member'],
  ['invite_05', '内测邀请码 05', '20fefd0ca681e1f439db7e70fd007b05972172acde4628ac95093b99aa767dbf', 'member'],
  ['invite_admin', '管理员码', '2e803afc924afa7fbf912b121e74b26286e00b96995173acde634f58534b7cca', 'admin']
];

const database = createDatabase();
if (!database.configured) throw new Error('DATABASE_URL is required before seeding invitations.');

for (const [id, label, codeHash, roleScope] of defaultInvites) {
  await database.query(
    `INSERT INTO invite_codes (id, label, code_hash, role_scope, max_uses)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (code_hash) DO UPDATE
       SET label = EXCLUDED.label,
           role_scope = EXCLUDED.role_scope,
           updated_at = NOW()
       WHERE invite_codes.uses = 0`,
    [id, label, codeHash, roleScope]
  );
}

console.log(`Seeded ${defaultInvites.length} invitation records.`);
await database.close();
