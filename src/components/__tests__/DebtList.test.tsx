import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtList } from '../DebtList';
import { Debt } from '@/types';

const makeDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: '1',
  user_id: 'u1',
  person_id: 'p1',
  person_name: 'Ahmad',
  direction: 'owed_to_me',
  amount: 250,
  status: 'unpaid',
  due_date: '2024-02-15',
  notes: 'Test note',
  created_at: '2024-01-01',
  remaining_amount: 250,
  ...overrides,
});

const noop = () => {};

describe('DebtList', () => {
  it('renders debts with numeric amounts', () => {
    const debts = [makeDebt()];
    render(
      <DebtList
        debts={debts}
        direction="owed_to_me"
        onAddDebt={noop}
        onViewDebt={noop}
        onAddPayment={noop}
        onEditDebt={noop}
      />
    );
    expect(screen.getByText('Ahmad')).toBeInTheDocument();
    expect(screen.getByText('RM 250.00')).toBeInTheDocument();
  });

  it('renders debts with string amounts from API (PostgreSQL DECIMAL)', () => {
    // This is the actual format returned by the API
    const debts = [makeDebt({ amount: "250.00" as any, remaining_amount: "250.00" as any })];
    render(
      <DebtList
        debts={debts}
        direction="owed_to_me"
        onAddDebt={noop}
        onViewDebt={noop}
        onAddPayment={noop}
        onEditDebt={noop}
      />
    );
    expect(screen.getByText('Ahmad')).toBeInTheDocument();
    expect(screen.getByText('RM 250.00')).toBeInTheDocument();
  });

  it('shows partial amount comparison with string values', () => {
    const debts = [makeDebt({
      amount: "180.00" as any,
      remaining_amount: "80.00" as any,
      status: 'partially_paid',
    })];
    render(
      <DebtList
        debts={debts}
        direction="owed_to_me"
        onAddDebt={noop}
        onViewDebt={noop}
        onAddPayment={noop}
        onEditDebt={noop}
      />
    );
    expect(screen.getByText('RM 80.00')).toBeInTheDocument();
    expect(screen.getByText('of RM 180.00')).toBeInTheDocument();
  });

  it('shows empty state when no debts match direction', () => {
    render(
      <DebtList
        debts={[]}
        direction="owed_to_me"
        onAddDebt={noop}
        onViewDebt={noop}
        onAddPayment={noop}
        onEditDebt={noop}
      />
    );
    expect(screen.getByText('No debts yet')).toBeInTheDocument();
  });
});
