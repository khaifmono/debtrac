import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../../database', () => ({
  query: vi.fn(),
}));

import { query } from '../../database';
import { hashPassword, generateToken } from '../../utils/auth';

// We'll test the route handlers by importing the router and using a lightweight approach
import express from 'express';
import request from 'supertest';
import authRouter from '../../routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const mockedQuery = vi.mocked(query);

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if email or password missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 401 if user not found', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'pass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 if password wrong', async () => {
    const hash = await hashPassword('correct');
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'a@b.com', name: 'A', role: 'user', password_hash: hash, must_change_password: false }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with token and user on success', async () => {
    const hash = await hashPassword('correct');
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: '1', email: 'a@b.com', name: 'A', role: 'admin', password_hash: hash, must_change_password: true }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correct' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.mustChangePassword).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user data when authenticated', async () => {
    const token = generateToken({ userId: 'u1', email: 'me@test.com', role: 'user', mustChangePassword: false });
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'u1', email: 'me@test.com', name: 'Me', role: 'user', must_change_password: false }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@test.com');
  });
});

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if fields missing', async () => {
    const token = generateToken({ userId: 'u1', email: 'me@test.com', role: 'user', mustChangePassword: true });

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'old' });

    expect(res.status).toBe(400);
  });

  it('returns 400 if new password too short', async () => {
    const token = generateToken({ userId: 'u1', email: 'me@test.com', role: 'user', mustChangePassword: true });

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'old', newPassword: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 characters/);
  });

  it('returns 401 if current password wrong', async () => {
    const hash = await hashPassword('real');
    const token = generateToken({ userId: 'u1', email: 'me@test.com', role: 'user', mustChangePassword: true });
    mockedQuery.mockResolvedValueOnce({ rows: [{ password_hash: hash }], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong', newPassword: 'newsecure' });

    expect(res.status).toBe(401);
  });

  it('returns 200 with new token on success', async () => {
    const hash = await hashPassword('oldpass');
    const token = generateToken({ userId: 'u1', email: 'me@test.com', role: 'user', mustChangePassword: true });

    // First call: get password_hash
    mockedQuery.mockResolvedValueOnce({ rows: [{ password_hash: hash }], rowCount: 1 } as any);
    // Second call: update password
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpass', newPassword: 'newsecure' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });
});
