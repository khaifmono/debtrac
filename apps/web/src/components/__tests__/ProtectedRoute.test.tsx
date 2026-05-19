import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('content')).toHaveTextContent('Protected Content');
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div data-testid="content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});
