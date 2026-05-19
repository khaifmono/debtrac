import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { comparePassword, generateToken, hashPassword } from '../_utils/auth';
import { authenticate } from '../_middleware/auth';

const router = new Hono<AppEnv>();

router.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, password_hash, must_change_password FROM users WHERE email = ?'
  ).bind(email).first<{
    id: string; email: string; name: string; role: string;
    password_hash: string; must_change_password: number;
  }>();

  if (!user) return c.json({ error: 'Invalid email or password' }, 401);

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid email or password' }, 401);

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user',
    mustChangePassword: user.must_change_password === 1,
  };
  const token = await generateToken(payload, c.env.JWT_SECRET);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password === 1,
    },
  });
});

router.get('/me', authenticate, async (c) => {
  const userId = c.get('user').userId;
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, role, must_change_password FROM users WHERE id = ?'
  ).bind(userId).first<{
    id: string; email: string; name: string; role: string; must_change_password: number;
  }>();

  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
  });
});

router.post('/change-password', authenticate, async (c) => {
  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current password and new password are required' }, 400);
  }
  if (newPassword.length < 6) {
    return c.json({ error: 'New password must be at least 6 characters' }, 400);
  }

  const userId = c.get('user').userId;
  const row = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(userId).first<{ password_hash: string }>();

  if (!row) return c.json({ error: 'User not found' }, 404);

  const valid = await comparePassword(currentPassword, row.password_hash);
  if (!valid) return c.json({ error: 'Current password is incorrect' }, 401);

  const newHash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?"
  ).bind(newHash, userId).run();

  const u = c.get('user');
  const token = await generateToken(
    { userId: u.userId, email: u.email, role: u.role, mustChangePassword: false },
    c.env.JWT_SECRET
  );
  return c.json({ token, message: 'Password changed successfully' });
});

const GOOGLE_REDIRECT_URI = 'https://debt.khaif.dev/api/auth/google/callback';

router.get('/google', (c) => {
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const errorParam = c.req.query('error');

  if (errorParam || !code) return c.redirect('/login?error=google_cancelled');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) return c.redirect('/login?error=google_failed');
    const { access_token } = await tokenRes.json<{ access_token: string }>();

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userInfoRes.ok) return c.redirect('/login?error=google_failed');
    const { email } = await userInfoRes.json<{ email: string }>();

    const user = await c.env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE email = ?'
    ).bind(email).first<{ id: string; email: string; name: string; role: string }>();

    if (!user) return c.redirect('/login?error=no_account');

    const token = await generateToken(
      { userId: user.id, email: user.email, role: user.role as 'admin' | 'user', mustChangePassword: false },
      c.env.JWT_SECRET
    );

    return c.redirect(`/?token=${encodeURIComponent(token)}`);
  } catch {
    return c.redirect('/login?error=google_failed');
  }
});

export default router;
