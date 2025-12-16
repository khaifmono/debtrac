import axios from 'axios';
import { Debt, Person, Payment } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debt API
export const debtApi = {
  getAll: () => api.get<Debt[]>('/debts').then(res => res.data),
  create: (debt: Omit<Debt, 'id' | 'created_at' | 'remaining_amount'>) =>
    api.post<Debt>('/debts', debt).then(res => res.data),
  update: (id: string, updates: Partial<Debt>) =>
    api.put<Debt>(`/debts/${id}`, updates).then(res => res.data),
  delete: (id: string) => api.delete(`/debts/${id}`),
};

// People API
export const peopleApi = {
  getAll: () => api.get<Person[]>('/people').then(res => res.data),
  create: (person: Omit<Person, 'id' | 'created_at' | 'user_id'>) =>
    api.post<Person>('/people', person).then(res => res.data),
};

// Payment API
export const paymentApi = {
  getByDebt: (debtId: string) =>
    api.get<Payment[]>(`/payments/debt/${debtId}`).then(res => res.data),
  create: (payment: Omit<Payment, 'id' | 'created_at'>) =>
    api.post<Payment>('/payments', payment).then(res => res.data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export default api;
