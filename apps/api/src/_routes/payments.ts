import { Hono } from 'hono';
import type { AppEnv } from '../_types';
import { authenticate } from '../_middleware/auth';

const router = new Hono<AppEnv>();
router.use('*', authenticate);

async function syncDebtStatus(db: D1Database, debtId: string): Promise<void> {
  const row = await db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE debt_id = ?'
  ).bind(debtId).first<{ total: number }>();
  const totalPaid = row?.total ?? 0;

  const debt = await db.prepare('SELECT amount FROM debts WHERE id = ?')
    .bind(debtId).first<{ amount: number }>();
  if (!debt) return;

  const remaining = Math.max(debt.amount - totalPaid, 0);
  const status = remaining <= 0 ? 'settled' : totalPaid > 0 ? 'partially_paid' : 'unpaid';

  await db.prepare(
    "UPDATE debts SET remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(remaining, status, debtId).run();
}

router.get('/debt/:debtId', async (c) => {
  const userId = c.get('user').userId;
  const { debtId } = c.req.param();

  const debt = await c.env.DB.prepare(
    'SELECT id FROM debts WHERE id = ? AND user_id = ?'
  ).bind(debtId, userId).first();
  if (!debt) return c.json({ error: 'Debt not found' }, 404);

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM payments WHERE debt_id = ? ORDER BY date DESC, created_at DESC'
  ).bind(debtId).all();
  return c.json(results);
});

router.get('/:id', async (c) => {
  const userId = c.get('user').userId;
  const payment = await c.env.DB.prepare(
    'SELECT p.* FROM payments p JOIN debts d ON p.debt_id = d.id WHERE p.id = ? AND d.user_id = ?'
  ).bind(c.req.param('id'), userId).first();
  if (!payment) return c.json({ error: 'Payment not found' }, 404);
  return c.json(payment);
});

router.post('/', async (c) => {
  const { debt_id, amount, date, note } = await c.req.json();
  const userId = c.get('user').userId;

  if (!debt_id || !amount) return c.json({ error: 'Missing required fields' }, 400);
  if (amount <= 0) return c.json({ error: 'Amount must be greater than 0' }, 400);

  const debt = await c.env.DB.prepare(
    'SELECT remaining_amount FROM debts WHERE id = ? AND user_id = ?'
  ).bind(debt_id, userId).first<{ remaining_amount: number }>();
  if (!debt) return c.json({ error: 'Debt not found' }, 404);

  if (amount > debt.remaining_amount) {
    return c.json({
      error: `Payment amount (${amount}) cannot exceed remaining amount (${debt.remaining_amount})`
    }, 400);
  }

  let paymentDate = new Date().toISOString().split('T')[0];
  if (date) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return c.json({ error: 'Invalid date format' }, 400);
    paymentDate = parsed.toISOString().split('T')[0];
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO payments (id, debt_id, amount, date, note) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, debt_id, amount, paymentDate, note || null).run();

  await syncDebtStatus(c.env.DB, debt_id);

  const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
  return c.json(payment, 201);
});

router.put('/:id', async (c) => {
  const userId = c.get('user').userId;
  const { amount, date, note } = await c.req.json();

  if (amount !== undefined && amount <= 0) {
    return c.json({ error: 'Amount must be greater than 0' }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT p.*, d.remaining_amount + p.amount as max_amount, p.debt_id
     FROM payments p JOIN debts d ON p.debt_id = d.id
     WHERE p.id = ? AND d.user_id = ?`
  ).bind(c.req.param('id'), userId).first<{
    id: string; amount: number; date: string; note: string | null;
    max_amount: number; debt_id: string;
  }>();
  if (!existing) return c.json({ error: 'Payment not found' }, 404);

  if (amount !== undefined && amount > existing.max_amount) {
    return c.json({
      error: `Payment amount (${amount}) cannot exceed remaining amount (${existing.max_amount})`
    }, 400);
  }

  let paymentDate = existing.date;
  if (date) {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return c.json({ error: 'Invalid date format' }, 400);
    paymentDate = parsed.toISOString().split('T')[0];
  }

  await c.env.DB.prepare(
    'UPDATE payments SET amount = ?, date = ?, note = ? WHERE id = ?'
  ).bind(
    amount !== undefined ? amount : existing.amount,
    paymentDate,
    note !== undefined ? note : existing.note,
    c.req.param('id')
  ).run();

  await syncDebtStatus(c.env.DB, existing.debt_id);

  const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(payment);
});

router.delete('/:id', async (c) => {
  const userId = c.get('user').userId;

  const existing = await c.env.DB.prepare(
    'SELECT p.id, p.debt_id FROM payments p JOIN debts d ON p.debt_id = d.id WHERE p.id = ? AND d.user_id = ?'
  ).bind(c.req.param('id'), userId).first<{ id: string; debt_id: string }>();
  if (!existing) return c.json({ error: 'Payment not found' }, 404);

  await c.env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(c.req.param('id')).run();
  await syncDebtStatus(c.env.DB, existing.debt_id);

  return new Response(null, { status: 204 });
});

export default router;
