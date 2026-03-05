import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../database', () => ({
  query: vi.fn(),
}));

import { query } from '../../database';
import { generateToken } from '../../utils/auth';

import express from 'express';
import request from 'supertest';
import { authenticate, requireAdmin } from '../../middleware/auth';
import settingsRouter from '../../routes/settings';

const app = express();
app.use(express.json());
app.use('/api/settings', authenticate, requireAdmin, settingsRouter);

const mockedQuery = vi.mocked(query);

const adminToken = generateToken({ userId: 'admin-1', email: 'admin@test.com', role: 'admin', mustChangePassword: false });
const userToken = generateToken({ userId: 'user-1', email: 'user@test.com', role: 'user', mustChangePassword: false });

describe('GET /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with settings object for admin', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { key: 'custom_message', value: 'Hello {{name}}' },
        { key: 'smtp_host', value: 'smtp.example.com' },
        { key: 'smtp_port', value: '587' },
        { key: 'smtp_username', value: '' },
        { key: 'smtp_password', value: '' },
        { key: 'smtp_from_email', value: '' },
        { key: 'smtp_from_name', value: '' },
      ],
      rowCount: 7,
    } as any);

    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      custom_message: 'Hello {{name}}',
      smtp_host: 'smtp.example.com',
      smtp_port: '587',
      smtp_username: '',
      smtp_password: '',
      smtp_from_email: '',
      smtp_from_name: '',
    });
  });
});

describe('PUT /api/settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ custom_message: 'test' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown keys', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unknown_key: 'value' });
    expect(res.status).toBe(400);
  });

  it('returns 200 for valid update', async () => {
    // Upsert query for custom_message
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
    // SELECT all settings after update
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { key: 'custom_message', value: 'Updated message' },
        { key: 'smtp_host', value: '' },
        { key: 'smtp_port', value: '587' },
        { key: 'smtp_username', value: '' },
        { key: 'smtp_password', value: '' },
        { key: 'smtp_from_email', value: '' },
        { key: 'smtp_from_name', value: '' },
      ],
      rowCount: 7,
    } as any);

    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ custom_message: 'Updated message' });

    expect(res.status).toBe(200);
    expect(res.body.custom_message).toBe('Updated message');
  });
});
