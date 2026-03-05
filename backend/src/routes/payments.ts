import { Router, Request, Response } from 'express';
import { query } from '../database';

const router = Router();

// Types for request/response
interface Payment {
  id: string;
  debt_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

interface CreatePaymentRequest {
  debt_id: string;
  amount: number;
  date?: string;
  note?: string;
}

// Get payments for a specific debt
router.get('/debt/:debtId', async (req: Request, res: Response) => {
  try {
    const { debtId } = req.params;
    const userId = req.user!.userId;

    // First check if the debt belongs to the user
    const debtCheck = await query(
      'SELECT id FROM debts WHERE id = $1 AND user_id = $2',
      [debtId, userId]
    );

    if (debtCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    const result = await query(
      'SELECT * FROM payments WHERE debt_id = $1 ORDER BY date DESC, created_at DESC',
      [debtId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific payment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Get payment with debt ownership check
    const result = await query(`
      SELECT p.* FROM payments p
      JOIN debts d ON p.debt_id = d.id
      WHERE p.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { debt_id, amount, date, note }: CreatePaymentRequest = req.body;
    const userId = req.user!.userId;

    // Validate required fields
    if (!debt_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if the debt belongs to the user and get current remaining amount
    const debtResult = await query(
      'SELECT remaining_amount FROM debts WHERE id = $1 AND user_id = $2',
      [debt_id, userId]
    );

    if (debtResult.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }

    const remainingAmount = debtResult.rows[0].remaining_amount;

    // Check if payment amount exceeds remaining amount
    if (amount > remainingAmount) {
      return res.status(400).json({
        error: `Payment amount (${amount}) cannot exceed remaining amount (${remainingAmount})`
      });
    }

    // Parse and validate date
    let paymentDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      paymentDate = parsedDate;
    }

    const result = await query(
      'INSERT INTO payments (debt_id, amount, date, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [debt_id, amount, paymentDate.toISOString().split('T')[0], note || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a payment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, date, note } = req.body;
    const userId = req.user!.userId;

    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Parse and validate date if provided
    let paymentDate;
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      paymentDate = parsedDate.toISOString().split('T')[0];
    }

    // Check if payment exists and belongs to user's debt
    const existingResult = await query(`
      SELECT p.*, d.remaining_amount + p.amount as max_amount
      FROM payments p
      JOIN debts d ON p.debt_id = d.id
      WHERE p.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const existingPayment = existingResult.rows[0];

    // Validate amount doesn't exceed remaining + current payment amount
    if (amount !== undefined && amount > existingPayment.max_amount) {
      return res.status(400).json({
        error: `Payment amount (${amount}) cannot exceed remaining amount (${existingPayment.max_amount})`
      });
    }

    const result = await query(
      'UPDATE payments SET amount = $1, date = $2, note = $3 WHERE id = $4 RETURNING *',
      [amount !== undefined ? amount : existingPayment.amount, paymentDate || existingPayment.date, note !== undefined ? note : existingPayment.note, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a payment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if payment exists and belongs to user's debt
    const existingResult = await query(`
      SELECT p.id FROM payments p
      JOIN debts d ON p.debt_id = d.id
      WHERE p.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const result = await query('DELETE FROM payments WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

