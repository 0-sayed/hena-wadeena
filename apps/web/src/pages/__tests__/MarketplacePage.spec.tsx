import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import MarketplacePage from '../MarketplacePage';

const mockNavigate = vi.fn();
const mockUseQueryClient = vi.fn();
const mockUsePriceIndex = vi.fn();
const mockUsePriceSummary = vi.fn();
const mockUseBusinesses = vi.fn();
const mockUseCommodities = vi.fn();
const mockUseDebounce = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockUseQueryClient(),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');

  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return {
    Search: Icon,
    MapPin: Icon,
    Phone: Icon,
    BarChart3: Icon,
    Plus: Icon,
    ExternalLink: Icon,
    Building2: Icon,
    TrendingUp: Icon,
    Leaf: Icon,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/PageHero', () => ({
  PageHero: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/PageTransition', () => ({
  PageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/market/TrendBadge', () => ({
  TrendBadge: () => <div>trend</div>,
}));

vi.mock('@/components/LoadMoreButton', () => ({
  LoadMoreButton: () => <div>load-more</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
  }) => <textarea value={value} onChange={onChange} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/hooks/use-price-index', () => ({
  usePriceIndex: (filters?: Record<string, unknown>) => mockUsePriceIndex(filters),
  usePriceSummary: () => mockUsePriceSummary(),
}));

vi.mock('@/hooks/use-businesses', () => ({
  useBusinesses: (filters?: Record<string, unknown>) => mockUseBusinesses(filters),
}));

vi.mock('@/hooks/use-commodities', () => ({
  useCommodities: () => mockUseCommodities(),
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => mockUseDebounce(value),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  businessesAPI: {
    create: vi.fn(),
  },
}));

vi.mock('@/assets/hero-marketplace.jpg', () => ({
  default: 'hero-marketplace.jpg',
}));

describe('MarketplacePage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseQueryClient.mockReset();
    mockUsePriceIndex.mockReset();
    mockUsePriceSummary.mockReset();
    mockUseBusinesses.mockReset();
    mockUseCommodities.mockReset();
    mockUseDebounce.mockReset();
    mockUseAuth.mockReset();

    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
    mockUsePriceIndex.mockReturnValue({
      data: [],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUsePriceSummary.mockReturnValue({
      data: { lastUpdated: null },
    });
    mockUseBusinesses.mockReturnValue({
      data: [],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUseCommodities.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseDebounce.mockImplementation((value: string) => value);
    mockUseAuth.mockReturnValue({
      user: null,
    });
  });

  it('requests retail prices for the selected city table', () => {
    render(<MarketplacePage />);

    expect(mockUsePriceIndex).toHaveBeenCalledWith({
      region: 'kharga',
      price_type: 'retail',
    });
  });

  it('filters visible suppliers by partial Arabic text while typing', () => {
    mockUseBusinesses.mockReturnValue({
      data: [
        {
          id: 'supplier-1',
          ownerId: 'owner-1',
          nameAr: 'مزارع الواحات للتمور',
          nameEn: null,
          category: 'زراعة',
          description: null,
          descriptionAr: 'توريد تمور عالية الجودة',
          district: 'dakhla',
          location: null,
          phone: null,
          website: null,
          logoUrl: null,
          status: 'active',
          verificationStatus: 'verified',
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          deletedAt: null,
          commodities: [],
        },
        {
          id: 'supplier-2',
          ownerId: 'owner-2',
          nameAr: 'مصنع زيت الوادي',
          nameEn: null,
          category: 'تصنيع',
          description: null,
          descriptionAr: 'إنتاج الزيوت الطبيعية',
          district: 'farafra',
          location: null,
          phone: null,
          website: null,
          logoUrl: null,
          status: 'active',
          verificationStatus: 'verified',
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          deletedAt: null,
          commodities: [],
        },
      ],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    render(<MarketplacePage />);

    fireEvent.change(screen.getByPlaceholderText('ابحث عن مورد...'), {
      target: { value: 'الواح' },
    });

    expect(screen.getByText('مزارع الواحات للتمور')).toBeInTheDocument();
    expect(screen.queryByText('مصنع زيت الوادي')).not.toBeInTheDocument();
  });

  it('keeps the marketplace prices table aligned between headers and body cells', () => {
    mockUsePriceIndex.mockReturnValue({
      data: [
        {
          commodity: {
            id: 'commodity-1',
            nameAr: 'فول سوداني',
            category: 'crops',
            unit: 'kg',
          },
          region: 'kharga',
          priceType: 'retail',
          latestPrice: 4687,
          changePercent: -1.97,
        },
      ],
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });

    render(<MarketplacePage />);

    const table = screen.getByRole('table');
    const headerCells = within(table).getAllByRole('columnheader');
    const bodyCells = within(table).getAllByRole('cell');

    expect(table).toHaveClass('table-fixed');
    headerCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    bodyCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
  });
});
