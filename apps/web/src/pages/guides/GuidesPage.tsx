import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
import { Search, Star, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { guidesAPI, type GuideProfile } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition } from '@/components/motion/PageTransition';
import { CardSkeleton } from '@/components/motion/Skeleton';
import { PageHero } from '@/components/layout/PageHero';
import heroGuides from '@/assets/hero-guides.jpg';

const GuidesPage = () => {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<GuideProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    guidesAPI
      .getGuides()
      .then((r) => setGuides(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = guides.filter(
    (g) =>
      g.name.includes(search) ||
      g.specialties.some((s) => s.includes(search)) ||
      g.bio_ar.includes(search),
  );

  return (
    <Layout>
      <PageTransition>
        {/* Hero */}
        <PageHero image={heroGuides} alt="المرشدين السياحيين">
          <SR>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold text-card">المرشدين السياحيين</span>
            </div>
          </SR>
          <SR delay={100}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 text-card">
              المرشدين السياحيين 🧭
            </h1>
          </SR>
          <SR delay={200}>
            <p className="text-lg md:text-xl text-card/90 mb-10">
              اختر مرشدك واحجز رحلة مميزة في الوادي الجديد
            </p>
          </SR>
          <SR delay={300}>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو التخصص..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-14 h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
              />
            </div>
          </SR>
        </PageHero>

        {/* Cards */}
        <section className="py-14">
          <div className="container px-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <SR stagger>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {filtered.map((guide) => (
                    <Card
                      key={guide.id}
                      className="hover-lift cursor-pointer group overflow-hidden rounded-2xl border-border/50 hover:border-primary/40"
                      onClick={() => void navigate(`/guides/${guide.id}`)}
                    >
                      <CardContent className="p-0">
                        <div className="relative overflow-hidden">
                          <img
                            src={guide.image}
                            alt={guide.name}
                            className="w-full h-52 object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          {guide.license_verified && (
                            <Badge className="absolute top-3 left-3 bg-green-500 text-white shadow-lg">
                              ✓ مرخّص
                            </Badge>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <div className="p-6 space-y-3">
                          <h3 className="text-xl font-bold group-hover:text-primary transition-colors duration-250">
                            {guide.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {guide.bio_ar}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {guide.specialties.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-1.5">
                              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                              <span className="font-bold text-base">{guide.rating_avg}</span>
                              <span className="text-sm text-muted-foreground">
                                ({guide.rating_count})
                              </span>
                            </div>
                            <div>
                              <span className="text-xl font-bold text-primary">
                                {guide.base_price}
                              </span>
                              <span className="text-sm text-muted-foreground mr-1">جنيه/يوم</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SR>
            )}
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default GuidesPage;
