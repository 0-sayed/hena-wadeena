import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PriceSnapshot } from './PriceSnapshot';

vi.mock('react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

vi.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;

  return {
    ArrowLeft: Icon,
    BarChart3: Icon,
    TrendingUp: Icon,
    TrendingDown: Icon,
    Minus: Icon,
  };
});

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/motion/ScrollReveal', () => ({
  SR: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FloatingBlob: () => null,
}));

vi.mock('@/components/motion/Skeleton', () => ({
  TableRowSkeleton: ({ cols = 3 }: { cols?: number }) => (
    <tr>
      {Array.from({ length: cols }).map((_, index) => (
        <td key={index}>loading</td>
      ))}
    </tr>
  ),
}));

vi.mock('@/hooks/use-price-index', () => ({
  usePriceIndex: () => ({
    data: [
      {
        latestPrice: 4687,
        changePercent: -1.97,
        commodity: {
          id: '1',
          nameAr: 'فول سوداني',
          unit: 'kg',
        },
      },
    ],
    isLoading: false,
  }),
}));

describe('PriceSnapshot', () => {
  it('uses the same logical alignment for header and body cells', () => {
    render(<PriceSnapshot />);

    const table = screen.getByRole('table');
    const headerCells = within(table).getAllByRole('columnheader');
    const bodyCells = within(table).getAllByRole('cell');

    expect(table).toHaveClass('table-fixed');
    headerCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
    bodyCells.forEach((cell) => expect(cell).toHaveClass('text-start'));
  });
});
