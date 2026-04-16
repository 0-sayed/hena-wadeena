import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PricesPage from './PricesPage';

const mockNavigate = vi.fn();
const mockUsePriceIndexPage = vi.fn();
const mockUsePriceSummary = vi.fn();

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
    TrendingUp: Icon,
    TrendingDown: Icon,
    Minus: Icon,
    Search: Icon,
    BarChart3: Icon,
    ArrowRight: Icon,
    Bell: Icon,
    BellRing: Icon,
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/market/TrendBadge', () => ({
  TrendBadge: () => <div>trend</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    asChild: _asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
    asChild?: boolean;
  }) => <button {...props}>{children}</button>,
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
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    'aria-label': ariaLabel,
  }: {
    children: ReactNode;
    'aria-label'?: string;
  }) => <div aria-label={ariaLabel}>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@/components/LoadMoreButton', () => ({
  LoadMoreButton: () => <div>load-more</div>,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  Skeleton: () => <div>loading</div>,
  TableRowSkeleton: ({ cols = 5 }: { cols?: number }) => (
    <tr>
      {Array.from({ length: cols }).map((_, index) => (
        <td key={index}>loading</td>
      ))}
    </tr>
  ),
}));

vi.mock('@/hooks/use-price-index', () => ({
  usePriceIndexPage: (...args: unknown[]) => mockUsePriceIndexPage(...args),
  usePriceSummary: () => mockUsePriceSummary(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/hooks/use-price-alerts', () => ({
  usePriceAlerts: () => ({ data: [] }),
}));

vi.mock('@/components/market/PriceAlertSheet', () => ({
  PriceAlertSheet: () => null,
}));

vi.mock('@/components/market/PriceTrendModal', () => ({
  PriceTrendModal: () => null,
}));

describe('PricesPage', () => {
  beforeEach(() => {
    mockUsePriceIndexPage.mockReset();
    mockUsePriceSummary.mockReset();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps price table header and body columns on the same logical alignment', () => {
    mockUsePriceIndexPage.mockReturnValue({
      data: {
        data: [
          {
            commodity: {
              id: 'commodity-1',
              nameAr: 'فول سوداني',
              category: 'crops',
              unit: 'kg',
            },
            region: 'kharga',
            latestPrice: 4687,
            changePercent: -1.97,
          },
        ],
        total: 1,
      },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUsePriceSummary.mockReturnValue({
      data: {
        topMovers: [],
      },
      isLoading: false,
    });

    render(<PricesPage />);

    const table = screen.getByRole('table');
    const headerCells = within(table).getAllByRole('columnheader');
    const bodyCells = within(table).getAllByRole('cell');

    expect(table).toHaveClass('table-fixed');
    expect(table).toHaveClass('min-w-[48rem]');
    expect(mockUsePriceIndexPage).toHaveBeenCalledWith(
      {
        category: undefined,
        region: undefined,
        price_type: 'retail',
      },
      1,
      20,
    );
    headerCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    bodyCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    expect(headerCells.at(-1)).toHaveClass('w-16');
    expect(bodyCells.at(-1)).toHaveClass('pe-8');
  });

  it('shows the city tag on mover cards so repeated products are distinguishable by place', () => {
    mockUsePriceIndexPage.mockReturnValue({
      data: {
        data: [
          {
            commodity: {
              id: 'commodity-1',
              nameAr: 'زيتون',
              category: 'oils',
              unit: 'kg',
            },
            region: 'kharga',
            latestPrice: 4687,
            changePercent: 18.54,
          },
          {
            commodity: {
              id: 'commodity-1',
              nameAr: 'زيتون',
              category: 'oils',
              unit: 'kg',
            },
            region: 'dakhla',
            latestPrice: 4700,
            changePercent: 18.53,
          },
        ],
        total: 2,
      },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUsePriceSummary.mockReturnValue({
      data: {
        topMovers: [],
      },
      isLoading: false,
    });

    render(<PricesPage />);

    expect(screen.getByLabelText('مدينة المنتج الأكثر ارتفاعا الخارجة')).toBeInTheDocument();
    expect(screen.getByLabelText('مدينة المنتج الأكثر ارتفاعا الداخلة')).toBeInTheDocument();
    expect(screen.getByText('+18.54%')).toBeInTheDocument();
    expect(screen.getByText('+18.53%')).toBeInTheDocument();
  });

  it('populates the falling card from price rows when summary movers do not include fallers', () => {
    mockUsePriceIndexPage.mockReturnValue({
      data: {
        data: [
          {
            commodity: {
              id: 'commodity-1',
              nameAr: 'قمح',
              category: 'grains',
              unit: 'kg',
            },
            region: 'baris',
            latestPrice: 951,
            changePercent: -5,
          },
        ],
        total: 1,
      },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    });
    mockUsePriceSummary.mockReturnValue({
      data: {
        topMovers: [],
      },
      isLoading: false,
    });

    render(<PricesPage />);

    expect(screen.getByText('-5%')).toBeInTheDocument();
    expect(screen.getByLabelText('مدينة المنتج الأكثر انخفاضا باريس')).toBeInTheDocument();
  });

  it('paginates the price table with explicit page controls', () => {
    mockUsePriceIndexPage.mockImplementation((_filters: unknown, page: number) => ({
      data: {
        data: [
          {
            commodity: {
              id: `commodity-${page}`,
              nameAr: `فول سوداني ${page}`,
              category: 'crops',
              unit: 'kg',
            },
            region: 'kharga',
            latestPrice: 4687,
            changePercent: 0,
            priceType: 'retail',
          },
        ],
        total: 41,
      },
      isLoading: false,
      isFetching: false,
    }));
    mockUsePriceSummary.mockReturnValue({
      data: {
        topMovers: [],
      },
      isLoading: false,
    });

    render(<PricesPage />);

    expect(screen.getByText('فول سوداني 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'صفحة 1' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'صفحة 2' }));

    expect(mockUsePriceIndexPage).toHaveBeenLastCalledWith(
      {
        category: undefined,
        region: undefined,
        price_type: 'retail',
      },
      2,
      20,
    );
    expect(screen.getByText('فول سوداني 2')).toBeInTheDocument();
  });

  it('renders server-paginated rows even when the current search text does not match locally', async () => {
    vi.useFakeTimers();

    mockUsePriceIndexPage.mockReturnValue({
      data: {
        data: [
          {
            commodity: {
              id: 'commodity-1',
              nameAr: 'طماطم',
              nameEn: 'Tomatoes',
              category: 'vegetables',
              unit: 'kg',
            },
            region: 'kharga',
            latestPrice: 1200,
            changePercent: 0,
            priceType: 'retail',
          },
        ],
        total: 21,
      },
      isLoading: false,
      isFetching: false,
    });
    mockUsePriceSummary.mockReturnValue({
      data: {
        topMovers: [],
      },
      isLoading: false,
    });

    render(<PricesPage />);

    fireEvent.change(screen.getByPlaceholderText('Search for a product...'), {
      target: { value: 'zzzz' },
    });
    await act(() => vi.advanceTimersByTime(300));

    expect(mockUsePriceIndexPage).toHaveBeenLastCalledWith(
      {
        q: 'zzzz',
        category: undefined,
        region: undefined,
        price_type: 'retail',
      },
      1,
      20,
    );
    expect(screen.getByText('طماطم')).toBeInTheDocument();
  });
});
