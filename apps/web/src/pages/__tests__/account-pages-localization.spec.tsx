import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

const mockUseAuth = vi.fn();
const mockUseMyBookings = vi.fn();
const mockUseConfirmBooking = vi.fn();
const mockUseStartBooking = vi.fn();
const mockUseCancelBooking = vi.fn();
const mockUseCompleteBooking = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  GradientMesh: () => null,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children, as: Tag = 'span', className }: {
    children: ReactNode;
    as?: 'span' | 'p';
    className?: string;
  }) => <Tag className={className}>{children}</Tag>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-my-bookings', () => ({
  useMyBookings: (...args: unknown[]) => mockUseMyBookings(...args),
}));

vi.mock('@/hooks/use-bookings', () => ({
  useConfirmBooking: () => mockUseConfirmBooking(),
  useStartBooking: () => mockUseStartBooking(),
  useCancelBooking: () => mockUseCancelBooking(),
  useCompleteBooking: () => mockUseCompleteBooking(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    authAPI: {
      updateMe: vi.fn(),
    },
  };
});

import ProfilePage from '../profile/ProfilePage';
import BookingsPage from '../profile/BookingsPage';

describe('Account page localization', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseMyBookings.mockReset();
    mockUseConfirmBooking.mockReset();
    mockUseStartBooking.mockReset();
    mockUseCancelBooking.mockReset();
    mockUseCompleteBooking.mockReset();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'investor@example.com',
        phone: '+201000000000',
        full_name: 'John Doe',
        avatar_url: null,
        role: UserRole.INVESTOR,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
      isLoading: false,
      language: 'en',
      direction: 'ltr',
      updateUser: vi.fn(),
    });

    mockUseConfirmBooking.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseStartBooking.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseCancelBooking.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseCompleteBooking.mockReturnValue({ isPending: false, mutate: vi.fn() });
  });

  it('renders ProfilePage in English mode', () => {
    render(<ProfilePage />);

    expect(screen.getByText('Investor')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone number')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('renders BookingsPage in English mode and localizes the cancel dialog', () => {
    mockUseMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: 'booking-12345678',
            packageTitleAr: 'Sunrise Tour',
            bookingDate: '2026-04-05',
            startTime: '09:00:00',
            peopleCount: 3,
            totalPrice: 150000,
            status: 'confirmed',
            notes: null,
            cancelReason: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<BookingsPage />);

    expect(screen.getByRole('heading', { name: 'My bookings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In progress' })).toBeInTheDocument();
    expect(screen.getByText('Booking #booking-')).toBeInTheDocument();
    expect(screen.getByText('3 people')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Cancel booking')).toBeInTheDocument();
    expect(screen.getByText('Please share the cancellation reason')).toBeInTheDocument();
    expect(screen.getByText('Cancellation reason (Required)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeInTheDocument();
  });
});
