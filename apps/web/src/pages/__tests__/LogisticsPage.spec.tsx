import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { UserRole } from '@hena-wadeena/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LogisticsPage from '../LogisticsPage';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUsePois = vi.fn();
const mockUsePoi = vi.fn();
const mockUseRides = vi.fn();
const mockUseMyRides = vi.fn();
const mockUseActivateRide = vi.fn();
const mockUseCancelRide = vi.fn();
const mockUseDeleteRide = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/assets/hero-logistics.jpg', () => ({ default: 'hero-logistics.jpg' }));

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
  LocalTransportTab: () => <div>local-transport</div>,
}));

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: () => <div>map</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
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
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
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
  getAreaDisplayName: (
    area: { nameAr: string; nameEn: string },
    language: 'ar' | 'en' = 'ar',
  ) => (language === 'en' ? area.nameEn : area.nameAr),
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
