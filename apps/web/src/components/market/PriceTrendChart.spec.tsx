import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommodityUnit } from '@hena-wadeena/types';
import { PriceTrendChart } from './PriceTrendChart';
import type { PriceHistoryEntry } from '@/services/api';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const SAMPLE_DATA: PriceHistoryEntry[] = [
  { date: '2026-03-01', avgPrice: 5000, minPrice: 4500, maxPrice: 5500, sampleCount: 10 },
  { date: '2026-03-02', avgPrice: 5200, minPrice: 4800, maxPrice: 5600, sampleCount: 12 },
  { date: '2026-03-03', avgPrice: 4900, minPrice: 4400, maxPrice: 5300, sampleCount: 8 },
];

describe('PriceTrendChart', () => {
  it('renders chart elements with full data', () => {
    render(<PriceTrendChart data={SAMPLE_DATA} unit={CommodityUnit.KG} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('area').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('line')).toBeInTheDocument();
  });

  it('shows empty-state message when data is empty', () => {
    render(<PriceTrendChart data={[]} unit={CommodityUnit.KG} />);
    expect(screen.getByText('لا تتوفر بيانات لهذه الفترة')).toBeInTheDocument();
    expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();
  });

  it('renders without crashing with a single data point', () => {
    render(
      <PriceTrendChart
        data={[
          { date: '2026-03-01', avgPrice: 5000, minPrice: 4500, maxPrice: 5500, sampleCount: 3 },
        ]}
        unit={CommodityUnit.TON}
      />,
    );
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });
});
