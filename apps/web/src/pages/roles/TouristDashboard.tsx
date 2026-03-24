import { MapPinned, CalendarCheck, Clock, CheckCircle } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { BookingsCard } from '@/components/dashboard/BookingsCard';
import { useMyBookings } from '@/hooks/use-my-bookings';

export default function TouristDashboard() {
  const { data, isLoading, error } = useMyBookings();
  const bookings = data?.data ?? [];

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  return (
    <DashboardShell icon={MapPinned} title="لوحة السائح" subtitle="متابعة حجوزاتك ورحلاتك">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="إجمالي الحجوزات"
          value={isLoading ? '...' : stats.total}
          icon={CalendarCheck}
        />
        <StatCard
          label="قادمة"
          value={isLoading ? '...' : stats.upcoming}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          label="مكتملة"
          value={isLoading ? '...' : stats.completed}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />
    </DashboardShell>
  );
}
