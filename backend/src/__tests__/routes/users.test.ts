import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../database', () => ({
  query: vi.fn(),
}));

import { query } from '../../database';
import { generateToken } from '../../utils/auth';

import express from 'express';
import request from 'supertest';
import { authenticate, requireAdmin } from '../../middleware/auth';
import usersRouter from '../../routes/users';

const app = express();
app.use(express.json());
app.use('/api/users', authenticate, requireAdmin, usersRouter);

const mockedQuery = vi.mocked(query);

const adminToken = generateToken({ userId: 'admin-1', email: 'admin@test.com', role: 'admin', mustChangePassword: false });
const userToken = generateToken({ userId: 'user-1', email: 'user@test.com', role: 'user', mustChangePassword: false });

describe('GET /api/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with user list for admin', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        { id: '1', email: 'admin@test.com', name: 'Admin', role: 'admin', must_change_password: false, created_at: '2024-01-01' },
      ],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe('admin@test.com');
  });
});

describe('POST /api/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@test.com' });
    expect(res.status).toBe(400);
  });

  it('returns 409 if duplicate email', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [{ id: '1' }], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'existing@test.com', name: 'Existing' });

    expect(res.status).toBe(409);
  });

  it('returns 201 with new user', async () => {
    // Check for existing
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    // Insert
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: '2', email: 'new@test.com', name: 'New User', role: 'user', must_change_password: true, created_at: '2024-01-01' }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'new@test.com', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new@test.com');
    expect(res.body.must_change_password).toBe(true);
  });
});

describe('PUT /api/users/:id/role', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .put('/api/users/user-2/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when changing own role', async () => {
    const res = await request(app)
      .put('/api/users/admin-1/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-2', email: 'u@t.com', name: 'U', role: 'admin', must_change_password: false, created_at: '2024-01-01' }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .put('/api/users/user-2/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/users/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if self-delete', async () => {
    const res = await request(app)
      .delete('/api/users/admin-1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 204 on success', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    const res = await request(app)
      .delete('/api/users/user-2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });
});
