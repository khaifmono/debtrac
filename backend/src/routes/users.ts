import { Router, Request, Response } from 'express';
import { query } from '../database';
import { hashPassword } from '../utils/auth';

const router = Router();

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, must_change_password, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, name, role } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await hashPassword('changeme');
    const userRole = role || 'user';

    const result = await query(
      'INSERT INTO users (email, name, role, password_hash, must_change_password) VALUES ($1, $2, $3, $4, true) RETURNING id, email, name, role, must_change_password, created_at',
      [email, name, userRole, passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/role
router.put('/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }

    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, must_change_password, created_at',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
