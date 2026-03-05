-- UP
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
UPDATE users SET role = 'admin', email = 'admin@admin.com', name = 'Admin',
  password_hash = '$2a$10$9fi4hkmbNa1r4g/we2Lv2uX4SkzqpPWcWY59wZ3hTBULaS1gXJj62',
  must_change_password = true
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- DOWN
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
