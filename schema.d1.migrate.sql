-- Remove old SMTP settings, add Brevo settings
DELETE FROM settings WHERE key IN ('smtp_host','smtp_port','smtp_username','smtp_password','smtp_from_email','smtp_from_name');
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('brevo_api_key', ''),
  ('brevo_from_email', ''),
  ('brevo_from_name', 'Debtrac');
