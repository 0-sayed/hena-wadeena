import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { UserRole } from '@hena-wadeena/types';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, MapPin, TrendingUp, Building2, Send, ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { investmentAPI, type Opportunity, type Startup } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroInvestment from '@/assets/hero-investment.jpg';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';

import { districtLabel } from '@/lib/format';
import { matchesSearchQuery } from '@/lib/search';

function sectorLabel(sector: string, t: (key: string, options?: any) => string) {
  return t(`sectors.${sector}`, { defaultValue: sector });
}

function opportunityStatusLabel(status: string, t: (key: string, options?: any) => string) {
  if (status === 'active') {
    return t('status.available');
  }
  return status;
}

function startupStatusLabel(status: string, t: (key: string, options?: any) => string) {
  if (status === 'active') {
    return t('status.active');
  }
  return status;
}

function formatInvestmentRange(opportunity: Opportunity, t: (key: string, options?: any) => string) {
  const minMillions = (opportunity.minInvestment / 100_000_000).toFixed(0);
  const maxMillions = (opportunity.maxInvestment / 100_000_000).toFixed(0);

  return t('card.investmentRange', {
    min: minMillions,
    max: maxMillions,
    currency: opportunity.currency,
  });
}

const InvestmentPage = () => {
  const { t } = useTranslation(['investment', 'common']);
  const navigate = useNavigate();
  const { language, user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const canAccessInvestmentContact =
    user?.role === UserRole.ADMIN || user?.role === UserRole.INVESTOR;

  useEffect(() => {
    Promise.all([
      investmentAPI.getOpportunities().then((r) => setOpportunities(r.data)),
      investmentAPI.getBusinesses().then((r) => setStartups(r.data)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchQuery((previous) => previous.trim());
  };

  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter((opp) =>
        matchesSearchQuery(searchQuery, [
          opp.titleAr,
          opp.titleEn,
          opp.description,
          opp.sector,
          sectorLabel(opp.sector, t),
          opp.area,
          districtLabel(opp.area, (language === 'en' ? 'en' : 'ar')),
          ...opp.incentives,
          ...(opp.contact?.name ? [opp.contact.name] : []),
        ]),
      ),
    [opportunities, searchQuery, language, t],
  );

  const filteredStartups = useMemo(
    () =>
      startups.filter((startup) =>
        matchesSearchQuery(searchQuery, [
          startup.nameAr,
          startup.nameEn,
          startup.description,
          startup.descriptionAr,
          startup.category,
          startup.district,
          districtLabel(startup.district ?? '', (language === 'en' ? 'en' : 'ar')),
          startup.status,
        ]),
      ),
    [startups, searchQuery, language],
  );

  return (
    <Layout title={t('title')}>
      <PageTransition>
        <PageHero
          image={heroInvestment}
          alt={t('hero.title')}
        >
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">
                {t('hero.badge')}
              </span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-10 text-lg text-card/90 md:text-xl">
              {t('hero.subtitle')}
            </p>
          </SR>
          <SR delay={300}>
            <form onSubmit={handleSearch} className="mx-auto max-w-xl">
              <div className="flex flex-col gap-3 sm:relative">
                <div className="relative">
                  <Search className="search-inline-icon-lg absolute top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground sm:h-6 sm:w-6" />
                  <Input
                    placeholder={t('hero.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="search-input-with-icon-lg h-14 rounded-2xl border-0 bg-card/90 ps-14 pe-4 text-base shadow-lg backdrop-blur-sm sm:h-16 sm:ps-28 sm:text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-xl sm:absolute sm:start-2 sm:top-1/2 sm:w-auto sm:-translate-y-1/2"
                >
                  {t('common:search')}
                </Button>
              </div>
            </form>
          </SR>
        </PageHero>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="opportunities" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-8 grid h-auto w-full max-w-md grid-cols-2 rounded-2xl p-1 sm:mb-10 sm:h-12 sm:rounded-xl">
                  <TabsTrigger
                    value="opportunities"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {t('tabs.opportunities')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="startups"
                    className="min-h-[44px] rounded-xl text-sm font-semibold"
                  >
                    {t('tabs.startups')}
                  </TabsTrigger>
                </TabsList>
              </SR>

              <TabsContent value="opportunities" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} h="h-64" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                      {filteredOpportunities.map((opportunity) => (
                        <Card
                          key={opportunity.id}
                          className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                        >
                          <CardContent className="p-7">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:items-start">
                              <Badge
                                variant={opportunity.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  opportunity.status === 'active'
                                    ? 'bg-primary px-3 py-1'
                                    : 'px-3 py-1'
                                }
                              >
                                {opportunityStatusLabel(opportunity.status, t)}
                              </Badge>
                              <Badge variant="outline" className="px-3 py-1">
                                {sectorLabel(opportunity.sector, t)}
                              </Badge>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-foreground">
                              {(language === 'en' ? opportunity.titleEn : opportunity.titleAr) ?? opportunity.titleAr ?? ''}
                            </h3>
                            <p className="mb-5 line-clamp-2 leading-relaxed text-muted-foreground">
                              {opportunity.incentives?.slice(0, 2).join(' • ')}
                            </p>
                            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="flex items-center gap-2.5 text-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {districtLabel(opportunity.area, language)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <DollarSign className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {formatInvestmentRange(opportunity, t)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm sm:col-span-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {t('card.expectedReturn', { pct: opportunity.expectedReturnPct })}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <Button
                                variant="outline"
                                className="flex-1 transition-transform hover:scale-[1.02]"
                                onClick={() =>
                                  void navigate(`/investment/opportunity/${opportunity.id}`)
                                }
                              >
                                {t('common:details')}{' '}
                                <ArrowLeft className="me-2 h-4 w-4" />
                              </Button>
                              {canAccessInvestmentContact ? (
                                <Button
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                  onClick={() =>
                                    void navigate(`/investment/contact/${opportunity.id}`)
                                  }
                                >
                                  <Send className="ms-2 h-4 w-4" />
                                  {t('common:inquiry')}
                                </Button>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
              </TabsContent>

              <TabsContent value="startups" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} h="h-56" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
                      {filteredStartups.map((startup) => {
                        const startupDescription = (language === 'en' ? startup.description : startup.descriptionAr) ?? startup.description ?? '';

                        return (
                          <Card
                            key={startup.id}
                            className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                          >
                            <CardContent className="p-7">
                              <div className="mb-5 flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-md">
                                  {startup.logoUrl ? (
                                    <img
                                      src={startup.logoUrl}
                                      alt={(language === 'en' ? startup.nameEn : startup.nameAr) ?? startup.nameAr ?? ''}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Building2 className="h-8 w-8 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-foreground">
                                    {(language === 'en' ? startup.nameEn : startup.nameAr) ?? startup.nameAr ?? ''}
                                  </h3>
                                  <Badge variant="secondary" className="mt-1">
                                    {startup.category}
                                  </Badge>
                                </div>
                              </div>
                              {startupDescription && (
                                <p className="mb-5 line-clamp-2 leading-relaxed text-muted-foreground">
                                  {startupDescription}
                                </p>
                              )}
                              <div className="mb-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4" />
                                  {districtLabel(startup.district ?? '', language)}
                                </div>
                                <div>{startupStatusLabel(startup.status, t)}</div>
                              </div>
                              <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                  variant="outline"
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                  onClick={() =>
                                    void navigate(`/investment/startups/${startup.id}`)
                                  }
                                >
                                  {t('common:details')}{' '}
                                  <ArrowLeft className="me-2 h-4 w-4" />
                                </Button>
                                {canAccessInvestmentContact ? (
                                  <Button
                                    className="flex-1 transition-transform hover:scale-[1.02]"
                                    onClick={() =>
                                      void navigate(
                                        `/investment/contact/${startup.id}?entity=startup`,
                                      )
                                    }
                                  >
                                    <Send className="ms-2 h-4 w-4" />
                                    {t('common:contact')}
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </SR>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default InvestmentPage;
