import { Debt, Person, Payment, LoginResponse, AuthUser, ChangePasswordResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<ChangePasswordResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Debt API
export const debtApi = {
  getAll: () => request<Debt[]>('/debts'),
  create: (debt: Partial<Debt>) =>
    request<Debt>('/debts', { method: 'POST', body: JSON.stringify(debt) }),
  update: (id: string, updates: Partial<Debt>) =>
    request<Debt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  delete: (id: string) =>
    request<void>(`/debts/${id}`, { method: 'DELETE' }),
};

// People API
export const peopleApi = {
  getAll: () => request<Person[]>('/people'),
  create: (person: { name: string; phone?: string }) =>
    request<Person>('/people', { method: 'POST', body: JSON.stringify(person) }),
  update: (id: string, data: { name: string; phone?: string | null }) =>
    request<Person>(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Payment API
export const paymentApi = {
  getByDebt: (debtId: string) =>
    request<Payment[]>(`/payments/debt/${debtId}`),
  create: (payment: Omit<Payment, 'id' | 'created_at'>) =>
    request<Payment>('/payments', { method: 'POST', body: JSON.stringify(payment) }),
  delete: (id: string) =>
    request<void>(`/payments/${id}`, { method: 'DELETE' }),
};

// Users API (admin)
export const usersApi = {
  getAll: () => request<any[]>('/users'),
  create: (data: { email: string; name: string; role?: string }) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, role: string) =>
    request<any>(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};
