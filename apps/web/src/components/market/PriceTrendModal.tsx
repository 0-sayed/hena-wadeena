import { useMemo, useState } from 'react';
import type { NvDistrict, CommodityUnit } from '@hena-wadeena/types';
import { PriceType } from '@hena-wadeena/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/motion/Skeleton';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatPrice, unitLabel, PRICE_TYPE_OPTIONS } from '@/lib/format';
import { PriceTrendChart } from './PriceTrendChart';

interface PriceTrendModalProps {
  commodity: { id: string; name: string } | null;
  onClose: () => void;
  region: NvDistrict | undefined;
}

type Period = '7d' | '30d' | '90d' | '1y';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 أيام' },
  { value: '30d', label: '30 يوم' },
  { value: '90d', label: '90 يوم' },
  { value: '1y', label: 'سنة' },
];

export function PriceTrendModal({ commodity, onClose, region }: PriceTrendModalProps) {
  const [period, setPeriod] = useState<Period>('30d');
  const [priceType, setPriceType] = useState<PriceType>(PriceType.RETAIL);

  const { data: response, isLoading } = usePriceHistory(commodity?.id, {
    period,
    region,
    price_type: priceType,
  });

  const entries = useMemo(() => response?.data ?? [], [response?.data]);
  const unit = (response?.commodity.unit ?? 'kg') as CommodityUnit;

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    return {
      currentPrice: entries[entries.length - 1].avgPrice,
      periodAvg: Math.round(entries.reduce((s, d) => s + d.avgPrice, 0) / entries.length),
      periodMin: Math.min(...entries.map((d) => d.minPrice)),
      periodMax: Math.max(...entries.map((d) => d.maxPrice)),
    };
  }, [entries]);

  const totalSamples = useMemo(() => entries.reduce((s, d) => s + d.sampleCount, 0), [entries]);

  const statCards: { label: string; value: number | null }[] = [
    { label: 'السعر الحالي', value: stats?.currentPrice ?? null },
    { label: 'متوسط الفترة', value: stats?.periodAvg ?? null },
    { label: 'أدنى سعر', value: stats?.periodMin ?? null },
    { label: 'أعلى سعر', value: stats?.periodMax ?? null },
  ];

  return (
    <Dialog
      open={commodity !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {commodity?.name ?? ''}
            {response?.commodity.unit ? ` / ${unitLabel(response.commodity.unit)}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card) =>
            isLoading ? (
              <Skeleton key={card.label} h="h-16" className="rounded-xl" />
            ) : (
              <Card key={card.label} className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-base font-semibold text-foreground">
                    {card.value !== null ? formatPrice(card.value) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </CardContent>
              </Card>
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}

          <Select value={priceType} onValueChange={(v) => setPriceType(v as PriceType)}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton h="h-56" className="rounded-xl" />
        ) : (
          <PriceTrendChart data={entries} unit={unit} />
        )}

        {!isLoading && totalSamples > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            بناءً على {totalSamples} قراءة سعرية
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
