export type DebtDirection = 'owed_to_me' | 'i_owe';
export type DebtStatus = 'unpaid' | 'partially_paid' | 'settled';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  person_id: string;
  person_name: string;
  direction: DebtDirection;
  amount: number;
  status: DebtStatus;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  remaining_amount: number;
}

export interface Payment {
  id: string;
  debt_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface SplitBillParticipant {
  name: string;
  amount: number;
  isPayer: boolean;
}

export interface SplitBill {
  title: string;
  total_amount: number;
  participants: SplitBillParticipant[];
}

export interface DebtSummary {
  total_owed_to_me: number;
  total_i_owe: number;
  net_balance: number;
}

export interface PersonSummary {
  person_name: string;
  owed_to_me: number;
  i_owe: number;
  net: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordResponse {
  token: string;
  message: string;
}
