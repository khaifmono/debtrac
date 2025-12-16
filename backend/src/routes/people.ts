import { Router, Request, Response } from 'express';
import { query } from '../database';

const router = Router();

// Types for request/response
interface Person {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface CreatePersonRequest {
  name: string;
}

// Get all people for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    const result = await query(
      'SELECT * FROM people WHERE user_id = $1 ORDER BY name',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific person by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    const result = await query(
      'SELECT * FROM people WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new person
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name }: CreatePersonRequest = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    // Check if person with this name already exists for this user
    const existingResult = await query(
      'SELECT id FROM people WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, name.trim()]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'A person with this name already exists' });
    }

    const result = await query(
      'INSERT INTO people (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a person
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if another person with this name already exists for this user
    const existingResult = await query(
      'SELECT id FROM people WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [userId, name.trim(), id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'A person with this name already exists' });
    }

    const result = await query(
      'UPDATE people SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a person
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = '550e8400-e29b-41d4-a716-446655440000'; // TODO: Get from auth

    const result = await query('DELETE FROM people WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
