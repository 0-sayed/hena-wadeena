import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseAdminUser = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'user-1' }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: (event: { preventDefault: () => void }) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick?.({ preventDefault: () => undefined })}
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: null,
  }),
}));

vi.mock('@/hooks/use-admin', () => ({
  useAdminUser: (...args: unknown[]) => mockUseAdminUser(...args),
  useResetUserPassword: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

import AdminUserDetail from '../admin/AdminUserDetail';

describe('Admin user detail localization', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAdminUser.mockReset();
    mockMutateAsync.mockReset();

    mockUseAdminUser.mockReturnValue({
      data: {
        id: 'user-1',
        fullName: 'Mona Adel',
        avatarUrl: null,
        email: 'mona@example.com',
        phone: '+201000000000',
        role: 'student',
        status: 'active',
        displayName: 'Mona',
        language: 'en',
        kycStatus: 'approved',
        latestKycDocumentType: 'national_id',
        verifiedAt: '2026-04-01T10:00:00.000Z',
        kycSubmittedAt: '2026-03-30T10:00:00.000Z',
        kycReviewedAt: '2026-04-01T10:00:00.000Z',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z',
        lastLoginAt: '2026-04-02T09:00:00.000Z',
        recentAuditEvents: [],
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders AdminUserDetail in English mode', () => {
    render(<AdminUserDetail />);

    expect(screen.getByRole('heading', { name: 'Admin user profile' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review the account status, verification details, and activity log, with the option to reset the password.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account details' })).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Current role')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verification and status' })).toBeInTheDocument();
    expect(screen.getByText('KYC status')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByText('No activity has been recorded for this account yet.')).toBeInTheDocument();
  });
});
