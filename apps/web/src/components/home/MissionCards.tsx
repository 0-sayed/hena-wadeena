import { Link } from 'react-router';
import { Truck, BarChart3, TrendingUp, Compass, ArrowLeft, Users, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { SR, FloatingBlob } from '@/components/motion/ScrollReveal';

const missions = [
  {
    id: 'tourism',
    titleKey: 'mission.tourism',
    descKey: 'mission.tourismDesc',
    icon: Compass,
    href: '/tourism',
    gradient: 'from-chart-4 to-primary',
  },
  {
    id: 'guides',
    titleKey: 'mission.guides',
    descKey: 'mission.guidesDesc',
    icon: Users,
    href: '/guides',
    gradient: 'from-purple-500 to-purple-700',
  },
  {
    id: 'logistics',
    titleKey: 'mission.logistics',
    descKey: 'mission.logisticsDesc',
    icon: Truck,
    href: '/logistics',
    gradient: 'from-primary to-primary/80',
  },
  {
    id: 'marketplace',
    titleKey: 'mission.marketplace',
    descKey: 'mission.marketplaceDesc',
    icon: BarChart3,
    href: '/marketplace',
    gradient: 'from-accent to-accent/80',
  },
  {
    id: 'investment',
    titleKey: 'mission.investment',
    descKey: 'mission.investmentDesc',
    icon: TrendingUp,
    href: '/investment',
    gradient: 'from-chart-3 to-chart-5',
  },
  {
    id: 'search',
    titleKey: 'mission.search',
    descKey: 'mission.searchDesc',
    icon: Search,
    href: '/search',
    gradient: 'from-sky-500 to-blue-600',
  },
] as const;

export function MissionCards() {
  const { t } = useTranslation('home');

  return (
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
            <span className="text-sm font-semibold text-primary">{t('mission.badge')}</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t('mission.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t('mission.description')}
          </p>
        </SR>

        <SR stagger className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {missions.map((mission) => {
            const Icon = mission.icon;
            return (
              <Link key={mission.id} to={mission.href}>
                <Card className="group h-full overflow-hidden rounded-2xl border-border/50 transition-all duration-400 hover-lift hover:border-primary/40 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-6 sm:p-8">
                    <div
                      className={`icon-hover mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${mission.gradient} shadow-lg sm:h-[72px] sm:w-[72px]`}
                    >
                      <Icon className="h-9 w-9 text-primary-foreground" strokeWidth={1.8} />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                      {t(mission.titleKey)}
                    </h3>
                    <p className="mb-6 flex-1 leading-relaxed text-muted-foreground">
                      {t(mission.descKey)}
                    </p>
                    <div className="flex items-center font-semibold text-primary">
                      {t('mission.cta')}
                      <ArrowLeft className="me-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-2" />
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
