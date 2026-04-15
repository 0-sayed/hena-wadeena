import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseMyBookings = vi.fn();
const mockUseListings = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle: string;
    children: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
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
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: null,
  }),
}));

vi.mock('@/hooks/use-my-bookings', () => ({
  useMyBookings: () => mockUseMyBookings(),
}));

vi.mock('@/hooks/use-listings', () => ({
  useListings: (...args: unknown[]) => mockUseListings(...args),
}));

import TouristDashboard from '../roles/TouristDashboard';
import ResidentDashboard from '../roles/ResidentDashboard';
import StudentDashboard from '../roles/StudentDashboard';

describe('Secondary dashboard localization', () => {
  beforeEach(() => {
    mockUseMyBookings.mockReset();
    mockUseListings.mockReset();

    mockUseMyBookings.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'booking-12345678',
            packageId: 'pkg-1',
            bookingDate: '2026-04-05',
            peopleCount: 2,
            totalPrice: 120000,
            status: 'confirmed',
            packageTitleAr: 'Oasis trip',
            packageTitleEn: 'Oasis trip',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseListings.mockImplementation((params?: { category?: string }) => {
      if (params?.category === 'accommodation') {
        return {
          data: {
            data: [
              {
                id: 'listing-1',
                titleAr: 'Student housing',
                titleEn: 'Student housing',
                price: 300000,
                priceUnit: 'month',
                district: 'kharga',
                transaction: 'rent',
                images: ['/placeholder.jpg'],
              },
            ],
          },
          isLoading: false,
          error: null,
        };
      }

      return {
        data: {
          total: 1,
          data: [
            {
              id: 'listing-2',
              titleAr: 'Local shop',
              titleEn: 'Local shop',
              category: 'shopping',
              district: 'kharga',
              isVerified: true,
            },
          ],
        },
        isLoading: false,
        error: null,
      };
    });
  });

  it('renders TouristDashboard and BookingsCard in English mode', () => {
    render(<TouristDashboard />);

    expect(screen.getByRole('heading', { name: 'Tourist dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Total bookings')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('My bookings')).toBeInTheDocument();
  });

  it('renders ResidentDashboard in English mode', () => {
    render(<ResidentDashboard />);

    expect(screen.getByRole('heading', { name: 'Resident dashboard' })).toBeInTheDocument();
    expect(screen.getAllByText('Latest listings').length).toBeGreaterThan(0);
    expect(screen.getByText('Government services')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders StudentDashboard in English mode', () => {
    render(<StudentDashboard />);

    expect(screen.getByRole('heading', { name: 'Student dashboard' })).toBeInTheDocument();
    expect(screen.getAllByText('My bookings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Housing').length).toBeGreaterThan(0);
    expect(screen.getByText('Find housing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all housing' })).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });
});
