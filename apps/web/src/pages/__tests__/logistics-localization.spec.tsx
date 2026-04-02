import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockCreateBusiness = vi.fn();
const mockUpdateBusiness = vi.fn();
const mockRemoveBusiness = vi.fn();

const mockUseAuth = vi.fn();
const mockUsePois = vi.fn();
const mockUsePoi = vi.fn();
const mockUseRides = vi.fn();
const mockUseMyRides = vi.fn();
const mockUseActivateRide = vi.fn();
const mockUseCancelRide = vi.fn();
const mockUseDeleteRide = vi.fn();
const mockUseRide = vi.fn();
const mockUseJoinRide = vi.fn();
const mockUseCancelJoin = vi.fn();
const mockUseConfirmPassenger = vi.fn();
const mockUseDeclinePassenger = vi.fn();
const mockUseCreateRide = vi.fn();
const mockUseBusinesses = vi.fn();

const mockRouteParams = { id: 'ride-1' };

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => mockRouteParams,
  };
});

vi.mock('@/assets/hero-logistics.jpg', () => ({ default: 'hero-logistics.jpg' }));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: ({
    locations = [],
    onMarkerClick,
  }: {
    locations?: Array<{ id: string; name: string }>;
    onMarkerClick?: (location: { id: string; name: string }) => void;
  }) => (
    <div>
      <div>interactive-map</div>
      {locations.map((location) => (
        <button key={location.id} type="button" onClick={() => onMarkerClick?.(location)}>
          marker:{location.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/LoadMoreButton', () => ({
  LoadMoreButton: () => <div>load-more</div>,
}));

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

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    placeholder,
    onChange,
    type = 'text',
    min,
    max,
    required,
  }: {
    id?: string;
    value?: string;
    placeholder?: string;
    onChange?: (event: { target: { value: string } }) => void;
    type?: string;
    min?: string;
    max?: string;
    required?: boolean;
  }) => (
    <input
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      type={type}
      min={min}
      max={max}
      required={required}
      readOnly={!onChange}
    />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
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
    <textarea id={id} value={value} placeholder={placeholder} onChange={onChange} readOnly={!onChange} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <div onClick={onClick}>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open = true }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
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

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open = true }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebouncedCallback: (fn: (value: string) => void) => fn,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-map', () => ({
  usePois: (...args: unknown[]) => mockUsePois(...args),
  usePoi: (...args: unknown[]) => mockUsePoi(...args),
  useRides: (...args: unknown[]) => mockUseRides(...args),
  useMyRides: (...args: unknown[]) => mockUseMyRides(...args),
  useActivateRide: () => mockUseActivateRide(),
  useCancelRide: () => mockUseCancelRide(),
  useDeleteRide: () => mockUseDeleteRide(),
  useRide: (...args: unknown[]) => mockUseRide(...args),
  useJoinRide: () => mockUseJoinRide(),
  useCancelJoin: () => mockUseCancelJoin(),
  useConfirmPassenger: () => mockUseConfirmPassenger(),
  useDeclinePassenger: () => mockUseDeclinePassenger(),
  useCreateRide: () => mockUseCreateRide(),
}));

vi.mock('@/hooks/use-businesses', () => ({
  useBusinesses: (...args: unknown[]) => mockUseBusinesses(...args),
}));

vi.mock('@/services/api', () => ({
  businessesAPI: {
    create: (...args: unknown[]) => mockCreateBusiness(...args),
    update: (...args: unknown[]) => mockUpdateBusiness(...args),
    remove: (...args: unknown[]) => mockRemoveBusiness(...args),
  },
}));

vi.mock('@/lib/maps', () => ({
  buildGoogleMapsDirectionsUrl: () => 'https://maps.example.com/directions',
}));

vi.mock('@/lib/area-presets', () => ({
  AREA_PRESETS: [
    { id: 'kharga', nameAr: 'الخارجة', nameEn: 'Al-Kharga', lat: 25.439, lng: 30.5503 },
    { id: 'dakhla', nameAr: 'الداخلة', nameEn: 'Al-Dakhla', lat: 25.4948, lng: 29.0009 },
  ],
  getAreaDisplayName: (
    area: { nameAr: string; nameEn: string },
    language: 'ar' | 'en' = 'ar',
  ) => (language === 'en' ? area.nameEn : area.nameAr),
  localizeAreaName: (value: string, language: 'ar' | 'en' = 'ar') => {
    const areas = {
      الخارجة: { ar: 'الخارجة', en: 'Al-Kharga' },
      kharga: { ar: 'الخارجة', en: 'Al-Kharga' },
      'al-kharga': { ar: 'الخارجة', en: 'Al-Kharga' },
      الداخلة: { ar: 'الداخلة', en: 'Al-Dakhla' },
      dakhla: { ar: 'الداخلة', en: 'Al-Dakhla' },
      'al-dakhla': { ar: 'الداخلة', en: 'Al-Dakhla' },
    } as const;

    const localized = areas[value.toLowerCase() as keyof typeof areas];

    return localized ? (language === 'en' ? localized.en : localized.ar) : value;
  },
  findArea: (id: string) => {
    const areas = {
      kharga: { id: 'kharga', nameAr: 'الخارجة', nameEn: 'Al-Kharga', lat: 25.439, lng: 30.5503 },
      dakhla: { id: 'dakhla', nameAr: 'الداخلة', nameEn: 'Al-Dakhla', lat: 25.4948, lng: 29.0009 },
    };

    return areas[id as keyof typeof areas];
  },
}));

vi.mock('@/lib/format', () => ({
  formatRidePrice: (_piasters: number, language: 'ar' | 'en' = 'ar') =>
    language === 'en' ? '250 EGP' : '250 جنيه',
  districtLabel: (district: string, language: 'ar' | 'en' = 'ar') => {
    const english: Record<string, string> = { kharga: 'Kharga', dakhla: 'Dakhla' };
    const arabic: Record<string, string> = { kharga: 'الخارجة', dakhla: 'الداخلة' };

    return language === 'en' ? (english[district] ?? district) : (arabic[district] ?? district);
  },
  DISTRICTS: [
    { id: 'kharga', name: 'الخارجة' },
    { id: 'dakhla', name: 'الداخلة' },
  ],
}));

vi.mock('@/lib/dates', () => ({
  formatDateTimeShort: (_date: string, language: 'ar' | 'en' = 'ar') =>
    language === 'en' ? 'Thu, Apr 2, 10:00 AM' : 'الخميس، 2 أبريل، 10:00 ص',
  formatDateTimeFull: (_date: string, language: 'ar' | 'en' = 'ar') =>
    language === 'en' ? 'Thursday, April 2, 2026 at 10:00 AM' : 'الخميس، 2 أبريل 2026، 10:00 ص',
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { LocalTransportTab } from '@/components/logistics/LocalTransportTab';
import LogisticsPage from '../LogisticsPage';
import CreateRidePage from '../logistics/CreateRidePage';
import RideDetailPage from '../logistics/RideDetailPage';

const poiRecord = {
  id: 'poi-1',
  nameAr: 'معبد هيبس',
  nameEn: 'Hibis Temple',
  category: 'historical' as const,
  location: { x: 30.5467, y: 25.4478 },
  description: 'Historic temple in Kharga Oasis',
  address: 'Kharga Oasis',
  phone: '+20 100 000 0000',
  website: 'hibis.example.com',
  ratingAvg: 4.8,
  ratingCount: 12,
  images: ['https://example.com/hibis.jpg'],
};

const baseRide = {
  id: 'ride-1',
  driverId: 'driver-1',
  originName: 'الخارجة',
  destinationName: 'الداخلة',
  departureTime: '2026-04-02T10:00:00.000Z',
  seatsTotal: 4,
  seatsTaken: 1,
  pricePerSeat: 25000,
  status: 'open' as const,
  notes: 'Bring water',
  origin: { x: 30.5503, y: 25.439 },
  destination: { x: 29.0009, y: 25.4948 },
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

describe('Logistics localization', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockInvalidateQueries.mockReset();
    mockCreateBusiness.mockReset();
    mockUpdateBusiness.mockReset();
    mockRemoveBusiness.mockReset();
    mockUseAuth.mockReset();
    mockUsePois.mockReset();
    mockUsePoi.mockReset();
    mockUseRides.mockReset();
    mockUseMyRides.mockReset();
    mockUseActivateRide.mockReset();
    mockUseCancelRide.mockReset();
    mockUseDeleteRide.mockReset();
    mockUseRide.mockReset();
    mockUseJoinRide.mockReset();
    mockUseCancelJoin.mockReset();
    mockUseConfirmPassenger.mockReset();
    mockUseDeclinePassenger.mockReset();
    mockUseCreateRide.mockReset();
    mockUseBusinesses.mockReset();

    mockUseAuth.mockReturnValue({
      language: 'en',
      direction: 'ltr',
      isAuthenticated: true,
      user: {
        id: 'driver-1',
        role: UserRole.ADMIN,
        full_name: 'Admin User',
      },
    });

    mockUsePois.mockReturnValue({
      data: { data: [poiRecord], total: 1 },
      isLoading: false,
    });

    mockUsePoi.mockImplementation((id: string | undefined) => ({
      data: id ? poiRecord : undefined,
    }));

    mockUseRides.mockReturnValue({
      data: { data: [baseRide], total: 1 },
      isLoading: false,
    });

    mockUseMyRides.mockReturnValue({
      data: {
        asDriver: [baseRide],
        asPassenger: [
          {
            id: 'passenger-1',
            rideId: 'ride-2',
            seats: 2,
            status: 'confirmed',
          },
        ],
      },
      isSuccess: true,
    });

    mockUseActivateRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCancelRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseDeleteRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseJoinRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCancelJoin.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseConfirmPassenger.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseDeclinePassenger.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCreateRide.mockReturnValue({ mutate: vi.fn(), isPending: false });

    mockUseRide.mockReturnValue({
      data: {
        ...baseRide,
        passengers: [
          {
            id: 'passenger-1',
            seats: 1,
            status: 'requested',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    mockUseBusinesses.mockReturnValue({
      data: [
        {
          id: 'transport-1',
          ownerId: 'owner-1',
          nameAr: 'شركة الوادي',
          nameEn: 'Valley Transport',
          category: 'transport',
          description: 'Main station in Kharga',
          descriptionAr: 'المقر الرئيسي في الخارجة',
          district: 'kharga',
          phone: '+20 100 555 0000',
          website: 'https://transport.example.com',
          logoUrl: null,
          status: 'active',
          verificationStatus: 'verified',
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
  });

  it('renders LogisticsPage in English mode', () => {
    render(<LogisticsPage />);

    expect(screen.getAllByText('Maps & transport')[0]).toBeInTheDocument();
    expect(
      screen.getByText('Discover New Valley landmarks and share your trip with others'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore the map/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Carpool rides/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Local transport/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for a place...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nearby/ })).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('1 results')).toBeInTheDocument();
    expect(screen.getByText('Available rides')).toBeInTheDocument();
    expect(screen.getAllByText('My rides')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Add your ride')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Al-Kharga')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Al-Dakhla')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Thu, Apr 2, 10:00 AM')[0]).toBeInTheDocument();
    expect(screen.getAllByText('250 EGP')[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /My rides/ }));

    expect(screen.getByRole('heading', { name: 'My rides' })).toBeInTheDocument();
    expect(screen.getByText('As driver (1)')).toBeInTheDocument();
    expect(screen.getByText('As passenger (1)')).toBeInTheDocument();
    expect(screen.getByText('2 seats')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /marker:Hibis Temple/ }));

    expect(screen.getByRole('heading', { name: 'Hibis Temple' })).toBeInTheDocument();
    expect(screen.getByText('Historic temple in Kharga Oasis')).toBeInTheDocument();
    expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
  });

  it('renders CreateRidePage in English mode', () => {
    render(<CreateRidePage />);

    expect(screen.getByRole('button', { name: /Back to maps & transport/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create a new ride' })).toBeInTheDocument();
    expect(
      screen.getByText('Share your trip with others and split the cost'),
    ).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Time')).toBeInTheDocument();
    expect(screen.getByLabelText('Available seats')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per seat (EGP) - 0 = free')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional notes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Any extra details about the ride...')).toBeInTheDocument();
    expect(screen.getAllByText('Al-Kharga')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Al-Dakhla')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish ride' })).toBeInTheDocument();
  });

  it('renders RideDetailPage in English mode', () => {
    render(<RideDetailPage />);

    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Thursday, April 2, 2026 at 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 seats available')).toBeInTheDocument();
    expect(screen.getByText('250 EGP')).toBeInTheDocument();
    expect(screen.getByText('Bring water')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel ride' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passengers (1)' })).toBeInTheDocument();
    expect(screen.getByText('1 seat')).toBeInTheDocument();
    expect(screen.getByText('Pending confirmation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline/ })).toBeInTheDocument();
  });

  it('renders LocalTransportTab in English mode', () => {
    render(<LocalTransportTab />);

    expect(screen.getByRole('heading', { name: 'Local transport companies' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Directory of transport and bus companies across New Valley with booking links and contact details.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add transport company/ })).toBeInTheDocument();
    expect(screen.getByText('Valley Transport')).toBeInTheDocument();
    expect(screen.getByText('Kharga')).toBeInTheDocument();
    expect(screen.getByText('Headquarters')).toBeInTheDocument();
    expect(screen.getByText('Main station in Kharga')).toBeInTheDocument();
    expect(screen.getByText('Booking link')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add transport company/ }));

    expect(screen.getByRole('heading', { name: 'Add transport company' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add booking details, contact information, and a logo so the company appears directly in the local transport tab.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.getByLabelText('Headquarters')).toBeInTheDocument();
    expect(screen.getByLabelText('Booking link')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact information')).toBeInTheDocument();
    expect(screen.getByLabelText('General information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload logo/ })).toBeInTheDocument();
    expect(screen.getByText('No logo uploaded yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add company' })).toBeInTheDocument();
  });
});
