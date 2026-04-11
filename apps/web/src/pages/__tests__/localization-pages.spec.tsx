import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@hena-wadeena/types';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn();
const mockUseAttractions = vi.fn();
const mockUseGuides = vi.fn();
const mockUsePublicUsers = vi.fn();
const mockUsePriceIndex = vi.fn();
const mockUsePriceSummary = vi.fn();
const mockUseBusinesses = vi.fn();
const mockUseCommodities = vi.fn();
const mockGetOpportunities = vi.fn();
const mockGetBusinesses = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');

  return {
    ...(actual as object),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@/assets/hero-tourism.jpg', () => ({ default: 'hero-tourism.jpg' }));
vi.mock('@/assets/hero-marketplace.jpg', () => ({ default: 'hero-marketplace.jpg' }));
vi.mock('@/assets/hero-investment.jpg', () => ({ default: 'hero-investment.jpg' }));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children, alt }: { children: ReactNode; alt: string }) => (
    <div>
      <img src="hero" alt={alt} />
      {children}
    </div>
  ),
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  CardSkeleton: () => <div>loading card</div>,
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/LoadMoreButton', () => ({
  LoadMoreButton: () => null,
}));

vi.mock('@/components/market/TrendBadge', () => ({
  TrendBadge: ({ changePercent }: { changePercent: number | null }) => (
    <span>{changePercent == null ? 'No change' : `${changePercent}%`}</span>
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

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked }: { checked?: boolean }) => (
    <input type="checkbox" checked={checked} readOnly />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/use-attractions', () => ({
  useAttractions: (...args: unknown[]) => mockUseAttractions(...args),
}));

vi.mock('@/hooks/use-guides', () => ({
  useGuides: (...args: unknown[]) => mockUseGuides(...args),
}));

vi.mock('@/hooks/use-users', () => ({
  usePublicUsers: (...args: unknown[]) => mockUsePublicUsers(...args),
}));

vi.mock('@/hooks/use-price-index', () => ({
  usePriceIndex: (...args: unknown[]) => mockUsePriceIndex(...args),
  usePriceSummary: () => mockUsePriceSummary(),
}));

vi.mock('@/hooks/use-businesses', () => ({
  useBusinesses: (...args: unknown[]) => mockUseBusinesses(...args),
}));

vi.mock('@/hooks/use-commodities', () => ({
  useCommodities: () => mockUseCommodities(),
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api');

  return {
    ...(actual as object),
    investmentAPI: {
      getOpportunities: () => mockGetOpportunities(),
      getBusinesses: () => mockGetBusinesses(),
    },
  };
});

import TourismPage from '../TourismPage';
import MarketplacePage from '../MarketplacePage';
import InvestmentPage from '../InvestmentPage';

describe('Top-level page localization', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockInvalidateQueries.mockReset();
    mockUseAuth.mockReset();
    mockUseAttractions.mockReset();
    mockUseGuides.mockReset();
    mockUsePublicUsers.mockReset();
    mockUsePriceIndex.mockReset();
    mockUsePriceSummary.mockReset();
    mockUseBusinesses.mockReset();
    mockUseCommodities.mockReset();
    mockGetOpportunities.mockReset();
    mockGetBusinesses.mockReset();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        phone: null,
        full_name: 'John Doe',
        role: UserRole.ADMIN,
        status: 'active',
        language: 'en',
      },
      isAuthenticated: true,
      isLoading: false,
      language: 'en',
      direction: 'ltr',
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      setLanguage: vi.fn(),
    });

    mockUseAttractions.mockImplementation((filters?: { featured?: boolean }) => ({
      data: filters?.featured
        ? [
            {
              id: 'attr-featured',
              slug: 'white-desert',
              thumbnail: null,
              nameAr: 'الصحراء البيضاء',
              nameEn: 'White Desert',
              descriptionAr: 'وصف عربي',
              descriptionEn: 'A surreal desert landscape.',
              type: 'natural',
              ratingAvg: 4.8,
              durationHours: 3,
            },
          ]
        : [
            {
              id: 'attr-all',
              slug: 'hibis-temple',
              thumbnail: null,
              nameAr: 'معبد هيبس',
              nameEn: 'Hibis Temple',
              descriptionAr: 'وصف عربي',
              descriptionEn: 'Ancient temple in Kharga Oasis.',
              type: 'historical',
              ratingAvg: 4.6,
              durationHours: null,
            },
          ],
      isLoading: false,
    }));

    mockUseGuides.mockReturnValue({
      data: [
        {
          id: 'guide-1',
          userId: 'user-guide-1',
          bioAr: 'مرشد عربي',
          bioEn: 'Licensed desert guide.',
          profileImage: null,
          ratingAvg: 4.9,
          ratingCount: 24,
          languages: ['en'],
          specialties: ['history'],
          basePrice: 150000,
        },
      ],
      isLoading: false,
    });

    mockUsePublicUsers.mockReturnValue({
      data: {
        'user-guide-1': {
          id: 'user-guide-1',
          full_name: 'Ahmed Hassan',
          display_name: 'Ahmed Hassan',
          avatar_url: null,
          role: UserRole.GUIDE,
        },
      },
    });

    mockUsePriceIndex.mockReturnValue({
      data: [
        {
          commodity: {
            id: 'commodity-1',
            nameAr: 'طماطم',
            nameEn: 'Tomatoes',
            category: 'vegetables',
            unit: 'kg',
          },
          latestPrice: 2500,
          changePercent: 12,
          region: 'kharga',
          priceType: 'retail',
        },
      ],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    mockUsePriceSummary.mockReturnValue({
      data: {
        lastUpdated: '2026-04-02T08:30:00.000Z',
      },
    });

    mockUseBusinesses.mockReturnValue({
      data: [
        {
          id: 'biz-1',
          nameAr: 'واحة فودز',
          nameEn: 'Oasis Foods',
          category: 'vegetables',
          description: 'Fresh produce supplier for local farms.',
          descriptionAr: 'وصف عربي',
          district: 'kharga',
          phone: '+201000000000',
          website: null,
          logoUrl: null,
          verificationStatus: 'verified',
          commodities: [
            {
              id: 'commodity-1',
              nameAr: 'طماطم',
              nameEn: 'Tomatoes',
              category: 'vegetables',
              unit: 'kg',
            },
          ],
        },
      ],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    mockUseCommodities.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockGetOpportunities.mockResolvedValue({
      data: [
        {
          id: 'opp-1',
          titleAr: 'فرصة عربية',
          titleEn: 'Eco Lodge Expansion',
          sector: 'tourism',
          area: 'kharga',
          minInvestment: 500000000,
          maxInvestment: 900000000,
          currency: 'EGP',
          expectedReturnPct: 18,
          paybackPeriodYears: 5,
          incentives: ['Tax exemptions', 'Fast-track permits'],
          status: 'active',
          images: [],
        },
      ],
    });

    mockGetBusinesses.mockResolvedValue({
      data: [
        {
          id: 'startup-1',
          nameAr: 'شركة عربية',
          nameEn: 'Palm Tech',
          category: 'AgriTech',
          descriptionAr: 'وصف عربي',
          district: 'kharga',
          location: null,
          phone: null,
          logoUrl: null,
          status: 'active',
        },
      ],
    });
  });

  it('renders TourismPage in English mode', () => {
    render(<TourismPage />);

    expect(screen.getByAltText('Tourism in New Valley')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tourism & community' })).toBeInTheDocument();
    expect(
      screen.getByText('Discover attractions, book a guide, or browse tourism experiences'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for attractions or guides...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attractions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guides' })).toBeInTheDocument();
    expect(screen.getByText('Featured destinations')).toBeInTheDocument();
    expect(screen.getByText('White Desert')).toBeInTheDocument();
    expect(screen.getByText('A surreal desert landscape.')).toBeInTheDocument();
    expect(screen.getByText('Natural')).toBeInTheDocument();
    expect(screen.getByText('All attractions')).toBeInTheDocument();
    expect(screen.getByText('Hibis Temple')).toBeInTheDocument();
    expect(screen.getByText('Licensed desert guide.')).toBeInTheDocument();
    expect(screen.getByText('Languages:')).toBeInTheDocument();
    expect(screen.getByText('Specialties:')).toBeInTheDocument();
    expect(screen.getByText('/day')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View profile/i })).toBeInTheDocument();
  });

  it('renders MarketplacePage in English mode', () => {
    render(<MarketplacePage />);

    expect(screen.getByAltText('hero.badge')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'hero.title' })).toBeInTheDocument();
    expect(screen.getByText('hero.subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tabs.prices' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tabs.suppliers' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('filters.searchProduct')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('suppliers.searchPlaceholder')).toBeInTheDocument();
    expect(screen.getByText('table.cityPrices')).toBeInTheDocument();
    expect(screen.getByText(/lastMarketUpdate/)).toBeInTheDocument();
    expect(screen.getByText('table.product')).toBeInTheDocument();
    expect(screen.getByText('table.category')).toBeInTheDocument();
    expect(screen.getByText('table.price')).toBeInTheDocument();
    expect(screen.getByText('table.change')).toBeInTheDocument();
    expect(screen.getAllByText('Tomatoes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vegetables').length).toBeGreaterThan(0);
    expect(screen.getByText('table.priceUnit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'suppliers.addBtn' })).toBeInTheDocument();
    expect(screen.getByText('Oasis Foods')).toBeInTheDocument();
    expect(screen.getByText('Fresh produce supplier for local farms.')).toBeInTheDocument();
    expect(screen.getByText('suppliers.verified')).toBeInTheDocument();
    expect(screen.getAllByText('Kharga').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'suppliers.viewProfile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact/i })).toBeInTheDocument();
  });

  it('renders InvestmentPage in English mode', async () => {
    render(<InvestmentPage />);

    expect(screen.getByAltText('Investment opportunities')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Investment opportunities' })).toBeInTheDocument();
    expect(
      screen.getByText('Discover investment opportunities in New Valley and connect with startups'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Search for investment opportunities...'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opportunities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Startups' })).toBeInTheDocument();

    expect(await screen.findByText('Eco Lodge Expansion')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Tourism')).toBeInTheDocument();
    expect(screen.getAllByText('Kharga').length).toBeGreaterThan(0);
    expect(screen.getByText('5-9 million EGP')).toBeInTheDocument();
    expect(screen.getByText('Expected return: 18%')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Details/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Inquiry/i })).toBeInTheDocument();
    expect(screen.getByText('Palm Tech')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Contact/i }).length).toBeGreaterThan(0);
  });
});
