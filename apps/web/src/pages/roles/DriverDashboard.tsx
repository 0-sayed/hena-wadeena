import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { Truck } from 'lucide-react';

export default function DriverDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة السائق</h1>
            <p className="text-muted-foreground">إدارة الرحلات وطلبات النقل بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD الرحلات"
          description="إضافة الرحلات وتحديث حالتها وإلغاؤها"
          entityLabel="الرحلة"
          initialItems={[
            { id: 'd-1', name: 'الداخلة ← الخارجة', status: 'active', notes: '3 مقاعد متاحة' },
            {
              id: 'd-2',
              name: 'الخارجة ← الفرافرة',
              status: 'pending',
              notes: 'بانتظار تأكيد الركاب',
            },
          ]}
        />
      </div>
    </Layout>
  );
}
