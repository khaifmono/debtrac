import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, calculateSummary, calculatePersonSummaries } from '../mock-data';
import { Debt } from '@/types';

describe('formatCurrency', () => {
  it('formats a number correctly', () => {
    expect(formatCurrency(42.5)).toBe('RM 42.50');
    expect(formatCurrency(0)).toBe('RM 0.00');
    expect(formatCurrency(1000)).toBe('RM 1000.00');
  });

  it('handles string amounts from API (PostgreSQL DECIMAL)', () => {
    // API returns amounts as strings like "42.50"
    expect(formatCurrency("42.50" as any)).toBe('RM 42.50');
    expect(formatCurrency("0.00" as any)).toBe('RM 0.00');
    expect(formatCurrency("1000" as any)).toBe('RM 1000.00');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50)).toBe('RM -50.00');
  });
});

describe('formatDate', () => {
  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-02-15');
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('handles ISO date strings from API', () => {
    const result = formatDate('2024-02-15T00:00:00.000Z');
    expect(result).toContain('2024');
  });
});

describe('calculateSummary', () => {
  const makeDebt = (overrides: Partial<Debt>): Debt => ({
    id: '1',
    user_id: 'u1',
    person_id: 'p1',
    person_name: 'Test',
    direction: 'owed_to_me',
    amount: 100,
    status: 'unpaid',
    due_date: null,
    notes: null,
    created_at: '2024-01-01',
    remaining_amount: 100,
    ...overrides,
  });

  it('calculates totals with numeric amounts', () => {
    const debts = [
      makeDebt({ direction: 'owed_to_me', remaining_amount: 100, status: 'unpaid' }),
      makeDebt({ id: '2', direction: 'i_owe', remaining_amount: 50, status: 'unpaid' }),
    ];
    const summary = calculateSummary(debts);
    expect(summary.total_owed_to_me).toBe(100);
    expect(summary.total_i_owe).toBe(50);
    expect(summary.net_balance).toBe(50);
  });

  it('calculates totals with string amounts from API', () => {
    const debts = [
      makeDebt({ direction: 'owed_to_me', remaining_amount: "250.00" as any, status: 'unpaid' }),
      makeDebt({ id: '2', direction: 'owed_to_me', remaining_amount: "80.00" as any, status: 'partially_paid' }),
      makeDebt({ id: '3', direction: 'i_owe', remaining_amount: "320.00" as any, status: 'unpaid' }),
    ];
    const summary = calculateSummary(debts);
    expect(summary.total_owed_to_me).toBe(330);
    expect(summary.total_i_owe).toBe(320);
    expect(summary.net_balance).toBe(10);
  });

  it('excludes settled debts', () => {
    const debts = [
      makeDebt({ direction: 'owed_to_me', remaining_amount: 100, status: 'settled' }),
      makeDebt({ id: '2', direction: 'i_owe', remaining_amount: 50, status: 'unpaid' }),
    ];
    const summary = calculateSummary(debts);
    expect(summary.total_owed_to_me).toBe(0);
    expect(summary.total_i_owe).toBe(50);
  });
});

describe('calculatePersonSummaries', () => {
  const makeDebt = (overrides: Partial<Debt>): Debt => ({
    id: '1',
    user_id: 'u1',
    person_id: 'p1',
    person_name: 'Test',
    direction: 'owed_to_me',
    amount: 100,
    status: 'unpaid',
    due_date: null,
    notes: null,
    created_at: '2024-01-01',
    remaining_amount: 100,
    ...overrides,
  });

  it('groups debts by person with string amounts', () => {
    const debts = [
      makeDebt({ person_name: 'Ahmad', direction: 'owed_to_me', remaining_amount: "250.00" as any }),
      makeDebt({ id: '2', person_name: 'Ahmad', direction: 'i_owe', remaining_amount: "75.00" as any }),
    ];
    const summaries = calculatePersonSummaries(debts);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].person_name).toBe('Ahmad');
    expect(summaries[0].owed_to_me).toBe(250);
    expect(summaries[0].i_owe).toBe(75);
    expect(summaries[0].net).toBe(175);
  });

  it('excludes settled debts', () => {
    const debts = [
      makeDebt({ person_name: 'Sarah', status: 'settled', remaining_amount: 0 }),
    ];
    const summaries = calculatePersonSummaries(debts);
    expect(summaries).toHaveLength(0);
  });
});
