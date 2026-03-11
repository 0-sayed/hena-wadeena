import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { Home } from 'lucide-react';

export default function ResidentDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة المقيم</h1>
            <p className="text-muted-foreground">إدارة طلبات الخدمات المحلية بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD طلبات الخدمات"
          description="إدارة الطلبات اليومية الخاصة بالمقيمين"
          entityLabel="الخدمة"
          initialItems={[
            { id: 'r-1', name: 'طلب صيانة منزلية', status: 'pending', notes: 'زيارة خلال 48 ساعة' },
            { id: 'r-2', name: 'اشتراك نشاط مجتمعي', status: 'active', notes: 'نادي الحي' },
          ]}
        />
      </div>
    </Layout>
  );
}
