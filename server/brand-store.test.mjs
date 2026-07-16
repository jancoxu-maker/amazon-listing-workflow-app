import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrandStore } from './brand-store.mjs';

function createBrandDatabase() {
  const profiles = new Map();
  const versions = new Map();
  const execute = async (sql, values = []) => {
    if (sql.includes('INSERT INTO brand_profiles')) {
      profiles.set(values[0], { id: values[0], name: values[1], current_version: 1, status: 'active' });
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('INSERT INTO brand_profile_versions')) {
      const version = values.length === 3 ? 1 : values[1];
      const encodedRules = values.length === 3 ? values[1] : values[2];
      versions.set(`${values[0]}:${version}`, JSON.parse(encodedRules));
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
    if (sql.includes('JOIN brand_profile_versions')) {
      const profile = values.length
        ? profiles.get(values[0])
        : Array.from(profiles.values()).find((item) => item.status === 'active');
      if (!profile || profile.status !== 'active') return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{ ...profile, rules: versions.get(`${profile.id}:${profile.current_version}`) }]
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

test('only administrators can archive a brand', async () => {
  const database = createBrandDatabase();
  const store = createBrandStore(database);
  await store.createBrand(designer, { id: 'testbrand', name: 'Test Brand', rules: { name: 'Test Brand' } });

  await assert.rejects(() => store.deleteBrand(designer, 'testbrand'), { code: 'BRAND_DELETE_FORBIDDEN' });
  await store.deleteBrand(admin, 'testbrand');
  assert.equal(database.profiles.get('testbrand').status, 'archived');
});
