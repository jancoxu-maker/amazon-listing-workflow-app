import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { findInlineAsset } from './json-safety.mjs';

const MEMBER_ROLES = new Set(['designer', 'operator']);
const ALL_ROLES = new Set(['designer', 'operator', 'admin']);
const SESSION_DAYS = Math.max(1, Number(process.env.AUTH_SESSION_DAYS || 14));
const PASSWORD_MIN_LENGTH = 10;
const scrypt = promisify(scryptCallback);

const PROJECT_STATUSES = new Set(['draft', 'content', 'planning', 'design', 'review', 'rework', 'approved', 'exported', 'archived']);

export class Stage1Error extends Error {
  constructor(message, status = 400, code = 'STAGE1_ERROR') {
    super(message);
    this.name = 'Stage1Error';
    this.status = status;
    this.code = code;
  }
}

function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

function hashToken(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, encoded] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, 'base64url');
  const derived = Buffer.from(await scrypt(password, salt, expected.length));
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw new Stage1Error(`密码至少需要 ${PASSWORD_MIN_LENGTH} 位。`, 400, 'PASSWORD_TOO_SHORT');
  }
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function assertNoInlineAssets(value, label = '项目资料') {
  const path = findInlineAsset(value);
  if (path) {
    throw new Stage1Error(`${label}包含内联图片，请先上传到对象存储。`, 413, 'INLINE_ASSET_NOT_ALLOWED');
  }
}

function isProjectFullyApproved(projectData = {}) {
  const decisions = Array.isArray(projectData.reviewDecisions) ? projectData.reviewDecisions : [];
  const briefs = Array.isArray(projectData.storyboardBriefs) ? projectData.storyboardBriefs : [];
  if (!decisions.length || !briefs.length) return false;
  const activeSlotIds = new Set(briefs.map((brief) => Number(brief?.id)).filter(Number.isFinite));
  if (!activeSlotIds.size) return false;
  return Array.from(activeSlotIds).every((slotId) => {
    const decision = decisions.find((item) => Number(item?.slotId) === slotId);
    return decision?.opsStatus === 'approved' && decision?.finalStatus === 'approved';
  });
}

function userRecord(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email || '',
    role: row.role,
    status: row.status,
    passwordConfigured: Boolean(row.password_hash)
  };
}

export function getBearerToken(header = '') {
  const match = /^Bearer\s+(.+)$/i.exec(String(header || '').trim());
  return match ? match[1].trim() : '';
}

export function createStage1Store(database) {
  function assertConfigured() {
    if (!database.configured) {
      throw new Stage1Error('共享账号与项目服务尚未配置数据库。', 503, 'DATABASE_NOT_CONFIGURED');
    }
  }

  async function getSession(token) {
    assertConfigured();
    if (!token) return null;
    const result = await database.query(`
      SELECT s.id AS session_id, s.expires_at, u.id, u.display_name, u.email, u.role, u.status, u.password_hash
      FROM auth_sessions s
      JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.status = 'active'
      LIMIT 1
    `, [hashToken(token)]);
    if (!result.rowCount) return null;
    await database.query('UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1', [result.rows[0].session_id]);
    return {
      sessionId: result.rows[0].session_id,
      user: userRecord(result.rows[0])
    };
  }

  async function requireSession(token) {
    const session = await getSession(token);
    if (!session) throw new Stage1Error('登录已失效，请重新进入。', 401, 'AUTH_REQUIRED');
    return session;
  }

  async function requireProjectAccess(user, projectId, options = {}) {
    assertConfigured();
    const id = String(projectId || '').trim();
    if (!id) throw new Stage1Error('请求缺少项目编号。', 400, 'PROJECT_ID_REQUIRED');

    const allowedRoles = Array.isArray(options.allowedRoles) ? options.allowedRoles : [];
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      throw new Stage1Error('当前身份不能执行此操作。', 403, 'PROJECT_ACTION_FORBIDDEN');
    }

    const result = await database.query(
      `SELECT p.id, p.status, p.brand_snapshot, p.project_data,
        EXISTS(
          SELECT 1 FROM project_assignments a
          WHERE a.project_id = p.id
            AND a.user_id = $2
            AND a.assignment_role = $3
        ) AS has_role_assignment
       FROM projects p
       WHERE p.id = $1 AND p.deleted_at IS NULL
       LIMIT 1`,
      [id, user.id, user.role]
    );
    if (!result.rowCount) throw new Stage1Error('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    const project = result.rows[0];
    if (user.role !== 'admin' && !project.has_role_assignment) {
      throw new Stage1Error('你没有操作这个项目的权限。', 403, 'PROJECT_ACCESS_FORBIDDEN');
    }
    if (options.requireApproved && !isProjectFullyApproved(safeObject(project.project_data))) {
      throw new Stage1Error('项目尚未完成运营审核和管理员最终放行，不能导出。', 409, 'PROJECT_NOT_APPROVED');
    }
    return {
      id: project.id,
      status: project.status,
      brandSnapshot: safeObject(project.brand_snapshot),
      projectData: safeObject(project.project_data)
    };
  }

  async function activateInvite({ inviteHash, displayName, email, requestedRole, password }) {
    assertConfigured();
    const codeHash = String(inviteHash || '').trim().toLowerCase();
    const name = normalizeName(displayName);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = String(password || '');
    if (!/^[a-f0-9]{64}$/.test(codeHash)) {
      throw new Stage1Error('邀请码格式无效。', 400, 'INVALID_INVITE');
    }
    if (name.length < 2) {
      throw new Stage1Error('请输入至少 2 个字符的姓名。', 400, 'DISPLAY_NAME_REQUIRED');
    }
    if (!normalizedEmail) {
      throw new Stage1Error('请输入有效的公司邮箱。', 400, 'EMAIL_REQUIRED');
    }
    assertPassword(normalizedPassword);

    return database.transaction(async (client) => {
      const inviteResult = await client.query('SELECT * FROM invite_codes WHERE code_hash = $1 FOR UPDATE', [codeHash]);
      const invite = inviteResult.rows[0];
      const reusableAdminInvite = invite?.role_scope === 'admin';
      if (!invite || invite.status !== 'active' || (!reusableAdminInvite && invite.uses >= invite.max_uses) || (invite.expires_at && new Date(invite.expires_at) <= new Date())) {
        throw new Stage1Error('邀请码无效、已被使用或已过期。', 403, 'INVITE_UNAVAILABLE');
      }

      const allowedRole = invite.role_scope === 'member' ? requestedRole : invite.role_scope;
      if (!ALL_ROLES.has(allowedRole) || (invite.role_scope === 'member' && !MEMBER_ROLES.has(allowedRole))) {
        throw new Stage1Error('此邀请码不支持当前身份。', 403, 'ROLE_NOT_ALLOWED');
      }
      if (normalizedEmail) {
        const existing = await client.query('SELECT id FROM app_users WHERE email = $1 LIMIT 1', [normalizedEmail]);
        if (existing.rowCount) throw new Stage1Error('该邮箱已激活账号，请直接登录。', 409, 'EMAIL_ALREADY_USED');
      }

      const userId = createId('usr');
      const sessionId = createId('ses');
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      const passwordHash = await hashPassword(normalizedPassword);
      await client.query(
        'INSERT INTO app_users (id, email, display_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)',
        [userId, normalizedEmail, name, allowedRole, passwordHash]
      );
      if (!reusableAdminInvite) {
        await client.query('UPDATE invite_codes SET uses = uses + 1, updated_at = NOW() WHERE id = $1', [invite.id]);
      }
      await client.query(
        'INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [sessionId, userId, hashToken(token), expiresAt]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, event_name, payload)
         VALUES ($1, $2, 'auth.invite_activated', $3::jsonb)`,
        [createId('audit'), userId, JSON.stringify({ inviteId: invite.id, inviteLabel: invite.label, role: allowedRole })]
      );

      return {
        accessToken: token,
        expiresAt: expiresAt.toISOString(),
        user: { id: userId, displayName: name, email: normalizedEmail, role: allowedRole, status: 'active', passwordConfigured: true }
      };
    });
  }

  async function login({ email, password }) {
    assertConfigured();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || typeof password !== 'string') {
      throw new Stage1Error('邮箱或密码不正确。', 401, 'LOGIN_FAILED');
    }
    const result = await database.query(
      'SELECT id, display_name, email, role, status, password_hash FROM app_users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active' || !await verifyPassword(password, user.password_hash)) {
      throw new Stage1Error('邮箱或密码不正确。', 401, 'LOGIN_FAILED');
    }
    const sessionId = createId('ses');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await database.transaction(async (client) => {
      await client.query(
        'INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [sessionId, user.id, hashToken(token), expiresAt]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, event_name, payload)
         VALUES ($1, $2, 'auth.login', $3::jsonb)`,
        [createId('audit'), user.id, JSON.stringify({ role: user.role })]
      );
    });
    return { accessToken: token, expiresAt: expiresAt.toISOString(), user: userRecord(user) };
  }

  async function revokeSession(token) {
    assertConfigured();
    if (!token) return;
    await database.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [hashToken(token)]);
  }

  async function listProjects(user) {
    assertConfigured();
    const result = user.role === 'admin'
      ? await database.query(`
          SELECT p.*, creator.display_name AS creator_name,
            COALESCE(json_agg(json_build_object('userId', a.user_id, 'role', a.assignment_role, 'name', assignee.display_name))
              FILTER (WHERE a.user_id IS NOT NULL), '[]'::json) AS assignments
          FROM projects p
          JOIN app_users creator ON creator.id = p.created_by
          LEFT JOIN project_assignments a ON a.project_id = p.id
          LEFT JOIN app_users assignee ON assignee.id = a.user_id
          WHERE p.deleted_at IS NULL
          GROUP BY p.id, creator.display_name
          ORDER BY p.updated_at DESC
        `)
      : await database.query(`
          SELECT p.*, creator.display_name AS creator_name,
            COALESCE(json_agg(json_build_object('userId', a_all.user_id, 'role', a_all.assignment_role, 'name', assignee.display_name))
              FILTER (WHERE a_all.user_id IS NOT NULL), '[]'::json) AS assignments
          FROM projects p
          JOIN project_assignments visible_assignment ON visible_assignment.project_id = p.id AND visible_assignment.user_id = $1
          JOIN app_users creator ON creator.id = p.created_by
          LEFT JOIN project_assignments a_all ON a_all.project_id = p.id
          LEFT JOIN app_users assignee ON assignee.id = a_all.user_id
          WHERE p.deleted_at IS NULL
          GROUP BY p.id, creator.display_name
          ORDER BY p.updated_at DESC
        `, [user.id]);
    return result.rows.map((row) => ({
      id: row.id,
      projectName: row.project_name,
      productName: row.product_name,
      sku: row.sku,
      outputType: row.output_type,
      status: row.status,
      createdBy: { id: row.created_by, name: row.creator_name },
      assignments: row.assignments || [],
      brandSnapshot: row.brand_snapshot || {},
      projectData: row.project_data || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async function listTrashedProjects(user) {
    assertConfigured();
    if (!['designer', 'admin'].includes(user.role)) return [];
    const result = user.role === 'admin'
      ? await database.query(`
          SELECT p.*, creator.display_name AS creator_name
          FROM projects p
          JOIN app_users creator ON creator.id = p.created_by
          WHERE p.deleted_at IS NOT NULL
          ORDER BY p.deleted_at DESC
        `)
      : await database.query(`
          SELECT p.*, creator.display_name AS creator_name
          FROM projects p
          JOIN app_users creator ON creator.id = p.created_by
          WHERE p.deleted_at IS NOT NULL AND p.created_by = $1
          ORDER BY p.deleted_at DESC
        `, [user.id]);
    return result.rows.map((row) => ({
      id: row.id,
      projectName: row.project_name,
      productName: row.product_name,
      sku: row.sku,
      outputType: row.output_type,
      status: row.status,
      previousStatus: row.status_before_delete || 'draft',
      createdBy: { id: row.created_by, name: row.creator_name },
      deletedAt: row.deleted_at,
      purgeAfter: row.purge_after
    }));
  }

  async function trashProject(user, projectId) {
    assertConfigured();
    if (!['designer', 'admin'].includes(user.role)) {
      throw new Stage1Error('当前身份不能删除项目。', 403, 'PROJECT_DELETE_FORBIDDEN');
    }
    const id = String(projectId || '').trim();
    const result = await database.transaction(async (client) => {
      const current = await client.query(
        `SELECT id, project_name, created_by, status
         FROM projects
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [id]
      );
      if (!current.rowCount) throw new Stage1Error('项目不存在或已在回收站。', 404, 'PROJECT_NOT_FOUND');
      const project = current.rows[0];
      if (user.role !== 'admin' && project.created_by !== user.id) {
        throw new Stage1Error('设计师只能删除自己创建的项目。', 403, 'PROJECT_DELETE_FORBIDDEN');
      }
      if (user.role !== 'admin' && !['draft', 'content', 'planning', 'design', 'rework'].includes(project.status)) {
        throw new Stage1Error('已进入审核或已导出的项目需要管理员移入回收站。', 409, 'PROJECT_DELETE_REQUIRES_ADMIN');
      }
      await client.query(
        `UPDATE projects
         SET status_before_delete = status,
             status = 'archived',
             deleted_at = NOW(),
             deleted_by = $2,
             purge_after = NOW() + INTERVAL '30 days',
             updated_at = NOW()
         WHERE id = $1`,
        [id, user.id]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.trashed', $4::jsonb)`,
        [createId('audit'), user.id, id, JSON.stringify({ previousStatus: project.status, purgeAfterDays: 30 })]
      );
      return project;
    });
    return { id: result.id, projectName: result.project_name, deleted: true };
  }

  async function restoreProject(user, projectId) {
    assertConfigured();
    if (!['designer', 'admin'].includes(user.role)) {
      throw new Stage1Error('当前身份不能恢复项目。', 403, 'PROJECT_RESTORE_FORBIDDEN');
    }
    const id = String(projectId || '').trim();
    return database.transaction(async (client) => {
      const current = await client.query(
        `SELECT id, project_name, created_by, status_before_delete
         FROM projects
         WHERE id = $1 AND deleted_at IS NOT NULL
         FOR UPDATE`,
        [id]
      );
      if (!current.rowCount) throw new Stage1Error('回收站中没有这个项目。', 404, 'TRASHED_PROJECT_NOT_FOUND');
      const project = current.rows[0];
      if (user.role !== 'admin' && project.created_by !== user.id) {
        throw new Stage1Error('设计师只能恢复自己创建的项目。', 403, 'PROJECT_RESTORE_FORBIDDEN');
      }
      const restoredStatus = PROJECT_STATUSES.has(project.status_before_delete) && project.status_before_delete !== 'archived'
        ? project.status_before_delete
        : 'draft';
      await client.query(
        `UPDATE projects
         SET status = $2,
             status_before_delete = NULL,
             deleted_at = NULL,
             deleted_by = NULL,
             purge_after = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [id, restoredStatus]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.restored', $4::jsonb)`,
        [createId('audit'), user.id, id, JSON.stringify({ restoredStatus })]
      );
      return { id, projectName: project.project_name, status: restoredStatus, restored: true };
    });
  }

  async function createProject(user, payload = {}) {
    assertConfigured();
    if (!['designer', 'admin'].includes(user.role)) {
      throw new Stage1Error('当前身份不能创建项目。', 403, 'PROJECT_CREATE_FORBIDDEN');
    }
    const projectName = normalizeName(payload.projectName);
    if (projectName.length < 2) throw new Stage1Error('请输入项目名称。', 400, 'PROJECT_NAME_REQUIRED');
    const projectId = createId('prj');
    const outputType = payload.outputType === 'a-plus' ? 'a-plus' : 'main-image';
    const projectData = safeObject(payload.projectData);
    const brandSnapshot = safeObject(payload.brandSnapshot);
    assertNoInlineAssets(projectData);
    assertNoInlineAssets(brandSnapshot, '品牌快照');

    await database.transaction(async (client) => {
      await client.query(
        `INSERT INTO projects (id, project_name, product_name, sku, output_type, created_by, brand_snapshot, project_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
        [projectId, projectName, normalizeName(payload.productName), String(payload.sku || '').trim().slice(0, 120), outputType, user.id, JSON.stringify(brandSnapshot), JSON.stringify(projectData)]
      );
      await client.query(
        'INSERT INTO project_assignments (project_id, user_id, assignment_role, assigned_by) VALUES ($1, $2, $3, $4)',
        [projectId, user.id, 'designer', user.id]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.created', $4::jsonb)`,
        [createId('audit'), user.id, projectId, JSON.stringify({ outputType })]
      );
    });

    return { id: projectId, projectName, outputType, status: 'draft', brandSnapshot };
  }

  async function updateProject(user, projectId, payload = {}) {
    assertConfigured();
    const id = String(projectId || '').trim();
    const project = await database.query(
      `SELECT p.id, p.project_name, p.product_name, p.sku, p.output_type, p.status, p.brand_snapshot, p.project_data,
        EXISTS(
          SELECT 1 FROM project_assignments a
          WHERE a.project_id = p.id AND a.user_id = $2 AND a.assignment_role = $3
        ) AS has_role_assignment
       FROM projects p
       WHERE p.id = $1 AND p.deleted_at IS NULL
       LIMIT 1`,
      [id, user.id, user.role]
    );
    if (!project.rowCount) throw new Stage1Error('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    if (user.role !== 'admin' && !project.rows[0].has_role_assignment) {
      throw new Stage1Error('你没有编辑这个项目的权限。', 403, 'PROJECT_UPDATE_FORBIDDEN');
    }

    const current = project.rows[0];
    if (user.role === 'operator') {
      const incomingData = safeObject(payload.projectData);
      const currentData = safeObject(current.project_data);
      const reviewDecisions = Array.isArray(incomingData.reviewDecisions)
        ? incomingData.reviewDecisions
        : currentData.reviewDecisions;
      const nextStatus = ['review', 'rework', 'approved'].includes(payload.status)
        ? payload.status
        : current.status;
      const nextProjectData = {
        ...currentData,
        reviewDecisions: Array.isArray(reviewDecisions) ? reviewDecisions : []
      };
      assertNoInlineAssets(nextProjectData);
      await database.transaction(async (client) => {
        await client.query(
          `UPDATE projects
           SET status = $2, project_data = $3::jsonb, updated_at = NOW()
           WHERE id = $1`,
          [id, nextStatus, JSON.stringify(nextProjectData)]
        );
        await client.query(
          `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
           VALUES ($1, $2, $3, 'project.review_updated', $4::jsonb)`,
          [createId('audit'), user.id, id, JSON.stringify({ status: nextStatus })]
        );
      });
      return {
        id,
        projectName: current.project_name,
        outputType: current.output_type,
        status: nextStatus,
        brandSnapshot: current.brand_snapshot || {}
      };
    }

    const projectName = normalizeName(payload.projectName);
    if (projectName.length < 2) throw new Stage1Error('请输入项目名称。', 400, 'PROJECT_NAME_REQUIRED');
    const outputType = payload.outputType === 'a-plus' ? 'a-plus' : 'main-image';
    const status = PROJECT_STATUSES.has(payload.status)
      ? payload.status
      : 'draft';
    assertNoInlineAssets(payload.projectData);
    assertNoInlineAssets(payload.brandSnapshot, '品牌快照');

    await database.transaction(async (client) => {
      await client.query(
        `UPDATE projects
         SET project_name = $2,
             product_name = $3,
             sku = $4,
             output_type = $5,
             status = $6,
             brand_snapshot = $7::jsonb,
             project_data = $8::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          projectName,
          normalizeName(payload.productName),
          String(payload.sku || '').trim().slice(0, 120),
          outputType,
          status,
          JSON.stringify(safeObject(payload.brandSnapshot)),
          JSON.stringify(safeObject(payload.projectData))
        ]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.updated', $4::jsonb)`,
        [createId('audit'), user.id, id, JSON.stringify({ status, outputType })]
      );
    });

    return {
      id,
      projectName,
      outputType,
      status,
      brandSnapshot: safeObject(payload.brandSnapshot)
    };
  }

  async function assignProject(user, projectId, { userId, assignmentRole }) {
    assertConfigured();
    if (user.role !== 'admin') throw new Stage1Error('只有管理员可以分配项目。', 403, 'PROJECT_ASSIGN_FORBIDDEN');
    if (!MEMBER_ROLES.has(assignmentRole)) throw new Stage1Error('分配身份必须是设计师或运营。', 400, 'INVALID_ASSIGNMENT_ROLE');
    const project = await database.query('SELECT id FROM projects WHERE id = $1 LIMIT 1', [projectId]);
    if (!project.rowCount) throw new Stage1Error('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    const targetId = String(userId || '').trim();
    if (targetId) {
      const targetUser = await database.query('SELECT id, role, status FROM app_users WHERE id = $1 LIMIT 1', [targetId]);
      if (!targetUser.rowCount || targetUser.rows[0].status !== 'active' || targetUser.rows[0].role !== assignmentRole) {
        throw new Stage1Error('无法分配给该用户，请确认身份和账号状态。', 400, 'INVALID_ASSIGNEE');
      }
    }
    await database.transaction(async (client) => {
      await client.query(
        'DELETE FROM project_assignments WHERE project_id = $1 AND assignment_role = $2',
        [projectId, assignmentRole]
      );
      if (targetId) {
      await client.query(
          `INSERT INTO project_assignments (project_id, user_id, assignment_role, assigned_by)
           VALUES ($1, $2, $3, $4)`,
          [projectId, targetId, assignmentRole, user.id]
        );
      }
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.assigned', $4::jsonb)`,
        [createId('audit'), user.id, projectId, JSON.stringify({ userId: targetId || null, assignmentRole })]
      );
    });
  }

  async function listActiveUsers(user) {
    assertConfigured();
    if (user.role !== 'admin') throw new Stage1Error('只有管理员可以查看账号列表。', 403, 'USER_LIST_FORBIDDEN');
    const result = await database.query(
      `SELECT id, display_name, email, role, status, created_at
       FROM app_users
       WHERE status = 'active'
       ORDER BY role, display_name, created_at`
    );
    return result.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      email: row.email || '',
      role: row.role,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  async function appendAuditEvents(events, actor = null) {
    assertConfigured();
    const items = Array.isArray(events) ? events : [events];
    if (!items.length) return 0;
    await database.transaction(async (client) => {
      for (const item of items.slice(0, 100)) {
        const event = safeObject(item);
        await client.query(
          `INSERT INTO audit_logs (id, actor_id, project_id, event_name, level, trace_id, step, payload, client)
           VALUES ($1, $2, (SELECT id FROM projects WHERE id = $3), $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
          [
            createId('audit'),
            actor?.id || null,
            String(event.projectId || event.project_id || '').slice(0, 120) || null,
            String(event.event || event.name || 'app.unknown').slice(0, 120),
            ['debug', 'info', 'warn', 'error'].includes(event.level) ? event.level : 'info',
            String(event.traceId || event.trace_id || '').slice(0, 120),
            String(event.step || '').slice(0, 120),
            JSON.stringify(safeObject(event.payload)),
            JSON.stringify(safeObject(event.client))
          ]
        );
      }
    });
    return Math.min(items.length, 100);
  }

  return {
    getSession,
    requireSession,
    requireProjectAccess,
    activateInvite,
    login,
    revokeSession,
    listProjects,
    listTrashedProjects,
    createProject,
    updateProject,
    trashProject,
    restoreProject,
    assignProject,
    listActiveUsers,
    appendAuditEvents
  };
}
