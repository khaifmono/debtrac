import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { authenticate } from '../_middleware/auth';

const router = new Hono<AppEnv>();
router.use('*', authenticate);

router.get('/', async (c) => {
  const userId = c.get('user').userId;
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();
  return c.json(results);
});

router.get('/:id', async (c) => {
  const userId = c.get('user').userId;
  const debt = await c.env.DB.prepare(
    'SELECT * FROM debts WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), userId).first();
  if (!debt) return c.json({ error: 'Debt not found' }, 404);
  return c.json(debt);
});

router.post('/', async (c) => {
  const { person_id, person_name, phone, direction, amount, due_date, notes } = await c.req.json();

  if (!person_name || !direction || !amount) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  if (!['owed_to_me', 'i_owe'].includes(direction)) {
    return c.json({ error: 'Invalid direction' }, 400);
  }
  if (amount <= 0) {
    return c.json({ error: 'Amount must be greater than 0' }, 400);
  }

  const userId = c.get('user').userId;
  const db = c.env.DB;

  let resolvedPersonId = person_id;
  if (!resolvedPersonId && person_name) {
    const existing = await db.prepare(
      'SELECT id FROM people WHERE user_id = ? AND lower(name) = lower(?)'
    ).bind(userId, person_name.trim()).first<{ id: string }>();

    if (existing) {
      resolvedPersonId = existing.id;
      if (phone?.trim()) {
        await db.prepare("UPDATE people SET phone = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(phone.trim(), resolvedPersonId).run();
      }
    } else {
      const newId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO people (id, user_id, name, phone) VALUES (?, ?, ?, ?)'
      ).bind(newId, userId, person_name.trim(), phone?.trim() || null).run();
      resolvedPersonId = newId;
    }
  }

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO debts (id, user_id, person_id, person_name, direction, amount, due_date, notes, remaining_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, resolvedPersonId, person_name, direction, amount, due_date || null, notes || null, amount).run();

  const debt = await db.prepare('SELECT * FROM debts WHERE id = ?').bind(id).first();
  return c.json(debt, 201);
});

router.put('/:id', async (c) => {
  const userId = c.get('user').userId;
  const { status, notes } = await c.req.json();

  if (status && !['unpaid', 'partially_paid', 'settled'].includes(status)) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT * FROM debts WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), userId).first<{ id: string; status: string; notes: string }>();
  if (!existing) return c.json({ error: 'Debt not found' }, 404);

  await c.env.DB.prepare(
    "UPDATE debts SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).bind(status ?? existing.status, notes ?? existing.notes, c.req.param('id'), userId).run();

  const debt = await c.env.DB.prepare('SELECT * FROM debts WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(debt);
});

router.delete('/:id', async (c) => {
  const userId = c.get('user').userId;
  const result = await c.env.DB.prepare(
    'DELETE FROM debts WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), userId).run();

  if (result.meta.changes === 0) return c.json({ error: 'Debt not found' }, 404);
  return new Response(null, { status: 204 });
});

export default router;
