import { Router, Request, Response } from 'express';
import { query } from '../database';

const router = Router();

const ALLOWED_KEYS = [
  'custom_message',
  'smtp_host',
  'smtp_port',
  'smtp_username',
  'smtp_password',
  'smtp_from_email',
  'smtp_from_name',
];

function rowsToObject(rows: { key: string; value: string }[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const row of rows) {
    obj[row.key] = row.value;
  }
  return obj;
}

// GET /api/settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT key, value FROM settings ORDER BY key');
    res.json(rowsToObject(result.rows));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const keys = Object.keys(updates);

    if (keys.length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const invalidKeys = keys.filter((k) => !ALLOWED_KEYS.includes(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ error: `Unknown settings keys: ${invalidKeys.join(', ')}` });
    }

    const userId = req.user!.userId;

    for (const key of keys) {
      await query(
        `INSERT INTO settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, updates[key], userId]
      );
    }

    const result = await query('SELECT key, value FROM settings ORDER BY key');
    res.json(rowsToObject(result.rows));
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
