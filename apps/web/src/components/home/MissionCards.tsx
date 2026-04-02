import { Link } from 'react-router';
import { Truck, BarChart3, TrendingUp, Compass, ArrowLeft, Users, Search } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';

const missions = [
  {
    id: 'tourism',
    title: { ar: 'السياحة والمجتمع', en: 'Tourism & community' },
    description: {
      ar: 'المعالم الأثرية، المرشدين السياحيين، السكن للطلاب، وقصص الوادي.',
      en: 'Heritage sites, local guides, student housing, and the stories of New Valley.',
    },
    icon: Compass,
    href: '/tourism',
    gradient: 'from-chart-4 to-primary',
  },
  {
    id: 'guides',
    title: { ar: 'المرشدين السياحيين', en: 'Tour guides' },
    description: {
      ar: 'احجز مرشد سياحي معتمد، استعرض الباقات والتقييمات، واحجز رحلتك.',
      en: 'Book certified tour guides, browse packages and ratings, and plan your trip.',
    },
    icon: Users,
    href: '/guides',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    id: 'logistics',
    title: { ar: 'اللوجستيات والتنقل', en: 'Logistics & mobility' },
    description: {
      ar: 'خطوط المواصلات، المحطات، ومشاركة الرحلات للتنقل بسهولة داخل وخارج الوادي.',
      en: 'Transport lines, stations, and shared rides to move easily within and beyond New Valley.',
    },
    icon: Truck,
    href: '/logistics',
    gradient: 'from-primary to-primary/80',
  },
  {
    id: 'marketplace',
    title: { ar: 'البورصة والأسعار', en: 'Marketplace & prices' },
    description: {
      ar: 'أسعار المنتجات الزراعية والمحلية، دليل الموردين، والتواصل المباشر.',
      en: 'Agricultural and local product prices, supplier directories, and direct connections.',
    },
    icon: BarChart3,
    href: '/marketplace',
    gradient: 'from-accent to-accent/80',
  },
  {
    id: 'investment',
    title: { ar: 'فرص الاستثمار', en: 'Investment opportunities' },
    description: {
      ar: 'اكتشف الفرص الاستثمارية، تواصل مع الشركات الناشئة، وابدأ مشروعك.',
      en: 'Discover investment opportunities, connect with startups, and launch your next venture.',
    },
    icon: TrendingUp,
    href: '/investment',
    gradient: 'from-chart-3 to-chart-5',
  },
  {
    id: 'search',
    title: { ar: 'البحث والمساعد الذكي', en: 'Search & AI assistant' },
    description: {
      ar: 'ابحث عبر المنصة بالكامل أو اسأل المساعد الذكي عن أي شيء يخص الوادي الجديد.',
      en: 'Search across the whole platform or ask the AI assistant about anything related to New Valley.',
    },
    icon: Search,
    href: '/search',
    gradient: 'from-sky-500 to-blue-600',
  },
] as const;

export function MissionCards() {
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          badge: 'Our services',
          title: 'Services for New Valley residents',
          description:
            'We connect New Valley residents with essential services and open doors to new opportunities.',
          cta: 'Explore',
        }
      : {
          badge: '✨ خدماتنا',
          title: 'خدماتنا لأهل الوادي',
          description: 'نربط أهل الوادي بالخدمات الأساسية ونفتح أبواب الفرص للجميع',
          cta: 'استكشف',
        };

  return (
    <section className="relative overflow-hidden bg-muted/30 py-24">
      <FloatingBlob
        className="left-0 top-0 -translate-x-1/2 -translate-y-1/2"
        color="primary"
        size="lg"
        animation={1}
      />
      <FloatingBlob
        className="bottom-0 right-0 translate-x-1/3 translate-y-1/3"
        color="accent"
        size="lg"
        animation={2}
      />

      <div className="container relative px-4">
        <SR direction="up" className="mb-16 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <span className="text-sm font-semibold text-primary">{copy.badge}</span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">{copy.title}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{copy.description}</p>
        </SR>

        <SR stagger className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {missions.map((mission) => {
            const Icon = mission.icon;
            return (
              <Link key={mission.id} to={mission.href}>
                <Card className="group h-full overflow-hidden rounded-2xl border-border/50 transition-all duration-400 hover-lift hover:border-primary/40 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-8">
                    <div
                      className={`icon-hover mb-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${mission.gradient} shadow-lg`}
                      style={{ width: 72, height: 72 }}
                    >
                      <Icon className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                      {pickLocalizedCopy(language, mission.title)}
                    </h3>
                    <p className="mb-6 flex-1 leading-relaxed text-muted-foreground">
                      {pickLocalizedCopy(language, mission.description)}
                    </p>
                    <div className="flex items-center font-semibold text-primary">
                      {copy.cta}
                      <ArrowLeft className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </SR>
      </div>
    </section>
  );
}
