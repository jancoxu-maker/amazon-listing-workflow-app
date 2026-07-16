CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_profile_versions (
  brand_id TEXT NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (brand_id, version)
);

CREATE INDEX IF NOT EXISTS brand_profiles_status_idx ON brand_profiles(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS brand_profile_versions_created_idx ON brand_profile_versions(brand_id, created_at DESC);
