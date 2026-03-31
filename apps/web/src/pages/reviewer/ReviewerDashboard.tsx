import { Layout } from '@/components/layout/Layout';
import AdminModeration from '@/pages/admin/AdminModeration';

export default function ReviewerDashboard() {
  return (
    <Layout>
      <div className="container px-4 py-8">
        <AdminModeration />
      </div>
    </Layout>
  );
}
