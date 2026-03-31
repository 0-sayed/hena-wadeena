import { GraduationCap, CalendarCheck, Home, BookOpen } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { BookingsCard } from '@/components/dashboard/BookingsCard';
import { useMyBookings } from '@/hooks/use-my-bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentDashboard() {
  const { data, isLoading, error } = useMyBookings();
  const bookings = data?.data ?? [];

  const stats = {
    bookings: data?.total ?? bookings.length,
    upcoming: bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length,
  };

  return (
    <DashboardShell
      icon={GraduationCap}
      title="لوحة الطالب"
      subtitle="متابعة السكن والحجوزات والخدمات الطلابية"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="حجوزاتي" value={isLoading ? '...' : stats.bookings} icon={CalendarCheck} />
        <StatCard
          label="قادمة"
          value={isLoading ? '...' : stats.upcoming}
          icon={BookOpen}
          variant="warning"
        />
        <StatCard label="السكن" value="تصفح" icon={Home} variant="muted" />
      </div>

      <BookingsCard bookings={bookings} isLoading={isLoading} error={error} />

      <Card>
        <CardHeader>
          <CardTitle>البحث عن سكن</CardTitle>
          <CardDescription>تصفح الإعلانات المتاحة للسكن الطلابي</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Home}
            message="ابحث عن سكن قريب من جامعتك"
            actionLabel="تصفح الإعلانات"
            actionHref="/tourism/accommodation"
          />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
