import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

import StartupDetailsPage from '../StartupDetailsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUseBusiness = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'startup-1' }),
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type = 'button',
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit';
  }) => (
    <button type={type} onClick={onClick}>
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-businesses', () => ({
  useBusiness: (...args: unknown[]) => mockUseBusiness(...args),
}));

describe('StartupDetailsPage', () => {
  const baseStartup = {
    id: 'startup-1',
    nameAr: 'Palm Tech',
    nameEn: 'Palm Tech',
    category: 'AgriTech',
    description: 'Startup description',
    descriptionAr: 'وصف عربي',
    district: 'kharga',
    phone: '01000000000',
    website: 'https://startup.example.com',
    logoUrl: null,
    status: 'active',
    verificationStatus: 'verified',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
    deletedAt: null,
    commodities: [],
  };

  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockUseBusiness.mockReset();

    mockUseAuth.mockReturnValue({
      language: 'en',
      isAuthenticated: true,
      user: {
        id: 'merchant-1',
        full_name: 'Merchant User',
        email: 'merchant@example.com',
        phone: '01000000000',
        role: UserRole.MERCHANT,
      },
    });

    mockUseBusiness.mockReturnValue({
      data: baseStartup,
      isLoading: false,
      isError: false,
    });
  });

  it('hides the startup inquiry CTA for merchants', () => {
    render(<StartupDetailsPage />);

    expect(screen.queryByRole('button', { name: 'Send inquiry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visit website' })).toBeInTheDocument();
  });

  it('opens safe startup website URLs only', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<StartupDetailsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Visit website' }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://startup.example.com',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });

  it('ignores unsafe startup website URLs', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    mockUseBusiness.mockReturnValue({
      data: { ...baseStartup, website: 'javascript:alert(1)' },
      isLoading: false,
      isError: false,
    });

    render(<StartupDetailsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Visit website' }));

    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
