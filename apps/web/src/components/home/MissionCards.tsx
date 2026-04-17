import { Link } from 'react-router';
import {
  Truck,
  BarChart3,
  TrendingUp,
  Compass,
  ArrowLeft,
  Users,
  Search,
  BedDouble,
  Briefcase,
  Sparkles,
  Newspaper,
  Calendar,
  Palette,
  Sun,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';
import { ProtectDesertStrip } from '@/components/home/ProtectDesertStrip';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_LABELS, formatNewsDate } from '@/lib/news-utils';
import { NewsCategory } from '@hena-wadeena/types';

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
    id: 'accommodation',
    title: { ar: 'الإقامة والسكن', en: 'Accommodation' },
    description: {
      ar: 'اعثر على أماكن إقامة مريحة بالقرب من معالم الوادي الجديد السياحية.',
      en: 'Find comfortable places to stay near New Valley tourism sites and attractions.',
    },
    icon: BedDouble,
    href: '/tourism/accommodation',
    gradient: 'from-orange-500 to-amber-600',
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
    id: 'jobs',
    title: { ar: 'سوق العمل', en: 'Job board' },
    description: {
      ar: 'تصفح فرص العمل، أعلن عن وظائفك، وابحث عن المواهب في الوادي الجديد.',
      en: 'Browse job openings, post positions, and find local talent in New Valley.',
    },
    icon: Briefcase,
    href: '/jobs',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'artisans',
    title: { ar: 'الحرفيات', en: 'Artisans' },
    description: {
      ar: 'اكتشف منتجات الحرف اليدوية الأصيلة، تواصل مع الحرفيات، واطلب بضائع مباشرة.',
      en: 'Discover authentic handcraft products, connect with local artisans, and place direct orders.',
    },
    icon: Palette,
    href: '/artisans',
    gradient: 'from-pink-600 to-pink-600',
  },
  {
    id: 'solar',
    title: { ar: 'الطاقة الشمسية', en: 'Solar energy' },
    description: {
      ar: 'خريطة التركيبات الشمسية، مزودو الطاقة المعتمدون، وبرامج الدعم الحكومي.',
      en: 'Community solar map, certified installers, and government subsidy programs.',
    },
    icon: Sun,
    href: '/solar',
    gradient: 'from-amber-400 to-orange-500',
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

const newsItems = [
  {
    id: 'news-1',
    category: NewsCategory.TOURISM,
    title: {
      ar: 'افتتاح موسم السياحة الشتوي في الوادي الجديد',
      en: 'New Valley winter tourism season opens',
    },
    excerpt: {
      ar: 'تستعد المحافظة لاستقبال آلاف السياح خلال موسم الشتاء بمزيد من الخدمات والمرشدين المعتمدين.',
      en: 'The governorate prepares to welcome thousands of tourists with expanded services and certified guides.',
    },
    date: '2026-04-10',
    href: '/news',
  },
  {
    id: 'news-2',
    category: NewsCategory.INVESTMENT,
    title: {
      ar: 'مشروع جديد للطاقة الشمسية في الداخلة',
      en: 'New solar energy project launched in Dakhla',
    },
    excerpt: {
      ar: 'إطلاق مشروع طاقة شمسية بقدرة 500 ميجاوات يوفر آلاف فرص العمل لشباب الوادي الجديد.',
      en: 'A 500 MW solar energy project is set to create thousands of jobs for New Valley youth.',
    },
    date: '2026-04-08',
    href: '/news',
  },
  {
    id: 'news-3',
    category: NewsCategory.AGRICULTURE,
    title: {
      ar: 'موسم قياسي للتمور بالوادي الجديد هذا العام',
      en: 'Record date harvest season in New Valley',
    },
    excerpt: {
      ar: 'أعلنت الجهات الزراعية عن موسم تمور استثنائي مع ارتفاع الإنتاج بنسبة ٣٠٪ عن العام الماضي.',
      en: 'Agricultural authorities report an exceptional season with production up 30% year-on-year.',
    },
    date: '2026-04-05',
    href: '/news',
  },
];

export function MissionCards() {
  const { language } = useAuth();
  const copy =
    language === 'en'
      ? {
          badge: 'Our Services',
          title: 'Services for New Valley residents',
          description:
            'We connect New Valley residents with essential services and open doors to new opportunities.',
          cta: 'Explore',
          newsBadge: 'Latest News',
          newsReadMore: 'Read more',
        }
      : {
          badge: 'خدماتنا',
          title: 'خدماتنا لأهل الوادي',
          description: 'نربط أهل الوادي بالخدمات الأساسية ونفتح أبواب الفرص للجميع',
          cta: 'استكشف',
          newsBadge: 'آخر الأخبار',
          newsReadMore: 'اقرأ المزيد',
        };

  return (
    <>
      {/* Service cards */}
      <section className="relative overflow-hidden bg-muted/30 py-16 sm:py-20 md:py-24">
        <FloatingBlob
          className="start-0 top-0 -translate-x-1/2 -translate-y-1/2"
          color="primary"
          size="lg"
          animation={1}
        />
        <FloatingBlob
          className="bottom-0 end-0 translate-x-1/3 translate-y-1/3"
          color="accent"
          size="lg"
          animation={2}
        />

        <div className="container relative px-4">
          <SR direction="up" className="mb-12 text-center sm:mb-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{copy.badge}</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
              {copy.title}
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              {copy.description}
            </p>
          </SR>

          <SR stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-7">
            {missions.map((mission) => {
              const Icon = mission.icon;
              return (
                <Link key={mission.id} to={mission.href}>
                  <Card
                    className={`group relative h-full overflow-hidden rounded-2xl transition-all duration-400 hover-lift hover:shadow-xl ${
                      mission.id === 'artisans'
                        ? 'border-pink-200 shadow-pink-100 hover:border-pink-400'
                        : 'border-border/50 hover:border-primary/40'
                    }`}
                  >
                    {mission.id === 'artisans' && (
                      <div className="pointer-events-none absolute -left-10 top-5 z-10 w-40 -rotate-45 bg-pink-600 py-1.5 text-center shadow-md">
                        <span className="text-[10px] font-bold tracking-wide text-white">
                          {language === 'ar' ? 'تمكين المرأة المصرية' : 'Women Empowerment'}
                        </span>
                      </div>
                    )}
                    <CardContent className="flex h-full flex-col p-6 sm:p-8">
                      <div
                        className={`icon-hover mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${mission.gradient} shadow-lg sm:h-[72px] sm:w-[72px]`}
                      >
                        <Icon className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                        {pickLocalizedCopy(language, mission.title)}
                      </h3>
                      <p className="mb-6 flex-1 leading-relaxed text-muted-foreground">
                        {pickLocalizedCopy(language, mission.description)}
                      </p>
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        {copy.cta}
                        <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </SR>
        </div>
      </section>

      <ProtectDesertStrip />

      {/* News */}
      <section className="bg-muted/30 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="container px-4">
          <SR direction="up" className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{copy.newsBadge}</span>
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </SR>

          <SR
            stagger
            className="mx-auto mt-7 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3 lg:gap-7"
          >
            {newsItems.map((item) => (
              <Link key={item.id} to={item.href}>
                <Card className="group h-full overflow-hidden rounded-2xl border-border/50 transition-all duration-400 hover-lift hover:border-primary/40 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-6">
                    <span
                      className={`mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${NEWS_CATEGORY_COLORS[item.category]}`}
                    >
                      {NEWS_CATEGORY_LABELS[item.category]}
                    </span>
                    <h3 className="mb-3 flex-1 text-base font-bold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
                      {pickLocalizedCopy(language, item.title)}
                    </h3>
                    <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {pickLocalizedCopy(language, item.excerpt)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatNewsDate(item.date, { monthFormat: 'short' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        {copy.newsReadMore}
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </SR>
        </div>
      </section>
    </>
  );
}
