import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '../LoginPage';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
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
    login: mockLogin,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginPage pending KYC flow', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogin.mockReset();
  });

  it('redirects pending users to the continuation step instead of the app shell', async () => {
    mockLogin.mockResolvedValue({ status: 'pending_kyc' });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(document.querySelector('#email')!, {
      target: { value: 'guide@example.com' },
    });
    fireEvent.change(document.querySelector('#password')!, {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'guide@example.com',
        password: 'password123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/kyc/continue');
  });

  it('shows a visible forgot-password action on the login page', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Forgot password/i })).toHaveAttribute(
      'href',
      '/password-reset/request',
    );
  });

  it('renders login failures inline and moves focus to the alert', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid credentials');
    expect(alert).toHaveFocus();
  });
});
