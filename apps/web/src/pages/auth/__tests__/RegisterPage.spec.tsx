import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { UserRole } from '@hena-wadeena/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterPage from '../RegisterPage';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

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
    register: mockRegister,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RegisterPage pending KYC flow', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRegister.mockReset();
  });

  it('redirects KYC-required users to the continuation step after registration', async () => {
    mockRegister.mockResolvedValue({ status: 'pending_kyc' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.change(document.querySelector('#fullName')!, { target: { value: 'Guide User' } });
    fireEvent.change(document.querySelector('#email')!, {
      target: { value: 'guide@example.com' },
    });
    fireEvent.change(document.querySelector('#password')!, {
      target: { value: 'password123' },
    });
    fireEvent.change(document.querySelector('#confirmPassword')!, {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /التالي/i }));
    fireEvent.click(screen.getByRole('button', { name: /مرشد سياحي/i }));
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'guide@example.com',
        full_name: 'Guide User',
        password: 'password123',
        role: UserRole.GUIDE,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/kyc/continue');
  });

  it('shows inline field errors with accessible associations on invalid step-one input', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /التالي/i }));

    const emailInput = screen.getByLabelText('البريد الإلكتروني *');
    const emailError = await screen.findByText('البريد الإلكتروني مطلوب');

    expect(screen.getByLabelText('الاسم الكامل *')).toHaveFocus();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(emailError).toHaveAttribute('id', 'email-error');
  });
});
