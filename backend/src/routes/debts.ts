import { Router, Request, Response } from 'express';
import { query } from '../database';

const router = Router();

// Types for request/response
interface Debt {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  direction: 'owed_to_me' | 'i_owe';
  amount: number;
  status: 'unpaid' | 'partially_paid' | 'settled';
  due_date: string | null;
  notes: string | null;
  created_at: string;
  remaining_amount: number;
}

interface CreateDebtRequest {
  person_id: string;
  person_name: string;
  direction: 'owed_to_me' | 'i_owe';
  amount: number;
  due_date?: string;
  notes?: string;
}

// Get all debts for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      'SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific debt by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await query(
      'SELECT * FROM debts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new debt
router.post('/', async (req: Request, res: Response) => {
  try {
    const { person_id, person_name, direction, amount, due_date, notes }: CreateDebtRequest = req.body;

    // Validate required fields
    if (!person_name || !direction || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['owed_to_me', 'i_owe'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const userId = req.user!.userId;

    // Auto-create person if person_id not provided
    let resolvedPersonId = person_id;
    if (!resolvedPersonId && person_name) {
      const existing = await query(
        'SELECT id FROM people WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
        [userId, person_name.trim()]
      );
      if (existing.rows.length > 0) {
        resolvedPersonId = existing.rows[0].id;
      } else {
        const created = await query(
          'INSERT INTO people (user_id, name) VALUES ($1, $2) RETURNING id',
          [userId, person_name.trim()]
        );
        resolvedPersonId = created.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO debts (user_id, person_id, person_name, direction, amount, due_date, notes, remaining_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, resolvedPersonId, person_name, direction, amount, due_date || null, notes || null, amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a debt
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user!.userId;

    // Validate status if provided
    if (status && !['unpaid', 'partially_paid', 'settled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      'UPDATE debts SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [status, notes, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a debt
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await query('DELETE FROM debts WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

