import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../Settings';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin', mustChangePassword: false },
    isAuthenticated: true,
    isLoading: false,
    requiresPasswordChange: false,
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  usersApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    delete: vi.fn(),
  },
}));

import { usersApi } from '@/lib/api';
const mockedUsersApi = vi.mocked(usersApi);

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user list from API', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([
      { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin', must_change_password: false, created_at: '2024-01-01' },
      { id: 'user-1', email: 'user@test.com', name: 'User', role: 'user', must_change_password: true, created_at: '2024-01-02' },
    ]);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });
  });

  it('opens Add User dialog', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Add User'));

    expect(screen.getByText('Add New User')).toBeInTheDocument();
  });
});
