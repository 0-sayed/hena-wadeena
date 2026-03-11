import { Layout } from '@/components/layout/Layout';
import { RoleCrudBoard } from '@/components/roles/RoleCrudBoard';
import { TrendingUp } from 'lucide-react';

export default function InvestorDashboard() {
  return (
    <Layout>
      <div className="container py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">لوحة المستثمر</h1>
            <p className="text-muted-foreground">إدارة الفرص الاستثمارية بشكل تجريبي</p>
          </div>
        </div>

        <RoleCrudBoard
          title="CRUD الفرص الاستثمارية"
          description="أضف/عدّل/احذف الفرص ومراحل متابعتها"
          entityLabel="الفرصة"
          initialItems={[
            { id: 'inv-1', name: 'مشروع زراعي جديد', status: 'active', notes: 'ROI متوقع 18%' },
            {
              id: 'inv-2',
              name: 'توسعة مركز لوجستي',
              status: 'pending',
              notes: 'في مرحلة دراسة الجدوى',
            },
          ]}
        />
      </div>
    </Layout>
  );
}
