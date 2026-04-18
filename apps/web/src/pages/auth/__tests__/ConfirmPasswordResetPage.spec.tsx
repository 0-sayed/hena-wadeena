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

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('رمز OTP'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التعيين' }));

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

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('رمز OTP'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'different-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التعيين' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('كلمتا المرور غير متطابقتين');
    expect(alert).toHaveFocus();
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it('shows a friendly inline error when the backend rejects reusing the same password', async () => {
    mockConfirmPasswordReset.mockRejectedValue(
      new Error('New password must be different from current password'),
    );

    render(
      <MemoryRouter>
        <ConfirmPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('رمز OTP'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'same-password123' },
    });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'same-password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التعيين' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية');
  });

  it('localizes known reset OTP errors instead of showing raw backend text', async () => {
    mockConfirmPasswordReset.mockRejectedValue(new Error('Invalid or expired OTP'));

    render(
      <MemoryRouter>
        <ConfirmPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('رمز OTP'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التعيين' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('رمز OTP غير صالح أو منتهي الصلاحية');
    expect(alert).not.toHaveTextContent('Invalid or expired OTP');
  });

  it('falls back to a generic Arabic error for unknown backend messages', async () => {
    mockConfirmPasswordReset.mockRejectedValue(new Error('Some unexpected backend failure'));

    render(
      <MemoryRouter>
        <ConfirmPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('رمز OTP'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد إعادة التعيين' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذر إكمال إعادة التعيين');
    expect(alert).not.toHaveTextContent('Some unexpected backend failure');
  });
});
