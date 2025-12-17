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
    // TODO: Replace with actual user authentication
    const userId = '550e8400-e29b-41d4-a716-446655440000';

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
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

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
    if (!person_id || !person_name || !direction || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['owed_to_me', 'i_owe'].includes(direction)) {
      return res.status(400).json({ error: 'Invalid direction' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    const result = await query(
      `INSERT INTO debts (user_id, person_id, person_name, direction, amount, due_date, notes, remaining_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, person_id, person_name, direction, amount, due_date || null, notes || null, amount]
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
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

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
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

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

