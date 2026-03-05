import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, generateToken, verifyToken } from '../../utils/auth';

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await hashPassword('testpassword');
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('returns different hashes for same password', async () => {
      const hash1 = await hashPassword('testpassword');
      const hash2 = await hashPassword('testpassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('returns true for matching password', async () => {
      const hash = await hashPassword('mypassword');
      const result = await comparePassword('mypassword', hash);
      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await hashPassword('mypassword');
      const result = await comparePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('returns a JWT string', () => {
      const token = generateToken({
        userId: '123',
        email: 'test@test.com',
        role: 'user',
        mustChangePassword: false,
      });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    it('decodes a valid token', () => {
      const payload = {
        userId: '123',
        email: 'test@test.com',
        role: 'admin' as const,
        mustChangePassword: true,
      };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.role).toBe('admin');
      expect(decoded.mustChangePassword).toBe(true);
    });

    it('throws on invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('throws on expired token', () => {
      // Create a token that's already expired by using jwt directly
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: '123', email: 'test@test.com', role: 'user', mustChangePassword: false },
        process.env.JWT_SECRET || 'dev-secret-change-me',
        { expiresIn: '0s' }
      );
      expect(() => verifyToken(token)).toThrow();
    });
  });
});
