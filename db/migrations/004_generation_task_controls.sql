ALTER TABLE generation_tasks
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS generation_tasks_requester_daily_idx
  ON generation_tasks(requested_by, created_at DESC);

