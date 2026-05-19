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
    sendTestEmail: vi.fn(),
  },
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { usersApi, settingsApi } from '@/lib/api';
const mockedUsersApi = vi.mocked(usersApi);
const mockedSettingsApi = vi.mocked(settingsApi);

const defaultSettings = {
  brevo_api_key: '',
  brevo_from_email: '',
  brevo_from_name: 'Debtrac',
};

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
    mockedUsersApi.getAll.mockResolvedValue([]);
    mockedSettingsApi.get.mockResolvedValue(defaultSettings as any);
  });

  it('renders user list from API', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([
      { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin', must_change_password: false, created_at: '2024-01-01' },
      { id: 'user-1', email: 'user@test.com', name: 'User', role: 'user', must_change_password: true, created_at: '2024-01-02' },
    ] as any);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });
  });

  it('opens Invite User dialog', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /invite user/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders two tabs: Users and Email', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    });
  });

  it('shows Users tab by default', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([
      { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin', must_change_password: false, created_at: '2024-01-01' },
    ] as any);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    const usersTab = screen.getByRole('tab', { name: 'Users' });
    expect(usersTab).toHaveAttribute('data-state', 'active');
  });

  it('displays Brevo fields when Email tab clicked', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from name/i)).toBeInTheDocument();
    });
  });

  it('saves Brevo settings via settingsApi.update', async () => {
    mockedSettingsApi.update.mockResolvedValueOnce({} as any);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/from email/i)).toBeInTheDocument();
    });

    const fromEmailInput = screen.getByLabelText(/from email/i);
    await userEvent.type(fromEmailInput, 'noreply@test.com');

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockedSettingsApi.update).toHaveBeenCalled();
    });
  });

  it('has a Send Test Email button on Email tab', async () => {
    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Email' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send test/i })).toBeInTheDocument();
    });
  });
});
