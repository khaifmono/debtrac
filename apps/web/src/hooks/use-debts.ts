import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi, paymentApi } from '@/lib/api';
import { Debt, DebtDirection, Payment } from '@/types';

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ['debts'],
    queryFn: debtApi.getAll,
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      person_name: string;
      direction: DebtDirection;
      amount: number;
      due_date?: string | null;
      notes?: string | null;
    }) => debtApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => debtApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
}

export function usePayments(debtId: string | undefined) {
  return useQuery<Payment[]>({
    queryKey: ['payments', debtId],
    queryFn: () => paymentApi.getByDebt(debtId!),
    enabled: !!debtId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { debt_id: string; amount: number; date: string; note?: string | null }) =>
      paymentApi.create(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
