import { Link } from 'react-router';
import { UserRole } from '@hena-wadeena/types';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { QuickAccess } from '@/components/home/QuickAccess';
import { MissionCards } from '@/components/home/MissionCards';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { PriceSnapshot } from '@/components/home/PriceSnapshot';
import { VisionStrip } from '@/components/home/VisionStrip';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  Compass,
  Droplets,
  FileCheck,
  GraduationCap,
  Home,
  MapPinned,
  Shield,
  Store,
  TrendingUp,
  Truck,
} from 'lucide-react';

type DashboardLink = {
  to: string;
  icon: typeof Shield;
  label: string;
  desc: string;
  roles: UserRole[];
};

const adminLinks: DashboardLink[] = [
  {
    to: '/admin',
    icon: Shield,
    label: 'لوحة الإدارة',
    desc: 'صلاحيات كاملة',
    roles: [UserRole.ADMIN],
  },
  {
    to: '/reviewer',
    icon: FileCheck,
    label: 'لوحة المراجع',
    desc: 'مراجعة المستندات',
    roles: [UserRole.ADMIN, UserRole.REVIEWER],
  },
];

const roleLinks: DashboardLink[] = [
  {
    to: '/dashboard/guide',
    icon: Compass,
    label: 'المرشد',
    desc: 'إدارة الجولات',
    roles: [UserRole.GUIDE],
  },
  {
    to: '/dashboard/merchant',
    icon: Store,
    label: 'التاجر',
    desc: 'إدارة المنتجات',
    roles: [UserRole.MERCHANT],
  },
  {
    to: '/dashboard/driver',
    icon: Truck,
    label: 'السائق',
    desc: 'إدارة الرحلات',
    roles: [UserRole.DRIVER],
  },
  {
    to: '/dashboard/investor',
    icon: TrendingUp,
    label: 'المستثمر',
    desc: 'الفرص الاستثمارية',
    roles: [UserRole.INVESTOR],
  },
  {
    to: '/dashboard/tourist',
    icon: MapPinned,
    label: 'السائح',
    desc: 'خطط الرحلات',
    roles: [UserRole.TOURIST],
  },
  {
    to: '/dashboard/student',
    icon: GraduationCap,
    label: 'الطالب',
    desc: 'الطلبات الأكاديمية',
    roles: [UserRole.STUDENT],
  },
  {
    to: '/dashboard/resident',
    icon: Home,
    label: 'المقيم',
    desc: 'خدمات الحي',
    roles: [UserRole.RESIDENT],
  },
  {
    to: '/dashboard/farmer',
    icon: Droplets,
    label: 'المزارع',
    desc: 'إدارة الآبار والري',
    roles: [UserRole.FARMER],
  },
];

function filterLinks(links: DashboardLink[], role?: UserRole) {
  if (!role) {
    return [];
  }

  return links.filter((link) => link.roles.includes(role));
}

const Index = () => {
  const { user } = useAuth();
  const visibleAdminLinks = filterLinks(adminLinks, user?.role);
  const visibleRoleLinks = filterLinks(roleLinks, user?.role);

  return (
    <Layout title="الرئيسية">
      <HeroSection />
      <VisionStrip />
      <QuickAccess />

      {visibleAdminLinks.length > 0 && (
        <div className="container px-4 py-10">
          <h2 className="mb-4 text-center text-2xl font-bold">لوحات التحكم الإدارية</h2>
          <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-4">
            {visibleAdminLinks.map(({ to, icon: Icon, label, desc }) => (
              <Link key={to} to={to} className="w-full sm:w-[280px]">
                <Button variant="outline" className="flex h-24 w-full flex-col gap-2">
                  <Icon className="h-7 w-7 text-primary" />
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {visibleRoleLinks.length > 0 && (
        <div className="container px-4 pb-12">
          <h2 className="mb-4 text-center text-2xl font-bold">لوحات الأدوار</h2>
          <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4">
            {visibleRoleLinks.map(({ to, icon: Icon, label, desc }) => (
              <Link key={to} to={to} className="w-full sm:w-[260px]">
                <Button variant="outline" className="flex h-24 w-full flex-col gap-1">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      <MissionCards />
      <FeaturedSection />
      <PriceSnapshot />
    </Layout>
  );
};

export default Index;
