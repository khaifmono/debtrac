import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryCards } from '../SummaryCards';

describe('SummaryCards', () => {
  it('renders summary with numeric values', () => {
    render(
      <SummaryCards summary={{ total_owed_to_me: 330, total_i_owe: 395, net_balance: -65 }} />
    );
    expect(screen.getByText('RM 330.00')).toBeInTheDocument();
    expect(screen.getByText('RM 395.00')).toBeInTheDocument();
    expect(screen.getByText('RM -65.00')).toBeInTheDocument();
  });

  it('renders zero values', () => {
    render(
      <SummaryCards summary={{ total_owed_to_me: 0, total_i_owe: 0, net_balance: 0 }} />
    );
    const zeroes = screen.getAllByText('RM 0.00');
    expect(zeroes.length).toBeGreaterThanOrEqual(2);
  });
});
