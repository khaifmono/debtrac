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
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { usersApi, settingsApi } from '@/lib/api';
const mockedUsersApi = vi.mocked(usersApi);
const mockedSettingsApi = vi.mocked(settingsApi);

const defaultSettings = {
  custom_message: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
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
    mockedSettingsApi.get.mockResolvedValue(defaultSettings);
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

  it('renders three tabs: Users, Custom Message, SMTP', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Custom Message' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'SMTP' })).toBeInTheDocument();
    });
  });

  it('shows Users tab by default', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([
      { id: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin', must_change_password: false, created_at: '2024-01-01' },
    ]);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    const usersTab = screen.getByRole('tab', { name: 'Users' });
    expect(usersTab).toHaveAttribute('data-state', 'active');
  });

  it('displays custom message textarea when Custom Message tab clicked', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);
    mockedSettingsApi.get.mockResolvedValueOnce({
      ...defaultSettings,
      custom_message: 'Hello {{name}}, you owe {{amount}}',
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Custom Message' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Custom Message' }));

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/\{\{name\}\}/);
      expect(textarea).toBeInTheDocument();
    });
  });

  it('saves custom message via settingsApi.update', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);
    mockedSettingsApi.update.mockResolvedValueOnce({
      ...defaultSettings,
      custom_message: 'New message',
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Custom Message' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Custom Message' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/\{\{name\}\}/)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/\{\{name\}\}/);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'New message');

    const saveButton = screen.getByRole('button', { name: /save message/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedSettingsApi.update).toHaveBeenCalledWith({ custom_message: 'New message' });
    });
  });

  it('displays SMTP fields when SMTP tab clicked', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);
    mockedSettingsApi.get.mockResolvedValueOnce({
      ...defaultSettings,
      smtp_host: 'smtp.example.com',
      smtp_port: '465',
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SMTP' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'SMTP' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/smtp host/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp port/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from name/i)).toBeInTheDocument();
    });
  });

  it('saves SMTP settings via settingsApi.update', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);
    mockedSettingsApi.update.mockResolvedValueOnce({
      ...defaultSettings,
      smtp_host: 'smtp.test.com',
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SMTP' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'SMTP' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/smtp host/i)).toBeInTheDocument();
    });

    const hostInput = screen.getByLabelText(/smtp host/i);
    await userEvent.type(hostInput, 'smtp.test.com');

    const saveButton = screen.getByRole('button', { name: /save smtp/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedSettingsApi.update).toHaveBeenCalled();
    });
  });

  it('has a Test Connection button on SMTP tab', async () => {
    mockedUsersApi.getAll.mockResolvedValueOnce([]);

    renderSettings();

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'SMTP' })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'SMTP' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
    });
  });
});
