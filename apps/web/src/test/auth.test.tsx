import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import { authApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'me@khaif.dev',
  name: 'Khaif',
  role: 'admin' as const,
  mustChangePassword: false,
};

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(authApi.me).mockRejectedValue(new Error('Not authenticated'));
});

describe('Login page', () => {
  it('renders email and password fields', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email address')).toBeDefined();
      expect(screen.getByPlaceholderText('Password')).toBeDefined();
    });
  });

  it('shows error on invalid credentials', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid email or password'));
    renderLogin();

    await waitFor(() => screen.getByPlaceholderText('Email address'));

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'me@khaif.dev' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Login failed: Invalid email or password')).toBeDefined();
    });
  });

  it('redirects to dashboard on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'test-token', user: mockUser });
    renderLogin();

    await waitFor(() => screen.getByPlaceholderText('Email address'));

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'me@khaif.dev' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'F@hm1135' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeDefined();
    });
  });

  it('stores token in localStorage after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'test-token', user: mockUser });
    renderLogin();

    await waitFor(() => screen.getByPlaceholderText('Email address'));

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'me@khaif.dev' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'F@hm1135' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });
  });

  it('redirects to dashboard if already authenticated', async () => {
    localStorage.setItem('auth_token', 'existing-token');
    vi.mocked(authApi.me).mockResolvedValue(mockUser);
    renderLogin();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeDefined();
    });
  });
});

describe('Google OAuth error handling', () => {
  it('shows no_account error from URL param', async () => {
    renderLogin('/login?error=no_account');
    await waitFor(() => {
      expect(screen.getByText(/No Debtrac account found/)).toBeDefined();
    });
  });

  it('shows google_failed error from URL param', async () => {
    renderLogin('/login?error=google_failed');
    await waitFor(() => {
      expect(screen.getByText(/Google sign-in failed/)).toBeDefined();
    });
  });

  it('shows google_cancelled error from URL param', async () => {
    renderLogin('/login?error=google_cancelled');
    await waitFor(() => {
      expect(screen.getByText(/Google sign-in was cancelled/)).toBeDefined();
    });
  });
});

describe('AuthContext', () => {
  it('reads token from URL and stores in localStorage', async () => {
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    // Simulate Google OAuth redirect with token in URL
    Object.defineProperty(window, 'location', {
      value: { search: '?token=oauth-token', pathname: '/', href: '/' },
      writable: true,
    });

    render(
      <MemoryRouter initialEntries={['/?token=oauth-token']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<div data-testid="home" />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('oauth-token');
    });
  });

  it('clears token and stays unauthenticated if me() fails', async () => {
    localStorage.setItem('auth_token', 'bad-token');
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));

    const TestComponent = () => {
      const { isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>loading</div>;
      return <div>{isAuthenticated ? 'auth' : 'unauth'}</div>;
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('unauth')).toBeDefined();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});
