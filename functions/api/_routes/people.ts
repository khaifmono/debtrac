import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { authenticate } from '../_middleware/auth';

const router = new Hono<AppEnv>();
router.use('*', authenticate);

router.get('/', async (c) => {
  const userId = c.get('user').userId;
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM people WHERE user_id = ? ORDER BY name'
  ).bind(userId).all();
  return c.json(results);
});

router.get('/:id', async (c) => {
  const userId = c.get('user').userId;
  const person = await c.env.DB.prepare(
    'SELECT * FROM people WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), userId).first();
  if (!person) return c.json({ error: 'Person not found' }, 404);
  return c.json(person);
});

router.post('/', async (c) => {
  const { name, phone } = await c.req.json();
  if (!name?.trim()) return c.json({ error: 'Name is required' }, 400);

  const userId = c.get('user').userId;
  const existing = await c.env.DB.prepare(
    'SELECT id FROM people WHERE user_id = ? AND lower(name) = lower(?)'
  ).bind(userId, name.trim()).first();
  if (existing) return c.json({ error: 'A person with this name already exists' }, 409);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO people (id, user_id, name, phone) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, name.trim(), phone?.trim() || null).run();

  const person = await c.env.DB.prepare('SELECT * FROM people WHERE id = ?').bind(id).first();
  return c.json(person, 201);
});

router.put('/:id', async (c) => {
  const userId = c.get('user').userId;
  const { name, phone } = await c.req.json();
  if (!name?.trim()) return c.json({ error: 'Name is required' }, 400);

  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM people WHERE user_id = ? AND lower(name) = lower(?) AND id != ?'
  ).bind(userId, name.trim(), c.req.param('id')).first();
  if (duplicate) return c.json({ error: 'A person with this name already exists' }, 409);

  const result = await c.env.DB.prepare(
    "UPDATE people SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).bind(name.trim(), phone?.trim() || null, c.req.param('id'), userId).run();

  if (result.meta.changes === 0) return c.json({ error: 'Person not found' }, 404);

  const person = await c.env.DB.prepare('SELECT * FROM people WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(person);
});

router.delete('/:id', async (c) => {
  const userId = c.get('user').userId;
  const result = await c.env.DB.prepare(
    'DELETE FROM people WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), userId).run();
  if (result.meta.changes === 0) return c.json({ error: 'Person not found' }, 404);
  return new Response(null, { status: 204 });
});

export default router;
