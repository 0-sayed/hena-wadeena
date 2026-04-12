import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDesertTrip, useCheckInDesertTrip } from '@/hooks/use-desert-trip';
import { ApiError } from '@/services/api';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import { RegisterTripForm } from './RegisterTripForm';
import { TripStatusCard } from './TripStatusCard';

interface DesertTripPanelProps {
  bookingId: string;
  isGuide: boolean;
  language: AppLanguage;
}

export function DesertTripPanel({ bookingId, isGuide, language }: DesertTripPanelProps) {
  const { data: trip, isLoading, isError, refetch } = useDesertTrip(bookingId);
  const checkIn = useCheckInDesertTrip();

  if (isLoading) {
    return <Skeleton className="mt-4 h-32 w-full rounded-lg" />;
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>
          {pickLocalizedCopy(language, {
            ar: 'تعذّر تحميل بيانات الرحلة.',
            en: 'Failed to load trip data.',
          })}
          <button type="button" onClick={() => void refetch()} className="ms-2 underline">
            {pickLocalizedCopy(language, { ar: 'إعادة المحاولة', en: 'Retry' })}
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!trip) {
    if (isGuide) {
      return <RegisterTripForm bookingId={bookingId} language={language} />;
    }
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        {pickLocalizedCopy(language, {
          ar: 'لا توجد خطة سلامة بعد',
          en: 'No safety plan registered yet',
        })}
      </p>
    );
  }

  const handleCheckIn = () => {
    checkIn.mutate(bookingId, {
      onSuccess: () => {
        toast.success(
          pickLocalizedCopy(language, {
            ar: 'تم تسجيل الوصول بنجاح',
            en: 'Checked in successfully',
          }),
        );
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          toast.error(
            pickLocalizedCopy(language, {
              ar: 'تم تسجيل الوصول مسبقاً',
              en: 'Already checked in',
            }),
          );
        } else {
          toast.error(error instanceof Error ? error.message : String(error));
        }
      },
    });
  };

  return (
    <div>
      <TripStatusCard trip={trip} language={language} />
      {isGuide && ['pending', 'overdue', 'alert_sent'].includes(trip.status) && (
        <Button
          onClick={handleCheckIn}
          disabled={checkIn.isPending}
          variant="outline"
          className="mt-3 w-full"
        >
          {checkIn.isPending
            ? pickLocalizedCopy(language, { ar: 'جارٍ التسجيل...', en: 'Checking in...' })
            : pickLocalizedCopy(language, { ar: 'تسجيل الوصول', en: 'Check In' })}
        </Button>
      )}
    </div>
  );
}
