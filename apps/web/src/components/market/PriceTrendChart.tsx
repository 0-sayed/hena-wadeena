import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CommodityUnit } from '@hena-wadeena/types';
import type { PriceHistoryEntry } from '@/services/api';
import { formatPrice, unitLabel } from '@/lib/format';

interface PriceTrendChartProps {
  data: PriceHistoryEntry[];
  unit: CommodityUnit;
}

interface ChartPoint {
  date: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  bandValue: number;
  sampleCount: number;
}

function formatChartDate(v: string, fmt: string): string {
  try {
    return format(parseISO(v), fmt);
  } catch {
    return v;
  }
}

const tickFormatter = (v: string) => formatChartDate(v, 'dd/MM');

function toChartPoints(data: PriceHistoryEntry[]): ChartPoint[] {
  return data.map((d) => {
    const rawBand = d.maxPrice - d.minPrice;
    const bandValue = Number.isFinite(rawBand) && rawBand > 0 ? rawBand : 0;
    return {
      date: d.date,
      avgPrice: d.avgPrice,
      minPrice: d.minPrice,
      maxPrice: d.maxPrice,
      bandValue,
      sampleCount: d.sampleCount,
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChartPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">
        {label ? formatChartDate(label, 'dd/MM/yyyy') : ''}
      </p>
      <p className="text-muted-foreground">
        متوسط: <span className="font-semibold text-foreground">{formatPrice(point.avgPrice)}</span>
      </p>
      <p className="text-muted-foreground">
        أدنى: <span className="text-foreground">{formatPrice(point.minPrice)}</span>
      </p>
      <p className="text-muted-foreground">
        أعلى: <span className="text-foreground">{formatPrice(point.maxPrice)}</span>
      </p>
      <p className="text-xs text-muted-foreground">العينات: {point.sampleCount}</p>
    </div>
  );
}

export function PriceTrendChart({ data, unit }: PriceTrendChartProps) {
  const chartData = useMemo(() => toChartPoints(data), [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        لا تتوفر بيانات لهذه الفترة
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatPrice(v)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={52}
          label={{
            value: `جنيه/${unitLabel(unit)}`,
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
            dx: -4,
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* minPrice is a transparent base; bandValue stacks above to form the min/max band */}
        <Area
          dataKey="minPrice"
          stackId="band"
          fill="transparent"
          stroke="none"
          legendType="none"
        />
        <Area
          dataKey="bandValue"
          stackId="band"
          fill="hsl(var(--primary))"
          fillOpacity={0.15}
          stroke="none"
          legendType="none"
        />
        <Line
          dataKey="avgPrice"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
