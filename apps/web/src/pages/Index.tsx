import { Link } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { QuickAccess } from '@/components/home/QuickAccess';
import { MissionCards } from '@/components/home/MissionCards';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { PriceSnapshot } from '@/components/home/PriceSnapshot';
import { Button } from '@/components/ui/button';
import {
  Compass,
  FileCheck,
  GraduationCap,
  Home,
  MapPinned,
  Shield,
  Store,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'لوحة الإدارة', desc: 'صلاحيات كاملة' },
  { to: '/admin/moderation', icon: Users, label: 'لوحة المنسق', desc: 'تنسيق بين الأدوار' },
  { to: '/reviewer', icon: FileCheck, label: 'لوحة المراجع', desc: 'مراجعة المستندات' },
];

const roleLinks = [
  { to: '/dashboard/guide', icon: Compass, label: 'المرشد', desc: 'إدارة الجولات' },
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

      <div className="container px-4 py-10">
        <h2 className="mb-4 text-center text-2xl font-bold">لوحات التحكم الإدارية</h2>
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-3">
          {adminLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Button variant="outline" className="flex h-24 w-full flex-col gap-2">
                <Icon className="h-7 w-7 text-primary" />
                <span className="font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="container px-4 pb-12">
        <h2 className="mb-4 text-center text-2xl font-bold">لوحات الأدوار</h2>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-7">
          {roleLinks.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to}>
              <Button variant="outline" className="flex h-24 w-full flex-col gap-1">
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">{label}</span>
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
