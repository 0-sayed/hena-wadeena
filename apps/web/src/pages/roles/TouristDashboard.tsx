import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { MapPinned } from 'lucide-react';

export default function TouristDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPinned className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة السائح</h1>
            <p className="text-muted-foreground">إدارة برامج الرحلات والحجوزات بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD خطط الرحلات"
          description="تنظيم خطط الزيارة لكل يوم"
          entityLabel="الخطة"
          initialItems={[
            { id: 't-1', name: 'جولة الكثبان الرملية', status: 'active', notes: 'الساعة 8 صباحًا' },
            {
              id: 't-2',
              name: 'زيارة السوق التراثي',
              status: 'pending',
              notes: 'بانتظار تأكيد المرشد',
            },
          ]}
        />
      </div>
    </Layout>
  );
}
