import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debtApi, paymentApi, peopleApi } from '../api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('debtApi', () => {
  it('getAll fetches /debts and returns data', async () => {
    const mockDebts = [{ id: '1', person_name: 'Ahmad', amount: '250.00' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockDebts),
    });

    const result = await debtApi.getAll();
    expect(result).toEqual(mockDebts);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/debts'),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
  });

  it('create sends POST with debt data', async () => {
    const newDebt = { person_name: 'Test', direction: 'owed_to_me', amount: 100 };
    const createdDebt = { id: '1', ...newDebt };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve(createdDebt),
    });

    const result = await debtApi.create(newDebt as any);
    expect(result).toEqual(createdDebt);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/debts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(newDebt),
      })
    );
  });

  it('delete sends DELETE and handles 204', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.reject('no body'),
    });

    const result = await debtApi.delete('1');
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/debts/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ error: 'Missing required fields' }),
    });

    await expect(debtApi.create({} as any)).rejects.toThrow('Missing required fields');
  });
});

describe('paymentApi', () => {
  it('getByDebt fetches payments for a debt', async () => {
    const mockPayments = [{ id: '1', debt_id: 'd1', amount: '50.00' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPayments),
    });

    const result = await paymentApi.getByDebt('d1');
    expect(result).toEqual(mockPayments);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/payments/debt/d1'),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
  });

  it('create sends POST with payment data', async () => {
    const payment = { debt_id: 'd1', amount: 50, date: '2024-01-01' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: '1', ...payment }),
    });

    const result = await paymentApi.create(payment as any);
    expect(result.id).toBe('1');
  });
});

describe('peopleApi', () => {
  it('getAll fetches /people', async () => {
    const mockPeople = [{ id: '1', name: 'Ahmad' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPeople),
    });

    const result = await peopleApi.getAll();
    expect(result).toEqual(mockPeople);
  });
});
