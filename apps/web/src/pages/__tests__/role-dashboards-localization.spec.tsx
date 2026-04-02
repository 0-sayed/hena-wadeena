import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseGuideProfile = vi.fn();
const mockUseMyPackages = vi.fn();
const mockUseMyBookings = vi.fn();
const mockUseMyBusinesses = vi.fn();
const mockUseMyListings = vi.fn();
const mockUseListingInquiriesReceived = vi.fn();
const mockUseBusinessInquiriesReceived = vi.fn();
const mockUseMyOpportunities = vi.fn();
const mockUseMyInvestmentApplications = vi.fn();
const mockUseOpportunityApplications = vi.fn();
const mockUseMyRides = vi.fn();
const mockUseCancelRide = vi.fn();
const mockUseActivateRide = vi.fn();
const mockUseDeleteRide = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');

  return {
    ...(actual as object),
    useQueryClient: () => ({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }),
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
  StatCard: ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
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

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked }: { checked?: boolean }) => (
    <input type="checkbox" checked={checked} readOnly />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open = true,
  }: {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({
    children,
    as: Tag = 'span',
    className,
  }: {
    children: ReactNode;
    as?: 'span' | 'p';
    className?: string;
  }) => <Tag className={className}>{children}</Tag>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: null,
  }),
}));

vi.mock('@/hooks/use-my-guide-profile', () => ({
  useMyGuideProfile: () => mockUseGuideProfile(),
}));

vi.mock('@/hooks/use-my-packages', () => ({
  useMyPackages: () => mockUseMyPackages(),
}));

vi.mock('@/hooks/use-my-bookings', () => ({
  useMyBookings: () => mockUseMyBookings(),
}));

vi.mock('@/hooks/use-my-businesses', () => ({
  useMyBusinesses: () => mockUseMyBusinesses(),
}));

vi.mock('@/hooks/use-my-listings', () => ({
  useMyListings: () => mockUseMyListings(),
}));

vi.mock('@/hooks/use-listing-inquiries', () => ({
  useListingInquiriesReceived: () => mockUseListingInquiriesReceived(),
}));

vi.mock('@/hooks/use-business-inquiries', () => ({
  useBusinessInquiriesReceived: () => mockUseBusinessInquiriesReceived(),
}));

vi.mock('@/hooks/use-my-opportunities', () => ({
  useMyOpportunities: () => mockUseMyOpportunities(),
}));

vi.mock('@/hooks/use-investment-applications', () => ({
  useMyInvestmentApplications: () => mockUseMyInvestmentApplications(),
  useOpportunityApplications: () => mockUseOpportunityApplications(),
}));

vi.mock('@/hooks/use-map', () => ({
  useMyRides: () => mockUseMyRides(),
  useCancelRide: () => mockUseCancelRide(),
  useActivateRide: () => mockUseActivateRide(),
  useDeleteRide: () => mockUseDeleteRide(),
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
    myGuideAPI: {
      create: vi.fn(),
      update: vi.fn(),
    },
    myPackagesAPI: {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    bookingsAPI: {
      confirmBooking: vi.fn(),
      startBooking: vi.fn(),
      completeBooking: vi.fn(),
      cancelBooking: vi.fn(),
    },
    listingsAPI: {
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
  };
});

import GuideDashboard from '../roles/GuideDashboard';
import MerchantDashboard from '../roles/MerchantDashboard';
import InvestorDashboard from '../roles/InvestorDashboard';
import DriverDashboard from '../roles/DriverDashboard';

describe('Role dashboard localization', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseGuideProfile.mockReset();
    mockUseMyPackages.mockReset();
    mockUseMyBookings.mockReset();
    mockUseMyBusinesses.mockReset();
    mockUseMyListings.mockReset();
    mockUseListingInquiriesReceived.mockReset();
    mockUseBusinessInquiriesReceived.mockReset();
    mockUseMyOpportunities.mockReset();
    mockUseMyInvestmentApplications.mockReset();
    mockUseOpportunityApplications.mockReset();
    mockUseMyRides.mockReset();
    mockUseCancelRide.mockReset();
    mockUseActivateRide.mockReset();
    mockUseDeleteRide.mockReset();

    mockUseGuideProfile.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseMyPackages.mockReturnValue({
      data: {
        data: [
          {
            id: 'pkg-1',
            titleAr: 'Desert tour',
            durationHours: 4,
            maxPeople: 6,
            price: 250000,
            includes: ['transport'],
          },
        ],
      },
      isLoading: false,
    });
    mockUseMyBookings.mockReturnValue({
      data: {
        data: [
          {
            id: 'booking-1',
            packageId: 'pkg-1',
            bookingDate: '2026-04-05',
            peopleCount: 2,
            totalPrice: 250000,
            status: 'pending',
            packageTitleAr: 'Desert tour',
          },
        ],
      },
      isLoading: false,
    });
    mockUseMyBusinesses.mockReturnValue({
      data: [
        {
          id: 'biz-1',
          nameAr: 'Oasis store',
          category: 'dates',
          district: 'kharga',
          verificationStatus: 'verified',
        },
      ],
      isLoading: false,
      error: null,
    });
    mockUseMyListings.mockReturnValue({
      data: [
        {
          id: 'listing-1',
          titleAr: 'Fresh dates',
          description: 'Direct from the farm',
          price: 20000,
          district: 'kharga',
          status: 'active',
          category: 'shopping',
          address: 'Main street',
        },
      ],
      isLoading: false,
    });
    mockUseListingInquiriesReceived.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'inq-1',
            status: 'pending',
            createdAt: '2026-04-02T08:00:00Z',
            listingTitle: 'Fresh dates',
            contactName: 'Jane',
            contactEmail: 'jane@example.com',
            contactPhone: '+201000000000',
            message: 'Interested',
            replyMessage: null,
            listingId: 'listing-1',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    mockUseBusinessInquiriesReceived.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'biz-inq-1',
            businessId: 'biz-1',
            businessName: 'Oasis store',
            status: 'pending',
            createdAt: '2026-04-02T09:00:00Z',
            contactName: 'Ali',
            contactEmail: 'ali@example.com',
            contactPhone: '+201222222222',
            message: 'Interested in partnering.',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    mockUseMyOpportunities.mockReturnValue({
      data: [
        {
          id: 'opp-1',
          titleAr: 'Eco lodge',
          area: 'Kharga',
          minInvestment: 1000000,
          maxInvestment: 2000000,
          interestCount: 1,
        },
      ],
      isLoading: false,
      error: null,
    });
    mockUseMyInvestmentApplications.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'app-1',
            opportunityId: 'opp-1',
            status: 'pending',
            amountProposed: 1500000,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    mockUseOpportunityApplications.mockReturnValue({
      data: {
        data: [
          {
            id: 'recv-1',
            contactEmail: 'founder@example.com',
            contactPhone: '+201111111111',
            status: 'pending',
            amountProposed: 1200000,
            message: 'Let us talk.',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    mockUseMyRides.mockReturnValue({
      data: {
        asDriver: [
          {
            id: 'ride-1',
            originName: 'Kharga',
            destinationName: 'Dakhla',
            departureTime: '2026-04-03T08:00:00Z',
            seatsTotal: 4,
            seatsTaken: 1,
            pricePerSeat: 5000,
            status: 'open',
          },
        ],
      },
      isLoading: false,
    });
    mockUseCancelRide.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseActivateRide.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mockUseDeleteRide.mockReturnValue({ isPending: false, mutate: vi.fn() });
  });

  it('renders GuideDashboard in English mode', () => {
    render(<GuideDashboard />);

    expect(screen.getByRole('heading', { name: 'Guide dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('Create guide profile')).toBeInTheDocument();
    expect(screen.getByText('License number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create profile' })).toBeInTheDocument();
  });

  it('renders MerchantDashboard in English mode', () => {
    render(<MerchantDashboard />);

    expect(screen.getByRole('heading', { name: 'Merchant dashboard' })).toBeInTheDocument();
    expect(screen.getByText('My businesses')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Add a new listing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage all inquiries' })).toBeInTheDocument();
  });

  it('renders InvestorDashboard in English mode', () => {
    render(<InvestorDashboard />);

    expect(screen.getByRole('heading', { name: 'Investor dashboard' })).toBeInTheDocument();
    expect(screen.getByText('My published opportunities')).toBeInTheDocument();
    expect(screen.getByText('Investment inbox')).toBeInTheDocument();
    expect(screen.getAllByText('Reply by email')).toHaveLength(2);
    expect(screen.getByText('Startup inquiry inbox')).toBeInTheDocument();
    expect(screen.getByText('Sent inquiries')).toBeInTheDocument();
  });

  it('renders DriverDashboard in English mode', () => {
    render(<DriverDashboard />);

    expect(screen.getByRole('heading', { name: 'Driver dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Available seats')).toBeInTheDocument();
    expect(screen.getByText('My rides')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  });
});
