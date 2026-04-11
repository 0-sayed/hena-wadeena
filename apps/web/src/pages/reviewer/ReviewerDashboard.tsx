import { ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useTranslation } from 'react-i18next';
import AdminModeration from '@/pages/admin/AdminModeration';

export default function ReviewerDashboard() {
  const { t } = useTranslation('admin');

  return (
    <DashboardShell
      icon={ShieldCheck}
      title={t('reviewer.dashboard.title')}
      subtitle={t('reviewer.dashboard.subtitle')}
    >
      <AdminModeration />
    </DashboardShell>
  );
}
