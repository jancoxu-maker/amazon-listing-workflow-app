import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrandStore } from './brand-store.mjs';

function createBrandDatabase() {
  const profiles = new Map();
  const versions = new Map();
  const versionMeta = new Map();
  const execute = async (sql, values = []) => {
    if (sql.includes('INSERT INTO brand_profiles')) {
      profiles.set(values[0], { id: values[0], name: values[1], current_version: 1, status: 'active' });
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('INSERT INTO brand_profile_versions')) {
      const version = values.length === 3 ? 1 : values[1];
      const encodedRules = values.length === 3 ? values[1] : values[2];
      versions.set(`${values[0]}:${version}`, JSON.parse(encodedRules));
      versionMeta.set(`${values[0]}:${version}`, {
        created_by: values.length === 3 ? values[2] : values[3],
        created_at: new Date(`2026-07-${String(version).padStart(2, '0')}T00:00:00Z`)
      });
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('SELECT current_version')) {
      const profile = profiles.get(values[0]);
      return { rowCount: profile?.status === 'active' ? 1 : 0, rows: profile ? [profile] : [] };
    }
    if (sql.includes('UPDATE brand_profiles') && sql.includes('current_version')) {
      const profile = profiles.get(values[0]);
      Object.assign(profile, { name: values[1], current_version: values[2] });
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes("SET status = 'archived'")) {
      const profile = profiles.get(values[0]);
      if (!profile || profile.status !== 'active') return { rowCount: 0, rows: [] };
      profile.status = 'archived';
      return { rowCount: 1, rows: [{ id: profile.id }] };
    }
    if (sql.includes('FROM brand_profile_versions v')) {
      const profile = profiles.get(values[0]);
      if (!profile) return { rowCount: 0, rows: [] };
      const requestedVersion = Number(values[1] || 0);
      const rows = Array.from(versions.entries())
        .filter(([key]) => key.startsWith(`${profile.id}:`))
        .map(([key, rules]) => {
          const version = Number(key.split(':')[1]);
          return {
            brand_id: profile.id,
            name: profile.name,
            version,
            rules,
            ...versionMeta.get(key),
            created_by_name: 'Test User'
          };
        })
        .filter((row) => !requestedVersion || row.version === requestedVersion)
        .sort((a, b) => b.version - a.version);
      return { rowCount: rows.length, rows };
    }
    if (sql.includes('JOIN brand_profile_versions v')) {
      const profile = values.length
        ? profiles.get(values[0])
        : Array.from(profiles.values()).find((item) => item.status === 'active');
      if (!profile || profile.status !== 'active') return { rowCount: 0, rows: [] };
      const requestedVersion = Number(values[1] || 0);
      const version = requestedVersion || profile.current_version;
      return {
        rowCount: 1,
        rows: [{ ...profile, version, rules: versions.get(`${profile.id}:${version}`) }]
      };
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  return {
    configured: true,
    query: execute,
    transaction: (handler) => handler({ query: execute }),
    profiles,
    versions
  };
}

const designer = { id: 'designer_1', role: 'designer' };
const admin = { id: 'admin_1', role: 'admin' };

test('brand updates create immutable versions', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  const created = await store.createBrand(designer, { id: 'cosyland', name: 'Cosyland', rules: { name: 'Cosyland', tone: 'warm' } });
  const updated = await store.updateBrand(designer, created.id, { name: 'Cosyland', rules: { name: 'Cosyland', tone: 'natural' } });

  assert.equal(created.version, 1);
  assert.equal(updated.version, 2);
  assert.equal(database.versions.get('cosyland:1').tone, 'warm');
  assert.equal(database.versions.get('cosyland:2').tone, 'natural');
});

test('brand snapshot includes the frozen version and full rules', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(admin, { id: 'overmont', name: 'Overmont', rules: { name: 'Overmont', titleColor: '#112233' } });
  const snapshot = await store.getBrandSnapshot('overmont');

  assert.equal(snapshot.brandId, 'overmont');
  assert.equal(snapshot.brandVersion, 1);
  assert.equal(snapshot.rules.titleColor, '#112233');
});

test('brand snapshots can resolve an older immutable version', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(designer, { id: 'cosyland', name: 'Cosyland', rules: { name: 'Cosyland', tone: 'warm-v1' } });
  await store.updateBrand(designer, 'cosyland', { name: 'Cosyland', rules: { name: 'Cosyland', tone: 'warm-v2' } });

  const frozen = await store.getBrandSnapshot('cosyland', 1);
  assert.equal(frozen.brandVersion, 1);
  assert.equal(frozen.rules.tone, 'warm-v1');
});

test('lists brand versions newest first with full rules', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(designer, { id: 'cosyland', name: 'Cosyland', rules: { name: 'Cosyland', exampleImages: [{ storageKey: 'brand/example-1.png' }] } });
  await store.updateBrand(designer, 'cosyland', { name: 'Cosyland', rules: { name: 'Cosyland', exampleImages: [{ storageKey: 'brand/example-2.png' }] } });

  const history = await store.listBrandVersions('cosyland');
  assert.deepEqual(history.map((item) => item.version), [2, 1]);
  assert.equal(history[0].exampleImages[0].storageKey, 'brand/example-2.png');
});

test('clones a selected brand version into a new version-one brand', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(designer, {
    id: 'cosyland',
    name: 'Cosyland',
    rules: { name: 'Cosyland', iconStyle: 'outline', exampleImages: [{ storageKey: 'brand/example.png' }] }
  });

  const cloned = await store.cloneBrand(designer, 'cosyland', { version: 1, name: 'Cosyland Japan' });
  assert.equal(cloned.version, 1);
  assert.equal(cloned.name, 'Cosyland Japan');
  assert.equal(cloned.iconStyle, 'outline');
  assert.equal(cloned.exampleImages[0].storageKey, 'brand/example.png');
  assert.notEqual(cloned.id, 'cosyland');
});

test('only administrators can archive a brand', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(designer, { id: 'testbrand', name: 'Test Brand', rules: { name: 'Test Brand' } });

  await assert.rejects(() => store.deleteBrand(designer, 'testbrand'), { code: 'BRAND_DELETE_FORBIDDEN' });
  await store.deleteBrand(admin, 'testbrand');
  assert.equal(database.profiles.get('testbrand').status, 'archived');
});
