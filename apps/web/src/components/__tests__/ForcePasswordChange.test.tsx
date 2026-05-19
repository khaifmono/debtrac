import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForcePasswordChange } from '../ForcePasswordChange';

const mockChangePassword = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ForcePasswordChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when requiresPasswordChange is true', () => {
    mockUseAuth.mockReturnValue({ requiresPasswordChange: true, changePassword: mockChangePassword });

    render(<ForcePasswordChange />);
    expect(screen.getByText('Change Your Password')).toBeInTheDocument();
  });

  it('does not render when requiresPasswordChange is false', () => {
    mockUseAuth.mockReturnValue({ requiresPasswordChange: false, changePassword: mockChangePassword });

    const { container } = render(<ForcePasswordChange />);
    expect(container.innerHTML).toBe('');
  });

  it('validates minimum length', async () => {
    mockUseAuth.mockReturnValue({ requiresPasswordChange: true, changePassword: mockChangePassword });

    render(<ForcePasswordChange />);

    await userEvent.type(screen.getByLabelText('Current Password'), 'old');
    await userEvent.type(screen.getByLabelText('New Password'), '12345');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), '12345');
    await userEvent.click(screen.getByText('Change Password'));

    expect(screen.getByText('New password must be at least 6 characters')).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('rejects "changeme" as new password', async () => {
    mockUseAuth.mockReturnValue({ requiresPasswordChange: true, changePassword: mockChangePassword });

    render(<ForcePasswordChange />);

    await userEvent.type(screen.getByLabelText('Current Password'), 'old');
    await userEvent.type(screen.getByLabelText('New Password'), 'changeme');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'changeme');
    await userEvent.click(screen.getByText('Change Password'));

    expect(screen.getByText('Please choose a different password')).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('calls changePassword on valid submit', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);
    mockUseAuth.mockReturnValue({ requiresPasswordChange: true, changePassword: mockChangePassword });

    render(<ForcePasswordChange />);

    await userEvent.type(screen.getByLabelText('Current Password'), 'changeme');
    await userEvent.type(screen.getByLabelText('New Password'), 'newsecure');
    await userEvent.type(screen.getByLabelText('Confirm New Password'), 'newsecure');
    await userEvent.click(screen.getByText('Change Password'));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('changeme', 'newsecure');
    });
  });
});
