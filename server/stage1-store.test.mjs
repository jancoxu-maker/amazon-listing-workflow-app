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
