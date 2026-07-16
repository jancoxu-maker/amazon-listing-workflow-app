ALTER TABLE generation_tasks
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS generation_tasks_idempotency_idx
  ON generation_tasks(project_id, idempotency_key)
  WHERE idempotency_key <> '';

CREATE INDEX IF NOT EXISTS generation_tasks_queue_idx
  ON generation_tasks(status, next_attempt_at, created_at);
