import { type FormEvent, useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField } from '@/lib/localization';
import { districtLabel } from '@/lib/format';

const sectorLabels = {
  agriculture: { ar: 'زراعة', en: 'Agriculture' },
  tourism: { ar: 'سياحة', en: 'Tourism' },
  industry: { ar: 'صناعة', en: 'Industry' },
  real_estate: { ar: 'عقارات', en: 'Real estate' },
  services: { ar: 'خدمات', en: 'Services' },
  technology: { ar: 'تكنولوجيا', en: 'Technology' },
  energy: { ar: 'طاقة', en: 'Energy' },
} as const satisfies Record<string, { ar: string; en: string }>;

function sectorLabel(sector: string, language: 'ar' | 'en') {
  const copy = sectorLabels[sector as keyof typeof sectorLabels];
  return copy ? pickLocalizedCopy(language, copy) : sector;
}

function opportunityStatusLabel(status: string, language: 'ar' | 'en') {
  if (status === 'active') {
    return pickLocalizedCopy(language, { ar: 'متاح', en: 'Available' });
  }
  return status;
}

function startupStatusLabel(status: string, language: 'ar' | 'en') {
  if (status === 'active') {
    return pickLocalizedCopy(language, { ar: 'نشط', en: 'Active' });
  }
  return status;
}

function formatInvestmentRange(opportunity: Opportunity, language: 'ar' | 'en') {
  const minMillions = (opportunity.minInvestment / 100_000_000).toFixed(0);
  const maxMillions = (opportunity.maxInvestment / 100_000_000).toFixed(0);

  return pickLocalizedCopy(language, {
    ar: `${minMillions}-${maxMillions} مليون ${opportunity.currency}`,
    en: `${minMillions}-${maxMillions} million ${opportunity.currency}`,
  });
}

const InvestmentPage = () => {
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
    const query = searchQuery.trim();
    if (!query) return;
    void navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Layout>
      <PageTransition>
        <PageHero
          image={heroInvestment}
          alt={pickLocalizedCopy(language, {
            ar: 'فرص الاستثمار',
            en: 'Investment opportunities',
          })}
        >
          <SR>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">
                {pickLocalizedCopy(language, {
                  ar: 'فرص الاستثمار',
                  en: 'Investment opportunities',
                })}
              </span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="mb-5 text-4xl font-bold text-card md:text-5xl lg:text-6xl">
              {pickLocalizedCopy(language, {
                ar: 'فرص الاستثمار',
                en: 'Investment opportunities',
              })}
            </h1>
          </SR>
          <SR delay={200}>
            <p className="mb-10 text-lg text-card/90 md:text-xl">
              {pickLocalizedCopy(language, {
                ar: 'اكتشف الفرص الاستثمارية في الوادي الجديد وتواصل مع الشركات الناشئة',
                en: 'Discover investment opportunities in New Valley and connect with startups',
              })}
            </p>
          </SR>
          <SR delay={300}>
            <form onSubmit={handleSearch} className="relative mx-auto max-w-xl">
              <Search className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={pickLocalizedCopy(language, {
                  ar: 'ابحث عن فرص استثمارية...',
                  en: 'Search for investment opportunities...',
                })}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-16 rounded-2xl border-0 bg-card/90 pr-14 pl-28 text-lg shadow-lg backdrop-blur-sm"
              />
              <Button type="submit" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl">
                {pickLocalizedCopy(language, { ar: 'ابحث', en: 'Search' })}
              </Button>
            </form>
          </SR>
        </PageHero>

        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="opportunities" className="w-full">
              <SR>
                <TabsList className="mx-auto mb-10 grid h-12 w-full max-w-md grid-cols-2 rounded-xl">
                  <TabsTrigger value="opportunities" className="rounded-lg text-sm font-semibold">
                    {pickLocalizedCopy(language, {
                      ar: 'الفرص الاستثمارية',
                      en: 'Opportunities',
                    })}
                  </TabsTrigger>
                  <TabsTrigger value="startups" className="rounded-lg text-sm font-semibold">
                    {pickLocalizedCopy(language, {
                      ar: 'الشركات الناشئة',
                      en: 'Startups',
                    })}
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
                      {opportunities.map((opportunity) => (
                        <Card
                          key={opportunity.id}
                          className="rounded-2xl border-border/50 hover:border-primary/40 hover-lift"
                        >
                          <CardContent className="p-7">
                            <div className="mb-5 flex items-start justify-between">
                              <Badge
                                variant={opportunity.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  opportunity.status === 'active'
                                    ? 'bg-primary px-3 py-1'
                                    : 'px-3 py-1'
                                }
                              >
                                {opportunityStatusLabel(opportunity.status, language)}
                              </Badge>
                              <Badge variant="outline" className="px-3 py-1">
                                {sectorLabel(opportunity.sector, language)}
                              </Badge>
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-foreground">
                              {pickLocalizedField(language, {
                                ar: opportunity.titleAr,
                                en: opportunity.titleEn,
                              })}
                            </h3>
                            <p className="mb-5 line-clamp-2 leading-relaxed text-muted-foreground">
                              {opportunity.incentives?.slice(0, 2).join(' • ')}
                            </p>
                            <div className="mb-5 grid grid-cols-2 gap-4">
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
                                  {formatInvestmentRange(opportunity, language)}
                                </span>
                              </div>
                              <div className="col-span-2 flex items-center gap-2.5 text-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {pickLocalizedCopy(language, {
                                    ar: `العائد المتوقع: ${opportunity.expectedReturnPct}%`,
                                    en: `Expected return: ${opportunity.expectedReturnPct}%`,
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                className="flex-1 transition-transform hover:scale-[1.02]"
                                onClick={() =>
                                  void navigate(`/investment/opportunity/${opportunity.id}`)
                                }
                              >
                                {pickLocalizedCopy(language, {
                                  ar: 'التفاصيل',
                                  en: 'Details',
                                })}{' '}
                                <ArrowLeft className="mr-2 h-4 w-4" />
                              </Button>
                              {canAccessInvestmentContact ? (
                                <Button
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                  onClick={() =>
                                    void navigate(`/investment/contact/${opportunity.id}`)
                                  }
                                >
                                  <Send className="ml-2 h-4 w-4" />
                                  {pickLocalizedCopy(language, {
                                    ar: 'استفسار',
                                    en: 'Inquiry',
                                  })}
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
                      {startups.map((startup) => {
                        const startupDescription = pickLocalizedField(language, {
                          ar: startup.descriptionAr,
                          en: startup.description,
                        });

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
                                      alt={pickLocalizedField(language, {
                                        ar: startup.nameAr,
                                        en: startup.nameEn,
                                      })}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <Building2 className="h-8 w-8 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-foreground">
                                    {pickLocalizedField(language, {
                                      ar: startup.nameAr,
                                      en: startup.nameEn,
                                    })}
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
                                <div>{startupStatusLabel(startup.status, language)}</div>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  variant="outline"
                                  className="flex-1 transition-transform hover:scale-[1.02]"
                                  onClick={() =>
                                    void navigate(`/investment/startups/${startup.id}`)
                                  }
                                >
                                  {pickLocalizedCopy(language, {
                                    ar: 'التفاصيل',
                                    en: 'Details',
                                  })}{' '}
                                  <ArrowLeft className="mr-2 h-4 w-4" />
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
                                    <Send className="ml-2 h-4 w-4" />
                                    {pickLocalizedCopy(language, {
                                      ar: 'تواصل',
                                      en: 'Contact',
                                    })}
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
