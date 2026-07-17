import assert from 'node:assert/strict';
import test from 'node:test';
import { createGenerationTaskStore } from './generation-task-store.mjs';

function taskRow(overrides = {}) {
  return {
    id: 'task_one',
    project_id: 'prj_one',
    slot_id: '1',
    status: 'queued',
    attempt_count: 0,
    input_snapshot: { runId: 'run_one', slotTitle: 'Main Image' },
    output_snapshot: {},
    created_at: new Date('2026-07-14T01:00:00Z'),
    updated_at: new Date('2026-07-14T01:00:00Z'),
    ...overrides
  };
}

test('idempotent generation request returns the existing task before charging quota', async () => {
  let queryCount = 0;
  const database = {
    async transaction(handler) {
      return handler({
        async query(sql) {
          queryCount += 1;
          assert.match(sql, /idempotency_key/);
          return { rowCount: 1, rows: [taskRow()] };
        }
      });
    }
  };
  const store = createGenerationTaskStore(database, { dailyTaskLimit: 1 });
  const task = await store.createTask(
    { id: 'usr_design', role: 'designer' },
    { projectId: 'prj_one', slotId: '1', clientTaskId: 'same-request' }
  );
  assert.equal(task.id, 'task_one');
  assert.equal(queryCount, 1);
});

test('task creation safely retries a transient timeout with the same idempotency key', async () => {
  let transactionCount = 0;
  const database = {
    isRetryableConnectionError(error) {
      return String(error?.message || '').includes('Query read timeout');
    },
    async transaction(handler) {
      transactionCount += 1;
      if (transactionCount === 1) throw new Error('Query read timeout');
      return handler({
        async query(sql) {
          assert.match(sql, /idempotency_key/);
          return {
            rowCount: 1,
            rows: [taskRow({
              input_snapshot: {
                runId: 'run_batch',
                slotTitle: 'Main Image',
                batchId: 'batch_one',
                batchIndex: 1
              }
            })]
          };
        }
      });
    }
  };
  const task = await createGenerationTaskStore(database, { createRetryAttempts: 2 }).createTask(
    { id: 'usr_design', role: 'designer' },
    { projectId: 'prj_one', slotId: '1', clientTaskId: 'stable-request' }
  );
  assert.equal(transactionCount, 2);
  assert.equal(task.batchId, 'batch_one');
  assert.equal(task.batchIndex, 1);
});

test('daily generation quota rejects a new task with a stable error code', async () => {
  const database = {
    async transaction(handler) {
      return handler({
        async query(sql) {
          assert.match(sql, /COUNT\(\*\)/);
          return { rowCount: 1, rows: [{ count: 3 }] };
        }
      });
    }
  };
  const store = createGenerationTaskStore(database, { dailyTaskLimit: 3 });
  await assert.rejects(
    store.createTask(
      { id: 'usr_design', role: 'designer' },
      { projectId: 'prj_one', slotId: '1' }
    ),
    (error) => error.status === 429 && error.code === 'DAILY_GENERATION_LIMIT'
  );
});

test('task cancellation is limited to queued or running tasks owned by the designer', async () => {
  let capturedSql = '';
  let capturedValues = [];
  const database = {
    async query(sql, values) {
      capturedSql = sql;
      capturedValues = values;
      return { rowCount: 1, rows: [taskRow({ status: 'cancelled' })] };
    }
  };
  const store = createGenerationTaskStore(database);
  const task = await store.cancelTask('task_one', 'prj_one', { id: 'usr_design', role: 'designer' });
  assert.equal(task.status, 'cancelled');
  assert.match(capturedSql, /status IN \('queued', 'running'\)/);
  assert.match(capturedSql, /requested_by = \$5/);
  assert.deepEqual(capturedValues.slice(0, 3), ['task_one', 'prj_one', 'designer']);
});

test('a late worker failure cannot overwrite a task that was already cancelled', async () => {
  let capturedSql = '';
  let capturedValues = [];
  const database = {
    async query(sql, values) {
      capturedSql = sql;
      capturedValues = values;
      return { rowCount: 0, rows: [] };
    }
  };
  const store = createGenerationTaskStore(database);
  await store.failTask('task_one', new Error('provider timeout'), 1, 0.12);
  assert.match(capturedSql, /WHERE id = \$1 AND status = 'running'/);
  assert.equal(capturedValues[5], 0.12);
});

test('claiming work keeps one active generation task per project', async () => {
  let capturedSql = '';
  const database = {
    async transaction(handler) {
      return handler({
        async query(sql) {
          capturedSql = sql;
          return { rowCount: 0, rows: [] };
        }
      });
    }
  };
  const store = createGenerationTaskStore(database);
  assert.equal(await store.claimNextTask(), null);
  assert.match(capturedSql, /NOT EXISTS/);
  assert.match(capturedSql, /running\.project_id = generation_tasks\.project_id/);
  assert.match(capturedSql, /batchIndex/);
  assert.match(capturedSql, /INTERVAL '8 minutes'/);
});

test('admin task summary reports active, failed, daily usage, and estimated cost', async () => {
  const database = {
    async query(sql) {
      assert.match(sql, /today_cost_usd/);
      return { rows: [{ active_count: 2, failed_count: 1, today_count: 7, today_cost_usd: '0.2800' }] };
    }
  };
  const summary = await createGenerationTaskStore(database).getAdminSummary();
  assert.deepEqual(summary, { activeCount: 2, failedCount: 1, todayCount: 7, todayCostUsd: 0.28 });
});
