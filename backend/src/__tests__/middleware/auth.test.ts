import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { generateToken } from '../../utils/auth';

function mockReq(headers: Record<string, string> = {}, user?: any): Partial<Request> {
  return { headers, user } as any;
}

function mockRes(): Partial<Response> {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  it('returns 401 when no Authorization header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    authenticate(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const req = mockReq({ authorization: 'Bearer invalid-token' });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const req = mockReq({ authorization: 'Basic abc123' });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next() on valid token', () => {
    const token = generateToken({
      userId: 'user-1',
      email: 'test@test.com',
      role: 'user',
      mustChangePassword: false,
    });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = vi.fn();

    authenticate(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(req.user!.email).toBe('test@test.com');
  });
});

describe('requireAdmin middleware', () => {
  it('returns 403 for non-admin user', () => {
    const req = mockReq({}, { userId: '1', email: 'test@test.com', role: 'user', mustChangePassword: false });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for admin user', () => {
    const req = mockReq({}, { userId: '1', email: 'admin@test.com', role: 'admin', mustChangePassword: false });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when no user on request', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req as Request, res as Response, next as NextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
