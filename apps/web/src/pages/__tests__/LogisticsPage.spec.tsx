import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserRole } from '@hena-wadeena/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LogisticsPage from '../LogisticsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUsePoi = vi.fn();
const mockUsePois = vi.fn();
const mockUseRides = vi.fn();
const mockUseMyRides = vi.fn();
const mockUseActivateRide = vi.fn();
const mockUseCancelRide = vi.fn();
const mockUseDeleteRide = vi.fn();

const samplePoi = {
  id: 'poi-1',
  nameAr: 'مستشفى الخارجة العام',
  nameEn: 'Kharga General Hospital',
  description: 'المستشفى الرئيسي في مدينة الخارجة',
  category: 'service' as const,
  location: { x: 30.546, y: 25.451 },
  address: 'شارع جمال عبد الناصر، الخارجة',
  phone: '20924921234+',
  website: 'khargahospital.example.com',
  images: ['/poi.jpg'],
  ratingAvg: '4.7',
  ratingCount: 120,
  status: 'approved' as const,
  submittedBy: null,
  approvedBy: null,
  createdAt: '',
  updatedAt: null,
  deletedAt: null,
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
  notes: null,
  origin: { x: 30.55, y: 25.44 },
  destination: { x: 28.98, y: 25.49 },
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('lucide-react', () => {
  const createIcon = (name: string) => () => (
    <svg aria-hidden="true" data-testid={`icon-${name}`} />
  );

  return {
    MapPin: createIcon('map-pin'),
    Clock: createIcon('clock'),
    Car: createIcon('car'),
    Bus: createIcon('bus'),
    Map: createIcon('map'),
    Search: createIcon('search'),
    LocateFixed: createIcon('locate-fixed'),
    ArrowLeft: createIcon('arrow-left'),
    Phone: createIcon('phone'),
    Globe: createIcon('globe'),
    Star: createIcon('star'),
    Plus: createIcon('plus'),
    ExternalLink: createIcon('external-link'),
  };
});

vi.mock('@/assets/hero-logistics.jpg', () => ({ default: 'hero-logistics.jpg' }));

vi.mock('@/components/ui/ltr-text', () => ({
  LtrText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/lib/localization', () => ({
  pickLocalizedCopy: (_lang: string, copies: { ar: string; en: string }) => copies.ar,
  pickLocalizedField: (_lang: string, fields: { ar: string; en?: string | null }) => fields.ar,
}));

vi.mock('@/lib/maps', () => ({
  buildGoogleMapsLocationUrl: (lat: number, lng: number) =>
    `https://www.google.com/maps?q=${lat},${lng}`,
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock('@/components/logistics/LocalTransportTab', () => ({
  LocalTransportTab: () => <div>local transport</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: ({
    locations,
    onMarkerClick,
    popupTrigger,
    showGoogleMapsButton,
  }: {
    locations: Array<{ id: string | number; name: string }>;
    onMarkerClick?: (location: { id: string | number; name: string }) => void;
    popupTrigger?: 'click' | 'hover' | 'both';
    showGoogleMapsButton?: boolean;
  }) => (
    <div>
      <div data-testid="map-cta-flag">{String(showGoogleMapsButton ?? true)}</div>
      <div data-testid="map-popup-trigger">{popupTrigger ?? 'click'}</div>
      <button onClick={() => locations[0] && onMarkerClick?.(locations[0])}>open poi</button>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    asChild,
    disabled,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) =>
    asChild ? (
      children
    ) : (
      <button type={type} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    onChange,
    placeholder,
  }: {
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => <input placeholder={placeholder} onChange={onChange} />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebouncedCallback: (callback: (value: string) => void) => callback,
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
}));

vi.mock('@/lib/area-presets', () => ({
  AREA_PRESETS: [
    { id: 'kharga', nameAr: 'الخارجة', nameEn: 'Al-Kharga', lat: 25.44, lng: 30.55 },
    { id: 'dakhla', nameAr: 'الداخلة', nameEn: 'Al-Dakhla', lat: 25.49, lng: 28.98 },
  ],
  findArea: (id: string) =>
    id
      ? {
          id,
          nameAr: id === 'kharga' ? 'الخارجة' : 'الداخلة',
          nameEn: id === 'kharga' ? 'Al-Kharga' : 'Al-Dakhla',
          lat: 25.44,
          lng: 30.55,
        }
      : undefined,
  getAreaDisplayName: (area: { nameAr: string; nameEn: string }, language: 'ar' | 'en' = 'ar') =>
    language === 'en' ? area.nameEn : area.nameAr,
  localizeAreaName: (value: string) => value,
}));

vi.mock('@/lib/format', () => ({
  formatRidePrice: () => '250 EGP',
}));

vi.mock('@/lib/dates', () => ({
  formatDateTimeShort: () => '2026-04-02 10:00',
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('LogisticsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockUsePois.mockReset();
    mockUsePoi.mockReset();
    mockUseRides.mockReset();
    mockUseMyRides.mockReset();
    mockUseActivateRide.mockReset();
    mockUseCancelRide.mockReset();
    mockUseDeleteRide.mockReset();

    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      direction: 'rtl',
    });
    mockUsePois.mockReturnValue({
      data: { data: [samplePoi], total: 1 },
      isLoading: false,
    });
    mockUsePoi.mockImplementation((id?: string) => ({
      data: id ? samplePoi : undefined,
    }));
    mockUseRides.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    mockUseMyRides.mockReturnValue({ data: undefined });
    mockUseActivateRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCancelRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseDeleteRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('opens the poi detail sheet when a map marker is clicked', () => {
    render(<LogisticsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'open poi' }));

    expect(screen.getByText('مستشفى الخارجة العام')).toBeInTheDocument();
  });

  it('keeps the map clean and puts the google maps action inside the selected poi sheet', () => {
    render(<LogisticsPage />);

    expect(screen.getByTestId('map-cta-flag')).toHaveTextContent('false');
    expect(screen.getByTestId('map-popup-trigger')).toHaveTextContent('both');

    fireEvent.click(screen.getByRole('button', { name: 'open poi' }));

    const mapsLink = screen.getByRole('link', { name: /google maps/i });
    expect(mapsLink).toHaveAttribute('href', 'https://www.google.com/maps?q=25.451,30.546');
    expect(screen.getByText('مستشفى الخارجة العام')).toBeInTheDocument();
  });

  it('shows a clear empty state when near me returns no pois', () => {
    const getCurrentPosition = vi.fn((success: (position: GeolocationPosition) => void) => {
      success({
        coords: {
          latitude: 30.0444,
          longitude: 31.2357,
        },
      } as GeolocationPosition);
    });

    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    mockUsePois.mockImplementation((filters?: { lat?: number; lng?: number }) => ({
      data: filters?.lat && filters?.lng ? { data: [], total: 0 } : { data: [samplePoi], total: 1 },
      isLoading: false,
    }));

    render(<LogisticsPage />);

    fireEvent.click(screen.getByRole('button', { name: /بالقرب مني/i }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    const overlay = screen.getByTestId('nearby-empty-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay.className).toContain('z-[1000]');
    expect(overlay).toHaveTextContent(
      'لا توجد أماكن ضمن 50 كم من موقعك الحالي. اعرض جميع الأماكن في الوادي الجديد.',
    );
    expect(screen.getAllByRole('button', { name: 'إلغاء الموقع' })).toHaveLength(2);
  });

  it('uses a distinct transport icon for the local transport tab', () => {
    render(<LogisticsPage />);

    const carpoolTab = screen.getByRole('button', { name: 'مشاركة الرحلات' });
    const localTransportTab = screen.getByRole('button', { name: 'النقل المحلي' });

    expect(carpoolTab.querySelector('[data-testid="icon-car"]')).not.toBeNull();
    expect(localTransportTab.querySelector('[data-testid="icon-car"]')).toBeNull();
    expect(localTransportTab.querySelector('[data-testid="icon-bus"]')).not.toBeNull();
  });
});

describe('LogisticsPage ride creation access', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseAuth.mockReset();
    mockUsePois.mockReset();
    mockUsePoi.mockReset();
    mockUseRides.mockReset();
    mockUseMyRides.mockReset();
    mockUseActivateRide.mockReset();
    mockUseCancelRide.mockReset();
    mockUseDeleteRide.mockReset();

    mockUsePois.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    mockUsePoi.mockReturnValue({ data: undefined });
    mockUseRides.mockReturnValue({ data: { data: [baseRide], total: 1 }, isLoading: false });
    mockUseMyRides.mockReturnValue({ data: { asDriver: [], asPassenger: [] } });
    mockUseActivateRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCancelRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseDeleteRide.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('hides the add-trip action from unauthorized roles', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'tourist-1', role: UserRole.TOURIST },
      isAuthenticated: true,
      language: 'ar',
      direction: 'rtl',
    });

    render(<LogisticsPage />);

    expect(screen.queryByRole('button', { name: /أضف رحلتك/i })).not.toBeInTheDocument();
  });

  it('shows the add-trip action for drivers', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'driver-1', role: UserRole.DRIVER },
      isAuthenticated: true,
      language: 'ar',
      direction: 'rtl',
    });

    render(<LogisticsPage />);

    expect(screen.getByRole('button', { name: /أضف رحلتك/i })).toBeInTheDocument();
  });
});
