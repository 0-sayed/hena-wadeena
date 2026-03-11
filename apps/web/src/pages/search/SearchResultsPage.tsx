import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useSearchParams, Link } from 'react-router';
import { Search, MapPin, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { searchAPI, type SearchResult } from '@/services/api';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';

const typeLabels: Record<string, string> = {
  poi: 'مكان',
  attraction: 'معلم سياحي',
  guide: 'مرشد',
  supplier: 'مورّد',
  investment: 'استثمار',
  transport: 'نقل',
};
const typeColors: Record<string, string> = {
  poi: 'bg-blue-500/10 text-blue-600',
  attraction: 'bg-green-500/10 text-green-600',
  guide: 'bg-purple-500/10 text-purple-600',
  supplier: 'bg-orange-500/10 text-orange-600',
  investment: 'bg-yellow-500/10 text-yellow-600',
  transport: 'bg-red-500/10 text-red-600',
};

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = (q: string, type?: string) => {
    const t = type || typeFilter;
    setLoading(true);
    searchAPI
      .search(q, t || undefined)
      .then((r) => {
        setResults(r.data);
        setTotal(r.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    setSearchParams({ q, ...(t ? { type: t } : {}) });
  };

  useEffect(() => {
    if (query) doSearch(query, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };
  const filterByType = (type: string) => {
    const t = typeFilter === type ? '' : type;
    setTypeFilter(t);
    doSearch(query, t);
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-3xl">
            <SR>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">بحث شامل</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">بحث في المنصة 🔍</h1>
              </div>
            </SR>

            <SR delay={100}>
              <form onSubmit={handleSubmit} className="relative mb-8">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن أماكن، مرشدين، فرص استثمارية..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pr-14 h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
                />
              </form>
            </SR>

            <SR delay={200}>
              <div className="flex flex-wrap gap-2 mb-8">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={typeFilter === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg hover:scale-[1.05] transition-transform"
                    onClick={() => filterByType(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </SR>

            {query && (
              <p className="text-sm text-muted-foreground mb-5">
                {total} نتيجة لـ "{query}"
              </p>
            )}

            <div className="space-y-4">
              {loading
                ? [1, 2, 3, 4].map((i) => <Skeleton key={i} h="h-24" className="rounded-2xl" />)
                : results.map((r, idx) => (
                    <SR key={r.id} delay={idx * 50}>
                      <Link to={r.url}>
                        <Card className="hover-lift hover:border-primary/30 rounded-2xl mb-1 cursor-pointer">
                          <CardContent className="p-5 flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={typeColors[r.type] || ''} variant="outline">
                                  {typeLabels[r.type] || r.type}
                                </Badge>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {r.location}
                                </span>
                              </div>
                              <h3 className="font-bold text-foreground text-lg">{r.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </SR>
                  ))}
              {query && !loading && results.length === 0 && (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    لا توجد نتائج. جرب كلمات بحث مختلفة.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default SearchResultsPage;
