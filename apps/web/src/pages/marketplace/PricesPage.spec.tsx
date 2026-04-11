import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PricesPage from './PricesPage';

const mockNavigate = vi.fn();
const mockUsePriceIndex = vi.fn();
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
  };
});

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/market/TrendBadge', () => ({
  TrendBadge: () => <div>trend</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
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
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
  usePriceIndex: (filters?: Record<string, unknown>) => mockUsePriceIndex(filters),
  usePriceSummary: () => mockUsePriceSummary(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ language: 'en', direction: 'ltr', user: null }),
}));

describe('PricesPage', () => {
  it('keeps price table header and body columns on the same logical alignment', () => {
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
          latestPrice: 4687,
          changePercent: -1.97,
        },
      ],
      total: 1,
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
    headerCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    bodyCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
  });
});
