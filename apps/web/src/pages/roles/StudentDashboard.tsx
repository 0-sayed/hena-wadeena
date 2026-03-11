import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { GraduationCap } from 'lucide-react';

export default function StudentDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة الطالب</h1>
            <p className="text-muted-foreground">إدارة طلبات السكن والدعم الأكاديمي بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD الطلبات الطلابية"
          description="إدارة الطلبات ومراحل تنفيذها"
          entityLabel="الطلب"
          initialItems={[
            { id: 's-1', name: 'طلب سكن قريب من الجامعة', status: 'pending', notes: 'لفصل الربيع' },
            { id: 's-2', name: 'طلب مواصلات يومية', status: 'active', notes: 'الخط الداخلي' },
          ]}
        />
      </div>
    </Layout>
  );
}
