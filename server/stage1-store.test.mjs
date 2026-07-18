import assert from 'node:assert/strict';
import test from 'node:test';
import { createStage1Store, Stage1Error } from './stage1-store.mjs';

function createProjectDatabase(row) {
  return {
    configured: true,
    async query(sql) {
      if (sql.includes('FROM projects p')) {
        return row ? { rowCount: 1, rows: [row] } : { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    }
  };
}

const designer = { id: 'usr_design', role: 'designer' };
const operator = { id: 'usr_ops', role: 'operator' };
const admin = { id: 'usr_admin', role: 'admin' };

test('assigned designer can access a generation action', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_one',
    status: 'design',
    project_data: {},
    has_role_assignment: true
  }));
  const project = await store.requireProjectAccess(designer, 'prj_one', { allowedRoles: ['designer', 'admin'] });
  assert.equal(project.id, 'prj_one');
});

test('operator cannot access designer generation actions', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_one',
    status: 'review',
    project_data: {},
    has_role_assignment: true
  }));
  await assert.rejects(
    store.requireProjectAccess(operator, 'prj_one', { allowedRoles: ['designer', 'admin'] }),
    (error) => error instanceof Stage1Error && error.status === 403 && error.code === 'PROJECT_ACTION_FORBIDDEN'
  );
});

test('assigned operator cannot access a project before the designer submits it', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_draft',
    status: 'design',
    project_data: {},
    has_role_assignment: true
  }));
  await assert.rejects(
    store.requireProjectAccess(operator, 'prj_draft', { allowedRoles: ['operator', 'admin'] }),
    (error) => error instanceof Stage1Error && error.status === 404 && error.code === 'PROJECT_NOT_SUBMITTED_FOR_REVIEW'
  );
});

test('assigned operator can access a submitted review project', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_review',
    status: 'review',
    project_data: {},
    has_role_assignment: true
  }));
  const project = await store.requireProjectAccess(operator, 'prj_review', { allowedRoles: ['operator', 'admin'] });
  assert.equal(project.id, 'prj_review');
});

test('operator project list only queries submitted review-visible statuses', async () => {
  let queryText = '';
  const store = createStage1Store({
    configured: true,
    async query(sql) {
      queryText = sql;
      return { rowCount: 0, rows: [] };
    }
  });
  const projects = await store.listProjects(operator);
  assert.deepEqual(projects, []);
  assert.match(queryText, /assignment_role = 'operator'/);
  assert.match(queryText, /p\.status IN \('review', 'approved', 'exported'\)/);
});

test('unassigned member cannot access another project', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_two',
    status: 'review',
    project_data: {},
    has_role_assignment: false
  }));
  await assert.rejects(
    store.requireProjectAccess(operator, 'prj_two', { allowedRoles: ['operator', 'admin'] }),
    (error) => error instanceof Stage1Error && error.status === 403 && error.code === 'PROJECT_ACCESS_FORBIDDEN'
  );
});

test('admin can access an existing project without an assignment', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_three',
    status: 'review',
    project_data: {},
    has_role_assignment: false
  }));
  const project = await store.requireProjectAccess(admin, 'prj_three', { allowedRoles: ['admin'] });
  assert.equal(project.id, 'prj_three');
});

test('role-scoped administrator invites remain one-time use', async () => {
  const store = createStage1Store({
    configured: true,
    async transaction(callback) {
      return callback({
        async query(sql) {
          if (sql.includes('FROM invite_codes')) {
            return {
              rowCount: 1,
              rows: [{
                id: 'invite_admin_beta_01',
                role_scope: 'admin',
                status: 'active',
                uses: 1,
                max_uses: 1,
                expires_at: null
              }]
            };
          }
          throw new Error(`Unexpected query in test: ${sql}`);
        }
      });
    }
  });

  await assert.rejects(
    store.activateInvite({
      inviteHash: 'a'.repeat(64),
      displayName: 'Admin Tester',
      email: 'admin-tester@vistamz.test',
      requestedRole: 'admin',
      password: 'VistamzTest2026!'
    }),
    (error) => error instanceof Stage1Error && error.status === 403 && error.code === 'INVITE_UNAVAILABLE'
  );
});

test('export remains blocked until every planned slot has ops and final approval', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_four',
    status: 'review',
    has_role_assignment: false,
    project_data: {
      storyboardBriefs: [{ id: 1 }, { id: 2 }],
      reviewDecisions: [
        { slotId: 1, opsStatus: 'approved', finalStatus: 'approved' },
        { slotId: 2, opsStatus: 'approved', finalStatus: 'review' }
      ]
    }
  }));
  await assert.rejects(
    store.requireProjectAccess(admin, 'prj_four', { allowedRoles: ['admin'], requireApproved: true }),
    (error) => error instanceof Stage1Error && error.status === 409 && error.code === 'PROJECT_NOT_APPROVED'
  );
});

test('export is allowed after every planned slot is fully approved', async () => {
  const store = createStage1Store(createProjectDatabase({
    id: 'prj_five',
    status: 'approved',
    has_role_assignment: false,
    project_data: {
      storyboardBriefs: [{ id: 1 }, { id: 2 }],
      reviewDecisions: [
        { slotId: 1, opsStatus: 'approved', finalStatus: 'approved' },
        { slotId: 2, opsStatus: 'approved', finalStatus: 'approved' }
      ]
    }
  }));
  const project = await store.requireProjectAccess(admin, 'prj_five', { allowedRoles: ['admin'], requireApproved: true });
  assert.equal(project.id, 'prj_five');
});

test('designer cannot submit review until every planned slot has a usable image', async () => {
  const database = {
    configured: true,
    async query(sql) {
      if (sql.includes('FROM projects p')) {
        return {
          rowCount: 1,
          rows: [{
            id: 'prj_incomplete',
            project_name: 'Incomplete project',
            product_name: 'Product',
            sku: 'SKU-1',
            output_type: 'main-image',
            status: 'design',
            brand_snapshot: {},
            project_data: {},
            has_role_assignment: true
          }]
        };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    },
    async transaction() {
      throw new Error('transaction should not run for an incomplete submission');
    }
  };
  const store = createStage1Store(database);
  await assert.rejects(
    store.updateProject(designer, 'prj_incomplete', {
      projectName: 'Incomplete project',
      productName: 'Product',
      sku: 'SKU-1',
      outputType: 'main-image',
      status: 'review',
      brandSnapshot: {},
      projectData: {
        storyboardBriefs: [{ id: 1 }, { id: 2 }],
        generationRuns: [{ slotId: 1, verdict: 'usable' }]
      }
    }),
    (error) => error instanceof Stage1Error && error.status === 409 && error.code === 'PROJECT_REVIEW_SUBMISSION_INCOMPLETE'
  );
});

test('designer can submit review when every planned slot has a usable image', async () => {
  const writes = [];
  const database = {
    configured: true,
    async query(sql) {
      if (sql.includes('FROM projects p')) {
        return {
          rowCount: 1,
          rows: [{
            id: 'prj_complete',
            project_name: 'Complete project',
            product_name: 'Product',
            sku: 'SKU-2',
            output_type: 'main-image',
            status: 'design',
            brand_snapshot: {},
            project_data: {},
            has_role_assignment: true
          }]
        };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    },
    async transaction(callback) {
      return callback({
        async query(sql, params) {
          writes.push({ sql, params });
          return { rowCount: 1, rows: [] };
        }
      });
    }
  };
  const store = createStage1Store(database);
  const project = await store.updateProject(designer, 'prj_complete', {
    projectName: 'Complete project',
    productName: 'Product',
    sku: 'SKU-2',
    outputType: 'main-image',
    status: 'review',
    brandSnapshot: {},
    projectData: {
      storyboardBriefs: [{ id: 1 }, { id: 2 }],
      generationRuns: [
        { slotId: 1, verdict: 'usable' },
        { slotId: 2, verdict: 'usable' }
      ]
    }
  });
  assert.equal(project.status, 'review');
  assert.equal(writes.some((write) => write.sql.includes("'project.submitted_for_review'")), true);
});
