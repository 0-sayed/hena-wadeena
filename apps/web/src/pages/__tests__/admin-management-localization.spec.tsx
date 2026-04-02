import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAdminGuides = vi.fn();
const mockUseAdminBookings = vi.fn();
const mockUseAdminPendingPois = vi.fn();
const mockUseCommodities = vi.fn();
const mockUseCommodity = vi.fn();
const mockLogout = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
    NavLink: ({
      children,
      to,
      className,
    }: {
      children: ReactNode;
      to: string;
      className?: string | ((options: { isActive: boolean }) => string);
    }) => (
      <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>
        {children}
      </a>
    ),
    Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
    Outlet: () => <div>admin-outlet</div>,
  };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
    asChild,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    asChild?: boolean;
  }) => {
    if (asChild) {
      return <div>{children}</div>;
    }

    return (
      <button type={type} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    placeholder,
    onChange,
  }: {
    id?: string;
    value?: string;
    placeholder?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }) => (
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      readOnly={!onChange}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan, className }: { children: ReactNode; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children, className }: { children: ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, placeholder }: { value?: string; placeholder?: string }) => (
    <textarea value={value} placeholder={placeholder} readOnly />
  ),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    language: 'en',
    direction: 'ltr',
    user: {
      role: 'admin',
      full_name: 'Admin User',
    },
    logout: mockLogout,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/use-admin', () => ({
  useAdminGuides: (...args: unknown[]) => mockUseAdminGuides(...args),
  useAdminBookings: (...args: unknown[]) => mockUseAdminBookings(...args),
  useAdminPendingPois: (...args: unknown[]) => mockUseAdminPendingPois(...args),
  useVerifyGuideLicense: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useSetGuideStatus: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useAdminCancelBooking: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useApprovePoi: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useRejectPoi: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-commodities', () => ({
  useCommodities: () => mockUseCommodities(),
  useCommodity: (id: string | undefined) => mockUseCommodity(id),
}));

vi.mock('@/services/api', () => ({
  commoditiesAPI: {
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  },
  commodityPricesAPI: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import AdminCrops from '../admin/AdminCrops';
import AdminGuides from '../admin/AdminGuides';
import AdminLayout from '../admin/AdminLayout';
import AdminMap from '../admin/AdminMap';

describe('Admin management localization', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockReset();
    mockLogout.mockReset();
    mockUseAdminGuides.mockReset();
    mockUseAdminBookings.mockReset();
    mockUseAdminPendingPois.mockReset();
    mockUseCommodities.mockReset();
    mockUseCommodity.mockReset();

    mockUseAdminGuides.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'guide-1',
            bioAr: 'مرشد الصحراء',
            bioEn: 'Desert guide',
            profileImage: null,
            ratingAvg: 4.8,
            ratingCount: 24,
            licenseVerified: true,
            active: true,
            packageCount: 3,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseAdminBookings.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'booking-1',
            packageId: 'pkg-1',
            packageTitleAr: 'رحلة الواحات',
            packageTitleEn: 'Oasis adventure',
            bookingDate: '2026-04-02T10:00:00.000Z',
            peopleCount: 2,
            totalPrice: 150000,
            status: 'confirmed',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseAdminPendingPois.mockReturnValue({
      data: {
        total: 1,
        data: [
          {
            id: 'poi-1',
            nameAr: 'معبد هيبس',
            nameEn: 'Hibis Temple',
            category: 'historical',
            location: { x: 30.5467, y: 25.4478 },
            createdAt: '2026-04-02T10:00:00.000Z',
            description: 'Historic site',
            address: 'Kharga Oasis',
            phone: '+20 100 000 0000',
            website: 'https://example.com',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    mockUseCommodities.mockReturnValue({
      data: [
        {
          id: 'commodity-1',
          nameAr: 'بلح',
          nameEn: 'Dates',
          category: 'fruits',
          unit: 'kg',
          sortOrder: 1,
        },
      ],
      isLoading: false,
    });

    mockUseCommodity.mockReturnValue({
      data: {
        id: 'commodity-1',
        nameAr: 'بلح',
        nameEn: 'Dates',
        category: 'fruits',
        unit: 'kg',
        latestPricesByRegion: [
          {
            id: 'price-1',
            region: 'kharga',
            price_type: 'retail',
            price: 2500,
            recorded_at: '2026-04-02T10:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    });
  });

  it('renders AdminLayout in English mode', () => {
    render(<AdminLayout />);

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Back to home')).toBeInTheDocument();
    expect(screen.getAllByText('Profile')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Logout')[0]).toBeInTheDocument();
    expect(screen.getByText('Welcome,')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('renders AdminGuides in English mode', () => {
    render(<AdminGuides />);

    expect(screen.getByRole('heading', { name: 'Guide management' })).toBeInTheDocument();
    expect(screen.getByText('Manage guides and booking operations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guides/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bookings/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guide list' })).toBeInTheDocument();
    expect(screen.getByText('Desert guide')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bookings' })).toBeInTheDocument();
    expect(screen.getAllByText('All statuses')[0]).toBeInTheDocument();
    expect(screen.getByText('Oasis adventure')).toBeInTheDocument();
    expect(screen.getAllByText('Confirmed')[0]).toBeInTheDocument();
    expect(screen.getAllByText('EGP')[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(screen.getByText('Please enter a cancellation reason')).toBeInTheDocument();
  });

  it('renders AdminMap in English mode', () => {
    render(<AdminMap />);

    expect(
      screen.getByRole('heading', { name: 'Point-of-interest management' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Review user-submitted points of interest')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pending points of interest' })).toBeInTheDocument();
    expect(screen.getByText('1 point awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Hibis Temple')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hibis Temple'));

    expect(screen.getByText('English name:')).toBeInTheDocument();
    expect(screen.getByText('Description:')).toBeInTheDocument();
    expect(screen.getByText('Address:')).toBeInTheDocument();
    expect(screen.getByText('Phone:')).toBeInTheDocument();
    expect(screen.getByText('Website:')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reject point of interest' })).toBeInTheDocument();
    expect(screen.getByText('Provide a rejection reason (optional)')).toBeInTheDocument();
  });

  it('renders AdminCrops in English mode', () => {
    render(<AdminCrops />);

    expect(screen.getByRole('heading', { name: 'Crop and price management' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use the same crop catalogue shown in the market, and manage prices from contextual dialogs instead of fixed forms.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add crop/ })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add price/ })[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active crops' })).toBeInTheDocument();
    expect(screen.getAllByText('Dates')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fruits')[0]).toBeInTheDocument();
    expect(screen.getAllByText('kg')[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Latest prices for the selected crop' })).toBeInTheDocument();
    expect(screen.getAllByText('Kharga')[0]).toBeInTheDocument();
    expect(screen.getAllByText('25')[0]).toBeInTheDocument();
    expect(screen.getAllByText('EGP')[0]).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add a new crop' })).toBeInTheDocument();
    expect(screen.getByText('Any update here is reflected directly on the market page and supplier directory.')).toBeInTheDocument();
    expect(screen.getByLabelText('Arabic name')).toBeInTheDocument();
    expect(screen.getByLabelText('English name')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort order')).toBeInTheDocument();
  });
});
