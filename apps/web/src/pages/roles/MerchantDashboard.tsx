import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { Store } from 'lucide-react';

export default function MerchantDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة التاجر</h1>
            <p className="text-muted-foreground">إدارة المنتجات والعروض بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD المنتجات"
          description="إضافة المنتجات وتحديث حالتها وحذفها"
          entityLabel="المنتج"
          initialItems={[
            { id: 'm-1', name: 'تمر الواحة الممتاز', status: 'active', notes: 'مخزون: 50' },
            { id: 'm-2', name: 'عسل نخيل طبيعي', status: 'pending', notes: 'بانتظار التسعير' },
          ]}
        />
      </div>
    </Layout>
  );
}
