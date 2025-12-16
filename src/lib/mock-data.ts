import { Debt, Payment, Person, DebtSummary, PersonSummary } from '@/types';

// Mock data for UI development - will be replaced with Supabase
export const mockPeople: Person[] = [
  { id: '1', user_id: 'user1', name: 'Ahmad', created_at: '2024-01-01' },
  { id: '2', user_id: 'user1', name: 'Mei Ling', created_at: '2024-01-02' },
  { id: '3', user_id: 'user1', name: 'Raj', created_at: '2024-01-03' },
  { id: '4', user_id: 'user1', name: 'Sarah', created_at: '2024-01-04' },
];

export const mockDebts: Debt[] = [
  {
    id: '1',
    user_id: 'user1',
    person_id: '1',
    person_name: 'Ahmad',
    direction: 'owed_to_me',
    amount: 250.00,
    status: 'unpaid',
    due_date: '2024-02-15',
    notes: 'Dinner at Jalan Alor',
    created_at: '2024-01-15',
    remaining_amount: 250.00,
  },
  {
    id: '2',
    user_id: 'user1',
    person_id: '2',
    person_name: 'Mei Ling',
    direction: 'owed_to_me',
    amount: 180.00,
    status: 'partially_paid',
    due_date: '2024-02-20',
    notes: 'Movie tickets + snacks',
    created_at: '2024-01-18',
    remaining_amount: 80.00,
  },
  {
    id: '3',
    user_id: 'user1',
    person_id: '3',
    person_name: 'Raj',
    direction: 'i_owe',
    amount: 320.00,
    status: 'unpaid',
    due_date: '2024-02-25',
    notes: 'Concert tickets',
    created_at: '2024-01-20',
    remaining_amount: 320.00,
  },
  {
    id: '4',
    user_id: 'user1',
    person_id: '4',
    person_name: 'Sarah',
    direction: 'i_owe',
    amount: 150.00,
    status: 'settled',
    due_date: null,
    notes: 'Lunch last week',
    created_at: '2024-01-10',
    remaining_amount: 0,
  },
  {
    id: '5',
    user_id: 'user1',
    person_id: '1',
    person_name: 'Ahmad',
    direction: 'i_owe',
    amount: 75.00,
    status: 'unpaid',
    due_date: '2024-03-01',
    notes: 'Coffee and pastries',
    created_at: '2024-01-22',
    remaining_amount: 75.00,
  },
];

export const mockPayments: Payment[] = [
  {
    id: '1',
    debt_id: '2',
    amount: 100.00,
    date: '2024-01-25',
    note: 'First payment',
    created_at: '2024-01-25',
  },
];

export function calculateSummary(debts: Debt[]): DebtSummary {
  const total_owed_to_me = debts
    .filter(d => d.direction === 'owed_to_me' && d.status !== 'settled')
    .reduce((sum, d) => sum + d.remaining_amount, 0);
  
  const total_i_owe = debts
    .filter(d => d.direction === 'i_owe' && d.status !== 'settled')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  return {
    total_owed_to_me,
    total_i_owe,
    net_balance: total_owed_to_me - total_i_owe,
  };
}

export function calculatePersonSummaries(debts: Debt[]): PersonSummary[] {
  const personMap = new Map<string, PersonSummary>();

  debts.forEach(debt => {
    if (debt.status === 'settled') return;
    
    const existing = personMap.get(debt.person_name) || {
      person_name: debt.person_name,
      owed_to_me: 0,
      i_owe: 0,
      net: 0,
    };

    if (debt.direction === 'owed_to_me') {
      existing.owed_to_me += debt.remaining_amount;
    } else {
      existing.i_owe += debt.remaining_amount;
    }
    existing.net = existing.owed_to_me - existing.i_owe;

    personMap.set(debt.person_name, existing);
  });

  return Array.from(personMap.values()).sort((a, b) => 
    Math.abs(b.net) - Math.abs(a.net)
  );
}

export function formatCurrency(amount: number): string {
  return `RM ${amount.toFixed(2)}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
