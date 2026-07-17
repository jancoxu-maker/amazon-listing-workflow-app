import { randomUUID } from 'node:crypto';

function createTaskId() {
  return `task_${randomUUID().replace(/-/g, '')}`;
}

function taskRecord(row = {}) {
  const input = row.input_snapshot || {};
  return {
    id: row.id,
    projectId: row.project_id,
    slotId: row.slot_id,
    status: row.status,
    attemptCount: Number(row.attempt_count || 0),
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    output: row.output_snapshot || {},
    runId: String(input.runId || ''),
    batchId: String(input.batchId || ''),
    batchIndex: Number.isFinite(Number(input.batchIndex)) ? Number(input.batchIndex) : null,
    slotTitle: String(input.slotTitle || ''),
    clientTaskId: String(input.clientTaskId || ''),
    requestedBy: row.requested_by || '',
    requestedByName: row.requested_by_name || '',
    projectName: row.project_name || '',
    estimatedCostUsd: Number(row.estimated_cost_usd || 0),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createGenerationTaskStore(database, options = {}) {
  const dailyTaskLimit = Math.max(1, Number(options.dailyTaskLimit || process.env.GENERATION_DAILY_USER_LIMIT || 60));
  const estimatedCostPerCall = Math.max(0, Number(options.estimatedCostPerCall ?? process.env.GENERATION_ESTIMATED_IMAGE_COST_USD ?? 0.04));
  const createRetryAttempts = Math.max(1, Math.min(4, Number(options.createRetryAttempts || process.env.GENERATION_TASK_CREATE_RETRY_ATTEMPTS || 3)));

  function isRetryableTaskCreateError(error) {
    if (typeof database.isRetryableConnectionError === 'function') {
      return database.isRetryableConnectionError(error);
    }
    const message = String(error?.message || '').toLowerCase();
    return message.includes('query read timeout') || message.includes('connection timeout');
  }

  async function createTask(user, payload = {}) {
    const projectId = String(payload.projectId || '').trim();
    const slotId = String(payload.slotId || '').trim();
    const idempotencyKey = String(payload.clientTaskId || payload.runId || '').trim().slice(0, 180);
    const taskId = createTaskId();
    const createOnce = () => database.transaction(async (client) => {
      if (idempotencyKey) {
        const existing = await client.query(
          'SELECT * FROM generation_tasks WHERE project_id = $1 AND idempotency_key = $2 LIMIT 1',
          [projectId, idempotencyKey]
        );
        if (existing.rowCount) return taskRecord(existing.rows[0]);
      }
      const daily = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM generation_tasks
         WHERE requested_by = $1 AND created_at >= date_trunc('day', NOW())`,
        [user.id]
      );
      if (Number(daily.rows[0]?.count || 0) >= dailyTaskLimit) {
        const error = new Error(`今日生图任务已达到 ${dailyTaskLimit} 次上限，请明天继续或联系管理员。`);
        error.code = 'DAILY_GENERATION_LIMIT';
        error.status = 429;
        throw error;
      }
      const result = await client.query(
        `INSERT INTO generation_tasks
          (id, project_id, slot_id, task_type, status, requested_by, input_snapshot, idempotency_key)
         VALUES ($1, $2, $3, 'generate_image', 'queued', $4, $5::jsonb, $6)
         RETURNING *`,
        [taskId, projectId, slotId || '1', user.id, JSON.stringify(payload), idempotencyKey]
      );
      return taskRecord(result.rows[0]);
    });
    let lastError;
    for (let attempt = 1; attempt <= createRetryAttempts; attempt += 1) {
      try {
        return await createOnce();
      } catch (error) {
        lastError = error;
        // The unique idempotency key makes replay safe even when the first
        // transaction committed but its response was lost on the network.
        if (!idempotencyKey || attempt >= createRetryAttempts || !isRetryableTaskCreateError(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, Math.min(2500, 350 * (2 ** (attempt - 1)))));
      }
    }
    throw lastError;
  }

  async function getTask(taskId, projectId) {
    const result = await database.query(
      'SELECT * FROM generation_tasks WHERE id = $1 AND project_id = $2 LIMIT 1',
      [taskId, projectId]
    );
    return result.rowCount ? taskRecord(result.rows[0]) : null;
  }

  async function listProjectTasks(projectId, limit = 50) {
    const result = await database.query(
      `SELECT * FROM generation_tasks
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [projectId, Math.min(100, Math.max(1, Number(limit || 50)))]
    );
    return result.rows.map(taskRecord);
  }

  async function listAdminTasks(limit = 100) {
    const result = await database.query(
      `SELECT gt.*, u.display_name AS requested_by_name, p.project_name
       FROM generation_tasks gt
       LEFT JOIN app_users u ON u.id = gt.requested_by
       LEFT JOIN projects p ON p.id = gt.project_id
       ORDER BY
         CASE gt.status WHEN 'failed' THEN 0 WHEN 'running' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END,
         gt.updated_at DESC
       LIMIT $1`,
      [Math.min(250, Math.max(1, Number(limit || 100)))]
    );
    return result.rows.map(taskRecord);
  }

  async function getAdminSummary() {
    const result = await database.query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('queued', 'running'))::int AS active_count,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::int AS today_count,
         COALESCE(SUM(estimated_cost_usd) FILTER (WHERE created_at >= date_trunc('day', NOW())), 0) AS today_cost_usd
       FROM generation_tasks`
    );
    const row = result.rows[0] || {};
    return {
      activeCount: Number(row.active_count || 0),
      failedCount: Number(row.failed_count || 0),
      todayCount: Number(row.today_count || 0),
      todayCostUsd: Number(row.today_cost_usd || 0)
    };
  }

  async function cancelTask(taskId, projectId, user) {
    const result = await database.query(
      `UPDATE generation_tasks
       SET status = 'cancelled', cancelled_at = NOW(), finished_at = NOW(), lease_until = NULL, updated_at = NOW(),
           error_code = 'CANCELLED_BY_USER', error_message = $4
       WHERE id = $1 AND project_id = $2 AND status IN ('queued', 'running')
         AND ($3 = 'admin' OR requested_by = $5)
       RETURNING *`,
      [taskId, projectId, user.role, `Cancelled by ${user.role}`, user.id]
    );
    return result.rowCount ? taskRecord(result.rows[0]) : null;
  }

  async function claimNextTask() {
    return database.transaction(async (client) => {
      const result = await client.query(
        `WITH candidate AS (
           SELECT id FROM generation_tasks
           WHERE task_type = 'generate_image'
             AND status = 'queued'
             AND next_attempt_at <= NOW()
             AND attempt_count < 3
             AND NOT EXISTS (
               SELECT 1 FROM generation_tasks running
               WHERE running.project_id = generation_tasks.project_id
                 AND running.status = 'running'
             )
             AND NOT EXISTS (
               SELECT 1 FROM generation_tasks earlier
               WHERE COALESCE(earlier.input_snapshot->>'batchId', '') <> ''
                 AND earlier.input_snapshot->>'batchId' = generation_tasks.input_snapshot->>'batchId'
                 AND COALESCE((earlier.input_snapshot->>'batchIndex')::int, 2147483647)
                     < COALESCE((generation_tasks.input_snapshot->>'batchIndex')::int, 2147483647)
                 AND earlier.status IN ('queued', 'running')
             )
           ORDER BY created_at ASC,
             COALESCE((input_snapshot->>'batchIndex')::int, 2147483647) ASC,
             id ASC
           FOR UPDATE SKIP LOCKED
           LIMIT 1
         )
         UPDATE generation_tasks t
         SET status = 'running',
             attempt_count = attempt_count + 1,
             started_at = COALESCE(started_at, NOW()),
             lease_until = NOW() + INTERVAL '8 minutes',
             updated_at = NOW(),
             error_code = '',
             error_message = ''
         FROM candidate
         WHERE t.id = candidate.id
         RETURNING t.*`
      );
      if (!result.rowCount) return null;
      return { ...taskRecord(result.rows[0]), input: result.rows[0].input_snapshot || {} };
    });
  }

  async function succeedTask(taskId, output, estimatedCostUsd = estimatedCostPerCall) {
    await database.query(
      `UPDATE generation_tasks
       SET status = 'succeeded', output_snapshot = $2::jsonb, finished_at = NOW(), lease_until = NULL, updated_at = NOW(),
           estimated_cost_usd = estimated_cost_usd + $3
       WHERE id = $1 AND status = 'running'`,
      [taskId, JSON.stringify(output || {}), Math.max(0, Number(estimatedCostUsd || 0))]
    );
  }

  async function failTask(taskId, error, attemptCount, estimatedCostUsd = estimatedCostPerCall) {
    const terminal = Number(attemptCount || 0) >= 3;
    await database.query(
      `UPDATE generation_tasks
       SET status = $2,
           error_code = $3,
           error_message = $4,
           next_attempt_at = NOW() + ($5 * INTERVAL '1 second'),
           finished_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE NULL END,
           lease_until = NULL,
           estimated_cost_usd = estimated_cost_usd + $6,
           updated_at = NOW()
       WHERE id = $1 AND status = 'running'`,
      [
        taskId,
        terminal ? 'failed' : 'queued',
        String(error?.code || 'GENERATION_FAILED').slice(0, 120),
        String(error instanceof Error ? error.message : error || 'Generation failed').slice(0, 2000),
        Math.min(30, Math.max(2, 2 ** Number(attemptCount || 1))),
        Math.max(0, Number(estimatedCostUsd || 0))
      ]
    );
  }

  async function recoverExpiredTasks() {
    const result = await database.query(
      `UPDATE generation_tasks
       SET status = 'queued', lease_until = NULL, next_attempt_at = NOW(), updated_at = NOW(),
           error_code = 'WORKER_LEASE_EXPIRED', error_message = 'Generation worker stopped before completing the task.'
       WHERE status = 'running' AND lease_until < NOW()
       RETURNING id`
    );
    return result.rowCount;
  }

  return {
    dailyTaskLimit,
    estimatedCostPerCall,
    createTask,
    getTask,
    listProjectTasks,
    listAdminTasks,
    getAdminSummary,
    cancelTask,
    claimNextTask,
    succeedTask,
    failTask,
    recoverExpiredTasks
  };
}
