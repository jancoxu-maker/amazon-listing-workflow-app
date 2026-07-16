ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_before_delete TEXT;

CREATE INDEX IF NOT EXISTS projects_deleted_at_idx ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS projects_purge_after_idx ON projects(purge_after) WHERE deleted_at IS NOT NULL;
