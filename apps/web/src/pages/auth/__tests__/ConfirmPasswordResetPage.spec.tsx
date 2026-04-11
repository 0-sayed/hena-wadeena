import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConfirmPasswordResetPage from '../ConfirmPasswordResetPage';

const mockNavigate = vi.fn();
const mockConfirmPasswordReset = vi.fn();
const mockUpdateUser = vi.fn();
const mockSetTokens = vi.fn();
const mockClearTokens = vi.fn();
const mockSetKycSessionToken = vi.fn();
const mockClearKycSessionToken = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    updateUser: mockUpdateUser,
  }),
}));

vi.mock('@/services/api', () => ({
  authAPI: {
    confirmPasswordReset: (...args: unknown[]) => mockConfirmPasswordReset(...args),
  },
}));

vi.mock('@/services/auth-manager', () => ({
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  clearTokens: () => mockClearTokens(),
}));

vi.mock('@/services/kyc-session-manager', () => ({
  setKycSessionToken: (...args: unknown[]) => mockSetKycSessionToken(...args),
  clearKycSessionToken: () => mockClearKycSessionToken(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConfirmPasswordResetPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockConfirmPasswordReset.mockReset();
    mockUpdateUser.mockReset();
    mockSetTokens.mockReset();
    mockClearTokens.mockReset();
    mockSetKycSessionToken.mockReset();
    mockClearKycSessionToken.mockReset();
    mockConfirmPasswordReset.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        full_name: 'User Name',
        display_name: null,
        avatar_url: null,
        role: 'tourist',
        status: 'active',
        language: 'ar',
      },
    });
  });

  it('submits OTP confirmation and stores the returned session', async () => {
    render(
      <MemoryRouter>
        <ConfirmPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('OTP Code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reset' }));

    await waitFor(() =>
      expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
        email: 'user@example.com',
        otp: '123456',
        new_password: 'newpassword123',
      }),
    );

    expect(mockSetTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockUpdateUser).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders mismatched-password feedback inline before calling the API', async () => {
    render(
      <MemoryRouter>
        <ConfirmPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('OTP Code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reset' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Passwords do not match');
    expect(alert).toHaveFocus();
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });
});
