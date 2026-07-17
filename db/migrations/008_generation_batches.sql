CREATE TABLE IF NOT EXISTS generation_batches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_batch_id TEXT NOT NULL,
  plan_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running',
  requested_by TEXT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT generation_batches_status_check
    CHECK (status IN ('running', 'completed', 'partial', 'failed', 'cancelled')),
  CONSTRAINT generation_batches_project_client_unique
    UNIQUE (project_id, client_batch_id)
);

ALTER TABLE generation_tasks
  ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES generation_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_no SMALLINT,
  ADD COLUMN IF NOT EXISTS reason_code TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS generation_tasks_batch_slot_idx
  ON generation_tasks(batch_id, slot_no)
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS generation_batches_project_recent_idx
  ON generation_batches(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS generation_tasks_batch_order_idx
  ON generation_tasks(batch_id, slot_no, created_at);
