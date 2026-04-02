import { Link } from 'react-router';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';
import { TableRowSkeleton } from '@/components/motion/Skeleton';
import { TrendBadge } from '@/components/market/TrendBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePriceIndex } from '@/hooks/use-price-index';
import { formatPrice, unitLabel } from '@/lib/format';

export function PriceSnapshot() {
  const { data: entries, isLoading } = usePriceIndex({ region: 'kharga', price_type: 'retail' }, 6);

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <FloatingBlob
        className="top-1/2 right-0 translate-x-1/2 -translate-y-1/2"
        color="chart-3"
        size="md"
        animation={3}
      />

      <div className="container mx-auto px-4 relative">
        <SR
          direction="up"
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-chart-3/10 border border-chart-3/20 mb-5">
              <BarChart3 className="h-4 w-4 text-chart-3" />
              <span className="text-sm font-semibold text-chart-3">أسعار حيّة</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">أسعار اليوم</h2>
            <p className="text-lg text-muted-foreground">آخر أسعار المنتجات الزراعية في الخارجة</p>
          </div>
          <Link to="/marketplace">
            <Button
              variant="outline"
              className="gap-2 btn-press hover:scale-[1.03] transition-all duration-300"
            >
              البورصة الكاملة
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </SR>

        <SR direction="scale">
          <Card className="border-border/50 rounded-2xl overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <Table className="table-fixed">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 py-5">المنتج</TableHead>
                    <TableHead className="px-6 py-5">السعر</TableHead>
                    <TableHead className="px-6 py-5">التغير</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={3} />)
                    : entries.map((entry) => (
                        <TableRow key={entry.commodity.id} className="hover:bg-muted/20">
                          <TableCell className="px-6 py-5 text-start">
                            <span className="font-semibold text-foreground">
                              {entry.commodity.nameAr}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
                            <div className="flex flex-wrap items-baseline gap-1">
                              <span className="text-lg font-bold text-foreground">
                                {formatPrice(entry.latestPrice)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                جنيه/{unitLabel(entry.commodity.unit)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-start">
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
