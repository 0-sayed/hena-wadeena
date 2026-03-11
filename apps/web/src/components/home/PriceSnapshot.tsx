import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { marketAPI, type PriceItem } from '@/services/api';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';
import { TableRowSkeleton } from '@/components/motion/Skeleton';

export function PriceSnapshot() {
  const [priceData, setPriceData] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketAPI
      .getPrices()
      .then((r) => setPriceData(r.data.slice(0, 6)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                        المنتج
                      </th>
                      <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                        السعر
                      </th>
                      <th className="text-right py-5 px-6 text-sm font-semibold text-muted-foreground">
                        التغير
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <TableRowSkeleton key={i} cols={3} />
                        ))
                      : priceData.map((item, index) => (
                          <tr
                            key={item.name}
                            className={`hover:bg-muted/20 transition-colors duration-200 ${index !== priceData.length - 1 ? 'border-b border-border/50' : ''}`}
                          >
                            <td className="py-5 px-6">
                              <span className="font-semibold text-foreground">{item.name}</span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="font-bold text-lg text-foreground">
                                {item.price}
                              </span>
                              <span className="text-sm text-muted-foreground mr-1">
                                جنيه/{item.unit}
                              </span>
                            </td>
                            <td className="py-5 px-6">
                              <div
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                  item.change > 0
                                    ? 'bg-primary/10 text-primary'
                                    : item.change < 0
                                      ? 'bg-destructive/10 text-destructive'
                                      : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {item.change > 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : item.change < 0 ? (
                                  <TrendingDown className="h-4 w-4" />
                                ) : (
                                  <Minus className="h-4 w-4" />
                                )}
                                {Math.abs(item.change)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </SR>
      </div>
    </section>
  );
}
