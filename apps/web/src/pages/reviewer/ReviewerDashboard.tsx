import { ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import AdminModeration from '@/pages/admin/AdminModeration';

export default function ReviewerDashboard() {
  return (
    <DashboardShell
      icon={ShieldCheck}
      title="لوحة المراجعة"
      subtitle="متابعة المحتوى وعناصر الإشراف التي تحتاج إلى مراجعة"
    >
      <AdminModeration />
    </DashboardShell>
  );
}
