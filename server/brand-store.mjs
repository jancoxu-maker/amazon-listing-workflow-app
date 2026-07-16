import { randomUUID } from 'node:crypto';
import { Stage1Error } from './stage1-store.mjs';
import { findInlineAsset } from './json-safety.mjs';

const EDIT_ROLES = new Set(['designer', 'admin']);

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function assertEditor(user) {
  if (!EDIT_ROLES.has(user?.role)) {
    throw new Stage1Error('当前身份不能修改品牌库。', 403, 'BRAND_EDIT_FORBIDDEN');
  }
}

function assertNoInlineAssets(value) {
  if (findInlineAsset(value)) {
    throw new Stage1Error('品牌资料包含内联图片，请先上传 Logo 到对象存储。', 413, 'INLINE_ASSET_NOT_ALLOWED');
  }
}

function mapBrand(row) {
  const rules = safeObject(row.rules);
  return {
    ...rules,
    id: row.id,
    name: row.name,
    version: Number(row.current_version || row.version || 1),
    updatedAt: row.updated_at || row.created_at || null
  };
}

export function createBrandStore(database) {
  function assertConfigured() {
    if (!database.configured) {
      throw new Stage1Error('品牌库尚未配置数据库。', 503, 'DATABASE_NOT_CONFIGURED');
    }
  }

  async function listBrands() {
    assertConfigured();
    const result = await database.query(`
      SELECT p.id, p.name, p.current_version, p.updated_at, v.rules
      FROM brand_profiles p
      JOIN brand_profile_versions v
        ON v.brand_id = p.id AND v.version = p.current_version
      WHERE p.status = 'active'
      ORDER BY p.name, p.created_at
    `);
    return result.rows.map(mapBrand);
  }

  async function getBrandSnapshot(brandId) {
    assertConfigured();
    const id = String(brandId || '').trim();
    if (!id || id === 'none') return {};
    const result = await database.query(`
      SELECT p.id, p.name, p.current_version, p.updated_at, v.rules
      FROM brand_profiles p
      JOIN brand_profile_versions v
        ON v.brand_id = p.id AND v.version = p.current_version
      WHERE p.id = $1 AND p.status = 'active'
      LIMIT 1
    `, [id]);
    if (!result.rowCount) throw new Stage1Error('所选品牌不存在或已停用。', 404, 'BRAND_NOT_FOUND');
    const brand = mapBrand(result.rows[0]);
    return {
      brandId: brand.id,
      brandVersion: brand.version,
      brandName: brand.name,
      rules: brand
    };
  }

  async function createBrand(user, payload = {}) {
    assertConfigured();
    assertEditor(user);
    const rules = safeObject(payload.rules || payload);
    const name = normalizeName(payload.name || rules.name);
    if (name.length < 2) throw new Stage1Error('请输入品牌名。', 400, 'BRAND_NAME_REQUIRED');
    const requestedId = String(payload.id || rules.id || '').trim();
    const id = /^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$/.test(requestedId)
      ? requestedId
      : `brand_${randomUUID().replace(/-/g, '')}`;
    const normalizedRules = { ...rules, id, name };
    assertNoInlineAssets(normalizedRules);
    await database.transaction(async (client) => {
      await client.query(
        `INSERT INTO brand_profiles (id, name, current_version, created_by)
         VALUES ($1, $2, 1, $3)`,
        [id, name, user.id]
      );
      await client.query(
        `INSERT INTO brand_profile_versions (brand_id, version, rules, created_by)
         VALUES ($1, 1, $2::jsonb, $3)`,
        [id, JSON.stringify(normalizedRules), user.id]
      );
    });
    return { ...normalizedRules, version: 1 };
  }

  async function updateBrand(user, brandId, payload = {}) {
    assertConfigured();
    assertEditor(user);
    const id = String(brandId || '').trim();
    const rules = safeObject(payload.rules || payload);
    const name = normalizeName(payload.name || rules.name);
    if (!id || id === 'none') throw new Stage1Error('系统基线品牌不能修改。', 400, 'BRAND_BASELINE_READ_ONLY');
    if (name.length < 2) throw new Stage1Error('请输入品牌名。', 400, 'BRAND_NAME_REQUIRED');
    const normalizedRules = { ...rules, id, name };
    assertNoInlineAssets(normalizedRules);
    const version = await database.transaction(async (client) => {
      const current = await client.query(
        `SELECT current_version FROM brand_profiles
         WHERE id = $1 AND status = 'active'
         FOR UPDATE`,
        [id]
      );
      if (!current.rowCount) throw new Stage1Error('品牌不存在或已停用。', 404, 'BRAND_NOT_FOUND');
      const nextVersion = Number(current.rows[0].current_version) + 1;
      await client.query(
        `INSERT INTO brand_profile_versions (brand_id, version, rules, created_by)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [id, nextVersion, JSON.stringify(normalizedRules), user.id]
      );
      await client.query(
        `UPDATE brand_profiles
         SET name = $2, current_version = $3, updated_at = NOW()
         WHERE id = $1`,
        [id, name, nextVersion]
      );
      return nextVersion;
    });
    return { ...normalizedRules, version };
  }

  async function deleteBrand(user, brandId) {
    assertConfigured();
    if (user?.role !== 'admin') {
      throw new Stage1Error('只有管理员可以删除品牌。', 403, 'BRAND_DELETE_FORBIDDEN');
    }
    const id = String(brandId || '').trim();
    const result = await database.query(
      `UPDATE brand_profiles SET status = 'archived', updated_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [id]
    );
    if (!result.rowCount) throw new Stage1Error('品牌不存在或已删除。', 404, 'BRAND_NOT_FOUND');
    return { id };
  }

  return { listBrands, getBrandSnapshot, createBrand, updateBrand, deleteBrand };
}
