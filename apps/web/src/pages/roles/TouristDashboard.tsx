import { MapPinned, CalendarCheck, Clock, CheckCircle } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookingsCard } from '@/components/dashboard/BookingsCard';
import { useAuth } from '@/hooks/use-auth';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

export default function TouristDashboard() {
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data, isLoading, error } = useMyBookings();
  const bookings = data?.data ?? [];

  const stats = {
    total: data?.total ?? bookings.length,
    upcoming: bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  return (
    <DashboardShell
      icon={MapPinned}
      title={pickLocalizedCopy(appLanguage, { ar: 'لوحة السائح', en: 'Tourist dashboard' })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'متابعة حجوزاتك ورحلاتك',
        en: 'Track your bookings and trips',
      })}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'إجمالي الحجوزات', en: 'Total bookings' })}
          value={isLoading ? '...' : stats.total}
          icon={CalendarCheck}
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'قادمة', en: 'Upcoming' })}
          value={isLoading ? '...' : stats.upcoming}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label={pickLocalizedCopy(appLanguage, { ar: 'مكتملة', en: 'Completed' })}
          value={isLoading ? '...' : stats.completed}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />
    </DashboardShell>
  );
}
