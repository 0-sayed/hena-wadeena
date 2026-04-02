import { ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';
import AdminModeration from '@/pages/admin/AdminModeration';

export default function ReviewerDashboard() {
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';

  return (
    <DashboardShell
      icon={ShieldCheck}
      title={pickLocalizedCopy(appLanguage, {
        ar: 'لوحة المراجعة',
        en: 'Reviewer dashboard',
      })}
      subtitle={pickLocalizedCopy(appLanguage, {
        ar: 'متابعة المحتوى وعناصر الإشراف التي تحتاج إلى مراجعة',
        en: 'Track content and moderation items that need review',
      })}
    >
      <AdminModeration />
    </DashboardShell>
  );
}
