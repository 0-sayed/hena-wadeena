import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RequestPasswordResetPage from '../RequestPasswordResetPage';

const mockRequestPasswordReset = vi.fn();

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

vi.mock('@/services/api', () => ({
  authAPI: {
    requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RequestPasswordResetPage', () => {
  beforeEach(() => {
    mockRequestPasswordReset.mockReset();
    mockRequestPasswordReset.mockResolvedValue({ message: 'ok' });
  });

  it('submits the email to the password reset request endpoint', async () => {
    render(
      <MemoryRouter>
        <RequestPasswordResetPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الرمز' }));

    await waitFor(() =>
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' }),
    );
  });
});
