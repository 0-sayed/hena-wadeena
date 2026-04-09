import { Link } from 'react-router';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';
import { TableRowSkeleton } from '@/components/motion/Skeleton';
import { TrendBadge } from '@/components/market/TrendBadge';
import { usePriceIndex } from '@/hooks/use-price-index';
import { useAuth } from '@/hooks/use-auth';
import { formatPrice, unitLabel } from '@/lib/format';
import { pickLocalizedField } from '@/lib/localization';

export function PriceSnapshot() {
  const { data: entries, isLoading } = usePriceIndex({ region: 'kharga', price_type: 'retail' }, 6);
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          badge: 'Live prices',
          title: "Today's prices",
          description: 'Latest agricultural product prices in Kharga',
          viewAll: 'Full marketplace',
          product: 'Product',
          price: 'Price',
          change: 'Change',
          currencyPrefix: 'EGP/',
        }
      : {
          badge: 'أسعار حيّة',
          title: 'أسعار اليوم',
          description: 'آخر أسعار المنتجات الزراعية في الخارجة',
          viewAll: 'البورصة الكاملة',
          product: 'المنتج',
          price: 'السعر',
          change: 'التغير',
          currencyPrefix: 'جنيه/',
        };

  return (
    <section className="relative overflow-hidden bg-muted/30 py-16 sm:py-20 md:py-24">
      <FloatingBlob
        className="top-1/2 end-0 translate-x-1/2 -translate-y-1/2"
        color="chart-3"
        size="md"
        animation={3}
      />

      <div className="container relative mx-auto px-4">
        <SR
          direction="up"
          className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-chart-3/20 bg-chart-3/10 px-4 py-2">
              <BarChart3 className="h-4 w-4 text-chart-3" />
              <span className="text-sm font-semibold text-chart-3">{copy.badge}</span>
            </div>
            <h2 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              {copy.title}
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">{copy.description}</p>
          </div>
          <Link to="/marketplace" className="w-full md:w-auto">
            <Button
              variant="outline"
              className="btn-press w-full gap-2 transition-all duration-300 hover:scale-[1.03] md:w-auto"
            >
              {copy.viewAll}
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </SR>

        <SR direction="scale">
          <Card className="overflow-hidden rounded-2xl border-border/50 shadow-lg">
            <CardContent className="p-0">
              <Table className="min-w-[34rem] sm:min-w-0">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-4 sm:px-6 sm:py-5">{copy.product}</TableHead>
                    <TableHead className="px-4 py-4 sm:px-6 sm:py-5">{copy.price}</TableHead>
                    <TableHead className="px-4 py-4 sm:px-6 sm:py-5">{copy.change}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <TableRowSkeleton key={index} cols={3} />
                      ))
                    : entries.map((entry, index) => (
                        <TableRow
                          key={entry.commodity.id}
                          className={
                            index === entries.length - 1
                              ? 'border-b-0 hover:bg-muted/20'
                              : 'hover:bg-muted/20'
                          }
                        >
                          <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                            <span className="font-semibold text-foreground">
                              {pickLocalizedField(language, {
                                ar: entry.commodity.nameAr,
                                en: entry.commodity.nameEn,
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                            <span className="text-lg font-bold text-foreground">
                              {formatPrice(entry.latestPrice)}
                            </span>
                            <span className="ms-1 text-sm text-muted-foreground">
                              {copy.currencyPrefix}
                              {unitLabel(entry.commodity.unit, language)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 sm:px-6 sm:py-5">
                            <TrendBadge changePercent={entry.changePercent} />
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </SR>
      </div>
    </section>
  );
}
