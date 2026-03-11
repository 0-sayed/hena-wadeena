import { Link } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { QuickAccess } from '@/components/home/QuickAccess';
import { MissionCards } from '@/components/home/MissionCards';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { PriceSnapshot } from '@/components/home/PriceSnapshot';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Users,
  FileCheck,
  Store,
  Truck,
  TrendingUp,
  MapPinned,
  GraduationCap,
  Home,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'لوحة الإدارة', desc: 'صلاحيات كاملة' },
  { to: '/moderator', icon: Users, label: 'لوحة المنسق', desc: 'تنسيق بين الأدوار' },
  { to: '/reviewer', icon: FileCheck, label: 'لوحة المراجع', desc: 'مراجعة المستندات' },
];

const roleLinks = [
  { to: '/dashboard/merchant', icon: Store, label: 'التاجر', desc: 'إدارة المنتجات' },
  { to: '/dashboard/driver', icon: Truck, label: 'السائق', desc: 'إدارة الرحلات' },
  { to: '/dashboard/investor', icon: TrendingUp, label: 'المستثمر', desc: 'الفرص الاستثمارية' },
  { to: '/dashboard/tourist', icon: MapPinned, label: 'السائح', desc: 'خطط الرحلات' },
  { to: '/dashboard/student', icon: GraduationCap, label: 'الطالب', desc: 'الطلبات الأكاديمية' },
  { to: '/dashboard/resident', icon: Home, label: 'المقيم', desc: 'خدمات الحي' },
];

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <QuickAccess />

      {/* Admin Dashboards */}
      <div className="container py-10 px-4">
        <h2 className="text-2xl font-bold mb-4 text-center">لوحات التحكم الإدارية</h2>
        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          {adminLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Button variant="outline" className="w-full h-24 flex-col gap-2">
                <Icon className="h-7 w-7 text-primary" />
                <span className="font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Role Dashboards */}
      <div className="container pb-12 px-4">
        <h2 className="text-2xl font-bold mb-4 text-center">لوحات الأدوار</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-5xl mx-auto">
          {roleLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Button variant="outline" className="w-full h-24 flex-col gap-1">
                <Icon className="h-6 w-6 text-primary" />
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <MissionCards />
      <FeaturedSection />
      <PriceSnapshot />
    </Layout>
  );
};

export default Index;
