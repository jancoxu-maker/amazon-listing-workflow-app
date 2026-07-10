import { createHash, randomBytes, randomUUID } from 'node:crypto';

const MEMBER_ROLES = new Set(['designer', 'operator']);
const ALL_ROLES = new Set(['designer', 'operator', 'admin']);
const SESSION_DAYS = Math.max(1, Number(process.env.AUTH_SESSION_DAYS || 14));

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

function userRecord(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email || '',
    role: row.role,
    status: row.status
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
      SELECT s.id AS session_id, s.expires_at, u.id, u.display_name, u.email, u.role, u.status
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

  async function activateInvite({ inviteHash, displayName, email, requestedRole }) {
    assertConfigured();
    const codeHash = String(inviteHash || '').trim().toLowerCase();
    const name = normalizeName(displayName);
    const normalizedEmail = normalizeEmail(email);
    if (!/^[a-f0-9]{64}$/.test(codeHash)) {
      throw new Stage1Error('邀请码格式无效。', 400, 'INVALID_INVITE');
    }
    if (name.length < 2) {
      throw new Stage1Error('请输入至少 2 个字符的姓名。', 400, 'DISPLAY_NAME_REQUIRED');
    }

    return database.transaction(async (client) => {
      const inviteResult = await client.query('SELECT * FROM invite_codes WHERE code_hash = $1 FOR UPDATE', [codeHash]);
      const invite = inviteResult.rows[0];
      if (!invite || invite.status !== 'active' || invite.uses >= invite.max_uses || (invite.expires_at && new Date(invite.expires_at) <= new Date())) {
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
      await client.query(
        'INSERT INTO app_users (id, email, display_name, role) VALUES ($1, $2, $3, $4)',
        [userId, normalizedEmail || null, name, allowedRole]
      );
      await client.query('UPDATE invite_codes SET uses = uses + 1, updated_at = NOW() WHERE id = $1', [invite.id]);
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
        user: { id: userId, displayName: name, email: normalizedEmail, role: allowedRole, status: 'active' }
      };
    });
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

    return { id: projectId, projectName, outputType, status: 'draft' };
  }

  async function assignProject(user, projectId, { userId, assignmentRole }) {
    assertConfigured();
    if (user.role !== 'admin') throw new Stage1Error('只有管理员可以分配项目。', 403, 'PROJECT_ASSIGN_FORBIDDEN');
    if (!MEMBER_ROLES.has(assignmentRole)) throw new Stage1Error('分配身份必须是设计师或运营。', 400, 'INVALID_ASSIGNMENT_ROLE');
    const targetUser = await database.query('SELECT id, role, status FROM app_users WHERE id = $1 LIMIT 1', [String(userId || '')]);
    if (!targetUser.rowCount || targetUser.rows[0].status !== 'active' || targetUser.rows[0].role !== assignmentRole) {
      throw new Stage1Error('无法分配给该用户，请确认身份和账号状态。', 400, 'INVALID_ASSIGNEE');
    }
    const project = await database.query('SELECT id FROM projects WHERE id = $1 LIMIT 1', [projectId]);
    if (!project.rowCount) throw new Stage1Error('项目不存在。', 404, 'PROJECT_NOT_FOUND');
    await database.transaction(async (client) => {
      await client.query(
        `INSERT INTO project_assignments (project_id, user_id, assignment_role, assigned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (project_id, user_id, assignment_role) DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW()`,
        [projectId, userId, assignmentRole, user.id]
      );
      await client.query(
        `INSERT INTO audit_logs (id, actor_id, project_id, event_name, payload)
         VALUES ($1, $2, $3, 'project.assigned', $4::jsonb)`,
        [createId('audit'), user.id, projectId, JSON.stringify({ userId, assignmentRole })]
      );
    });
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
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
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
    activateInvite,
    revokeSession,
    listProjects,
    createProject,
    assignProject,
    appendAuditEvents
  };
}
