import { useState, useEffect } from 'react';
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

const sectorLabels: Record<string, string> = {
  agriculture: 'زراعة',
  tourism: 'سياحة',
  industry: 'صناعة',
  real_estate: 'عقارات',
  services: 'خدمات',
  technology: 'تكنولوجيا',
  energy: 'طاقة',
};

const areaLabels: Record<string, string> = {
  kharga: 'الخارجة',
  dakhla: 'الداخلة',
  farafra: 'الفرافرة',
  baris: 'باريس',
  balat: 'بلاط',
};

const InvestmentPage = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      investmentAPI.getOpportunities().then((r) => setOpportunities(r.data)),
      investmentAPI.getStartups().then((r) => setStartups(r.data)),
    ])
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <PageTransition>
        {/* Hero Section */}
        <PageHero image={heroInvestment} alt="فرص الاستثمار">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <TrendingUp className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">فرص الاستثمار</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-5">
              فرص الاستثمار
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              اكتشف الفرص الاستثمارية في الوادي الجديد وتواصل مع الشركات الناشئة
            </p>
          </SR>
          <SR delay={300}>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="ابحث عن فرص استثمارية..."
                className="pr-14 h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
              />
            </div>
          </SR>
        </PageHero>

        {/* Content */}
        <section className="py-14">
          <div className="container px-4">
            <Tabs defaultValue="opportunities" className="w-full">
              <SR>
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10 h-12 rounded-xl">
                  <TabsTrigger value="opportunities" className="rounded-lg text-sm font-semibold">
                    الفرص الاستثمارية
                  </TabsTrigger>
                  <TabsTrigger value="startups" className="rounded-lg text-sm font-semibold">
                    الشركات الناشئة
                  </TabsTrigger>
                </TabsList>
              </SR>

              {/* Opportunities Tab */}
              <TabsContent value="opportunities" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} h="h-64" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                      {opportunities.map((opp) => (
                        <Card
                          key={opp.id}
                          className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                        >
                          <CardContent className="p-7">
                            <div className="flex items-start justify-between mb-5">
                              <Badge
                                variant={opp.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  opp.status === 'active' ? 'bg-primary px-3 py-1' : 'px-3 py-1'
                                }
                              >
                                {opp.status === 'active' ? 'متاح' : opp.status}
                              </Badge>
                              <Badge variant="outline" className="px-3 py-1">
                                {sectorLabels[opp.sector] ?? opp.sector}
                              </Badge>
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">
                              {opp.titleAr}
                            </h3>
                            <p className="text-muted-foreground mb-5 line-clamp-2 leading-relaxed">
                              {opp.incentives?.slice(0, 2).join(' • ')}
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-5">
                              <div className="flex items-center gap-2.5 text-sm">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {areaLabels[opp.area] ?? opp.area}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <DollarSign className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  {(opp.minInvestment / 100_000_000).toFixed(0)}-
                                  {(opp.maxInvestment / 100_000_000).toFixed(0)} مليون{' '}
                                  {opp.currency}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-sm col-span-2">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-muted-foreground">
                                  العائد المتوقع: {opp.expectedReturnPct}%
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                className="flex-1 hover:scale-[1.02] transition-transform"
                                onClick={() => void navigate(`/investment/opportunity/${opp.id}`)}
                              >
                                التفاصيل <ArrowLeft className="h-4 w-4 mr-2" />
                              </Button>
                              <Button
                                className="flex-1 hover:scale-[1.02] transition-transform"
                                onClick={() => void navigate(`/investment/contact/${opp.id}`)}
                              >
                                <Send className="h-4 w-4 ml-2" />
                                استفسار
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SR>
                )}
              </TabsContent>

              {/* Startups Tab */}
              <TabsContent value="startups" className="space-y-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} h="h-56" className="rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <SR stagger>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                      {startups.map((startup) => (
                        <Card
                          key={startup.id}
                          className="border-border/50 hover:border-primary/40 hover-lift rounded-2xl"
                        >
                          <CardContent className="p-7">
                            <div className="flex items-center gap-4 mb-5">
                              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-md overflow-hidden">
                                {startup.logoUrl ? (
                                  <img
                                    src={startup.logoUrl}
                                    alt={startup.nameAr}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Building2 className="h-8 w-8 text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-foreground">
                                  {startup.nameAr}
                                </h3>
                                <Badge variant="secondary" className="mt-1">
                                  {startup.category}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-muted-foreground mb-5 line-clamp-2 leading-relaxed">
                              {startup.descriptionAr}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-5">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {startup.district}
                              </div>
                              <div>{startup.status === 'active' ? 'نشط' : startup.status}</div>
                            </div>
                            <Button
                              className="w-full hover:scale-[1.02] transition-transform"
                              onClick={() => void navigate(`/investment/contact/${startup.id}`)}
                            >
                              <Send className="h-4 w-4 ml-2" />
                              تواصل
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
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
