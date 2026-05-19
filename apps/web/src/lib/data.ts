import { Debt, Payment, Person, DebtSummary, PersonSummary } from '@/types';
import { debtApi, peopleApi, paymentApi } from './api';

// Cache for current data
let cachedDebts: Debt[] = [];
let cachedPeople: Person[] = [];
let cachedPayments: Payment[] = [];
let cachedDebts: Debt[] = [];
let cachedPeople: Person[] = [];
let cachedPayments: Payment[] = [];

// A simple pub-sub mechanism for data changes
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

export function subscribeToDataChanges(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

let isLoading = false;

// Load all data
export async function loadData(forceReload = false) {
  if (isLoading && !forceReload) {
    console.log('Data loading already in progress, waiting...');
    // Optionally, wait for current loading to complete if it's a critical path
    // For now, we'll just skip if already loading to prevent race conditions
    return;
  }

  isLoading = true;
  try {
    console.log('🔄 Loading data from API...');
    const [debtsData, peopleData] = await Promise.all([
      debtApi.getAll(),
      peopleApi.getAll(),
    ]);
    cachedDebts = debtsData;
    cachedPeople = peopleData;
    console.log(`✅ Loaded ${cachedDebts.length} debts and ${cachedPeople.length} people`);

    // Load payments for all debts
    const paymentPromises = cachedDebts.map(debt =>
      paymentApi.getByDebt(debt.id)
    );
    const paymentsArrays = await Promise.all(paymentPromises);
    cachedPayments = paymentsArrays.flat();
    console.log(`✅ Loaded ${cachedPayments.length} payments total`);

    notifySubscribers(); // Notify components after data is updated
  } catch (error) {
    console.error('❌ Error loading data:', error);
    // Log more details about the error
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }

    // Fallback to empty arrays if API fails
    cachedDebts = [];
    cachedPeople = [];
    cachedPayments = [];
    throw error; // Re-throw so components can handle the error
  } finally {
    isLoading = false;
  }
}

// Force reload data (useful after mutations)
export async function reloadData() {
  return loadData(true);
}

// Getters
export function getDebts(): Debt[] {
  return cachedDebts;
}

export function getPeople(): Person[] {
  return cachedPeople;
}

export function getPayments(): Payment[] {
  return cachedPayments;
}

export function getPaymentsForDebt(debtId: string): Payment[] {
  return cachedPayments.filter(payment => payment.debt_id === debtId);
}

// Actions
export async function createDebt(debtData: Omit<Debt, 'id' | 'created_at' | 'remaining_amount'>): Promise<Debt> {
  try {
    console.log('Creating debt:', debtData);
    const newDebt = await debtApi.create(debtData);
    console.log('Debt created successfully:', newDebt);
    // Reload data to get updated relationships and notify subscribers
    await reloadData();
    return newDebt;
  } catch (error) {
    console.error('Failed to create debt:', error);
    throw error;
  }
}

export async function updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
  try {
    const updatedDebt = await debtApi.update(id, updates);
    // Reload data to ensure UI is consistent
    await reloadData();
    return updatedDebt;
  } catch (error) {
    console.error('Failed to update debt:', error);
    throw error;
  }
}

export async function deleteDebt(id: string): Promise<void> {
  try {
    await debtApi.delete(id);
    // Reload data to ensure UI is consistent
    await reloadData();
  } catch (error) {
    console.error('Failed to delete debt:', error);
    throw error;
  }
}

export async function createPerson(personData: Omit<Person, 'id' | 'created_at' | 'user_id'>): Promise<Person> {
  try {
    const newPerson = await peopleApi.create(personData);
    // Reload data to ensure UI is consistent
    await reloadData();
    return newPerson;
  } catch (error) {
    console.error('Failed to create person:', error);
    throw error;
  }
}

export async function createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  try {
    const newPayment = await paymentApi.create(paymentData);
    // Reload data to get updated debt statuses and notify subscribers
    await reloadData();
    return newPayment;
  } catch (error) {
    console.error('Failed to create payment:', error);
    throw error;
  }
}

// Load all data
export async function loadData(forceReload = false) {
  if (isDataLoaded && !forceReload) {
    console.log('Data already loaded, skipping reload');
    return;
  }

  if (isLoading) {
    console.log('Data loading already in progress, waiting...');
    return;
  }

  isLoading = true;
  try {
    console.log('🔄 Loading data from API...');
    [cachedDebts, cachedPeople] = await Promise.all([
      debtApi.getAll(),
      peopleApi.getAll(),
    ]);
    console.log(`✅ Loaded ${cachedDebts.length} debts and ${cachedPeople.length} people`);

    // Load payments for all debts
    const paymentPromises = cachedDebts.map(debt =>
      paymentApi.getByDebt(debt.id)
    );
    const paymentsArrays = await Promise.all(paymentPromises);
    cachedPayments = paymentsArrays.flat();
    console.log(`✅ Loaded ${cachedPayments.length} payments total`);

    isDataLoaded = true;
  } catch (error) {
    console.error('❌ Error loading data:', error);
    // Log more details about the error
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }

    // Fallback to empty arrays if API fails
    cachedDebts = [];
    cachedPeople = [];
    cachedPayments = [];
    isDataLoaded = false;
    throw error; // Re-throw so components can handle the error
  } finally {
    isLoading = false;
  }
}

// Force reload data (useful after mutations)
export async function reloadData() {
  return loadData(true);
}

// Check if data is loaded
export function isDataReady(): boolean {
  return isDataLoaded;
}

// Getters
export function getDebts(): Debt[] {
  return cachedDebts;
}

export function getPeople(): Person[] {
  return cachedPeople;
}

export function getPayments(): Payment[] {
  return cachedPayments;
}

export function getPaymentsForDebt(debtId: string): Payment[] {
  return cachedPayments.filter(payment => payment.debt_id === debtId);
}

// Actions
export async function createDebt(debtData: Omit<Debt, 'id' | 'created_at' | 'remaining_amount'>): Promise<Debt> {
  try {
    console.log('Creating debt:', debtData);
    const newDebt = await debtApi.create(debtData);
    console.log('Debt created successfully:', newDebt);
    cachedDebts.push(newDebt);
    // Reload data to get updated relationships
    await reloadData();
    return newDebt;
  } catch (error) {
    console.error('Failed to create debt:', error);
    throw error;
  }
}

export async function updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
  const updatedDebt = await debtApi.update(id, updates);
  const index = cachedDebts.findIndex(d => d.id === id);
  if (index !== -1) {
    cachedDebts[index] = updatedDebt;
  }
  return updatedDebt;
}

export async function deleteDebt(id: string): Promise<void> {
  await debtApi.delete(id);
  cachedDebts = cachedDebts.filter(d => d.id !== id);
  cachedPayments = cachedPayments.filter(p => p.debt_id !== id);
}

export async function createPerson(personData: Omit<Person, 'id' | 'created_at' | 'user_id'>): Promise<Person> {
  const newPerson = await peopleApi.create(personData);
  cachedPeople.push(newPerson);
  return newPerson;
}

export async function createPayment(paymentData: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const newPayment = await paymentApi.create(paymentData);
  cachedPayments.push(newPayment);
  // Reload data to get updated debt statuses
  await reloadData();
  return newPayment;
}

// Keep existing utility functions
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
