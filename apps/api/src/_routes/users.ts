import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { authenticate, requireAdmin } from '../_middleware/auth';
import { hashPassword } from '../_utils/auth';
import { sendEmail, inviteEmailHtml } from '../_utils/email';

const router = new Hono<AppEnv>();
router.use('*', authenticate, requireAdmin);

router.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, name, role, must_change_password, created_at FROM users ORDER BY created_at ASC'
  ).all();
  return c.json(results);
});

router.post('/', async (c) => {
  const { email, name, role } = await c.req.json();
  if (!email || !name) return c.json({ error: 'Email and name are required' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'A user with this email already exists' }, 409);

  const passwordHash = await hashPassword('changeme');
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, role, password_hash, must_change_password) VALUES (?, ?, ?, ?, ?, 1)'
  ).bind(id, email, name, role || 'user', passwordHash).run();

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, must_change_password, created_at FROM users WHERE id = ?'
  ).bind(id).first();

  // Send invite email if Brevo is configured
  try {
    const brevoKey = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'brevo_api_key'").first<{ value: string }>();
    const fromEmail = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'brevo_from_email'").first<{ value: string }>();
    const fromName = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'brevo_from_name'").first<{ value: string }>();
    if (brevoKey?.value && fromEmail?.value) {
      await sendEmail({
        to: { email, name },
        subject: 'You\'ve been invited to Debtrac',
        html: inviteEmailHtml(name, email, 'changeme', 'https://debt.khaif.dev'),
        fromEmail: fromEmail.value,
        fromName: fromName?.value || 'Debtrac',
        apiKey: brevoKey.value,
      });
    }
  } catch (err) {
    console.error('Failed to send invite email:', err);
    // Don't fail the request if email fails
  }

  return c.json(user, 201);
});

router.put('/:id/role', async (c) => {
  const { role } = await c.req.json();
  if (!role || !['admin', 'user'].includes(role)) {
    return c.json({ error: 'Invalid role. Must be "admin" or "user"' }, 400);
  }
  if (c.req.param('id') === c.get('user').userId) {
    return c.json({ error: 'Cannot change your own role' }, 400);
  }

  const result = await c.env.DB.prepare(
    "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(role, c.req.param('id')).run();
  if (result.meta.changes === 0) return c.json({ error: 'User not found' }, 404);

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, must_change_password, created_at FROM users WHERE id = ?'
  ).bind(c.req.param('id')).first();
  return c.json(user);
});

router.delete('/:id', async (c) => {
  if (c.req.param('id') === c.get('user').userId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }
  const result = await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.req.param('id')).run();
  if (result.meta.changes === 0) return c.json({ error: 'User not found' }, 404);
  return new Response(null, { status: 204 });
});

router.post('/test-email', async (c) => {
  const { brevoKey, fromEmail, fromName, toEmail } = await c.req.json();
  if (!brevoKey || !fromEmail || !toEmail) {
    return c.json({ error: 'brevoKey, fromEmail, and toEmail are required' }, 400);
  }
  await sendEmail({
    to: { email: toEmail },
    subject: 'Debtrac — Email test',
    html: '<p>This is a test email from Debtrac. Your email configuration is working correctly.</p>',
    fromEmail,
    fromName: fromName || 'Debtrac',
    apiKey: brevoKey,
  });
  return c.json({ ok: true });
});

export default router;
