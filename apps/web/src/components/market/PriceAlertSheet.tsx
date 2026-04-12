import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import {
  useCreatePriceAlert,
  useDeletePriceAlert,
  usePriceAlerts,
  useUpdatePriceAlert,
} from '@/hooks/use-price-alerts';

interface PriceAlertSheetProps {
  commodityId: string;
  commodityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceAlertSheet({
  commodityId,
  commodityName,
  open,
  onOpenChange,
}: PriceAlertSheetProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: allAlerts = [] } = usePriceAlerts();
  const createAlert = useCreatePriceAlert();
  const updateAlert = useUpdatePriceAlert();
  const deleteAlert = useDeletePriceAlert();

  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [thresholdEgp, setThresholdEgp] = useState('');

  const existingAlert = allAlerts.find(
    (a) => a.commodityId === commodityId && a.direction === direction,
  );

  // Reset direction when sheet opens
  useEffect(() => {
    if (open) setDirection('above');
  }, [open]);

  // Pre-fill threshold when direction or commodity changes
  useEffect(() => {
    if (existingAlert) {
      setThresholdEgp(String(existingAlert.thresholdPrice / 100));
    } else {
      setThresholdEgp('');
    }
  }, [direction, commodityId, existingAlert]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && !isAuthenticated) {
      void navigate('/auth/login');
      return;
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const thresholdPrice = Math.round(parseFloat(thresholdEgp) * 100);
    if (!isFinite(thresholdPrice) || thresholdPrice <= 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }
    try {
      if (existingAlert) {
        await updateAlert.mutateAsync({
          id: existingAlert.id,
          body: { thresholdPrice, direction },
        });
        toast.success('تم تحديث التنبيه');
      } else {
        await createAlert.mutateAsync({ commodityId, thresholdPrice, direction });
        toast.success('تم إنشاء التنبيه');
      }
      onOpenChange(false);
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  }

  async function handleDelete() {
    if (!existingAlert) return;
    try {
      await deleteAlert.mutateAsync(existingAlert.id);
      toast.success('تم حذف التنبيه');
      onOpenChange(false);
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
    }
  }

  const isPending = createAlert.isPending || updateAlert.isPending || deleteAlert.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" dir="rtl" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>تنبيه سعر — {commodityName}</SheetTitle>
        </SheetHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
          {/* Direction toggle */}
          <div className="space-y-2">
            <Label>نوع التنبيه</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={direction === 'above' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDirection('above')}
              >
                عند الارتفاع فوق
              </Button>
              <Button
                type="button"
                variant={direction === 'below' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDirection('below')}
              >
                عند الانخفاض تحت
              </Button>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">السعر (جنيه)</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              step="0.01"
              value={thresholdEgp}
              onChange={(e) => setThresholdEgp(e.target.value)}
              placeholder="مثال: 25.50"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {existingAlert ? 'تحديث التنبيه' : 'إنشاء التنبيه'}
            </Button>
            {existingAlert && (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => void handleDelete()}
              >
                حذف
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
