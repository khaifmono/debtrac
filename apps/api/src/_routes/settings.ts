import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { authenticate, requireAdmin } from '../_middleware/auth';

const router = new Hono<AppEnv>();
router.use('*', authenticate, requireAdmin);

const ALLOWED_KEYS = [
  'custom_message', 'brevo_api_key', 'brevo_from_email', 'brevo_from_name',
];

router.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT key, value FROM settings ORDER BY key'
  ).all<{ key: string; value: string }>();
  const obj: Record<string, string> = {};
  for (const row of results) obj[row.key] = row.value;
  return c.json(obj);
});

router.put('/', async (c) => {
  const updates = await c.req.json<Record<string, string>>();
  const keys = Object.keys(updates);
  if (keys.length === 0) return c.json({ error: 'No settings provided' }, 400);

  const invalid = keys.filter((k) => !ALLOWED_KEYS.includes(k));
  if (invalid.length > 0) return c.json({ error: `Unknown settings keys: ${invalid.join(', ')}` }, 400);

  const userId = c.get('user').userId;
  const stmts = keys.map((key) =>
    c.env.DB.prepare(
      `INSERT INTO settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
    ).bind(key, updates[key], userId)
  );
  await c.env.DB.batch(stmts);

  const { results } = await c.env.DB.prepare(
    'SELECT key, value FROM settings ORDER BY key'
  ).all<{ key: string; value: string }>();
  const obj: Record<string, string> = {};
  for (const row of results) obj[row.key] = row.value;
  return c.json(obj);
});

export default router;
