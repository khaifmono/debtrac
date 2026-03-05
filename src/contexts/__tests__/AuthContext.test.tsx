import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
  },
}));

import { authApi } from '@/lib/api';
const mockedAuthApi = vi.mocked(authApi);

function TestConsumer() {
  const { user, isAuthenticated, isLoading, requiresPasswordChange, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <span data-testid="mustChange">{String(requiresPasswordChange)}</span>
      <button onClick={() => login('test@test.com', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders children', () => {
    render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('isAuthenticated is false when no token', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('login() stores token and sets user', async () => {
    mockedAuthApi.login.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user', mustChangePassword: false },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(localStorage.getItem('auth_token')).toBe('abc123');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('test@test.com');
  });

  it('logout() clears token', async () => {
    mockedAuthApi.login.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'user', mustChangePassword: false },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('requiresPasswordChange reflects mustChangePassword', async () => {
    mockedAuthApi.login.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: '1', email: 'test@test.com', name: 'Test', role: 'admin', mustChangePassword: true },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(screen.getByTestId('mustChange')).toHaveTextContent('true');
  });

  it('on mount with existing token, calls /api/auth/me', async () => {
    localStorage.setItem('auth_token', 'existing-token');
    mockedAuthApi.me.mockResolvedValueOnce({
      id: '1', email: 'me@test.com', name: 'Me', role: 'user', mustChangePassword: false,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(mockedAuthApi.me).toHaveBeenCalled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('me@test.com');
  });
});
