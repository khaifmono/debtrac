-- UP
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

INSERT INTO settings (key, value) VALUES
  ('custom_message', ''),
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_username', ''),
  ('smtp_password', ''),
  ('smtp_from_email', ''),
  ('smtp_from_name', '');

-- DOWN
DROP TABLE IF EXISTS settings;
