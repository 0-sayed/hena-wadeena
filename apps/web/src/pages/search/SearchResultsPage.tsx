import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useSearchParams, Link } from 'react-router';
import { Search, MapPin, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SR } from '@/components/motion/ScrollReveal';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { Skeleton } from '@/components/motion/Skeleton';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { useSearch } from '@/hooks/use-search';
import type { SearchResult, SearchResultType } from '@hena-wadeena/types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';

const typeColors: Record<string, string> = {
  listing: 'bg-orange-500/10 text-orange-600',
  opportunity: 'bg-yellow-500/10 text-yellow-600',
  business: 'bg-blue-500/10 text-blue-600',
  user: 'bg-purple-500/10 text-purple-600',
  guide: 'bg-green-500/10 text-green-600',
  attraction: 'bg-teal-500/10 text-teal-600',
  package: 'bg-pink-500/10 text-pink-600',
  poi: 'bg-cyan-500/10 text-cyan-600',
};

function getResultUrl(result: SearchResult): string {
  switch (result.type) {
    case 'listing':
      return `/marketplace/ads/${result.id}`;
    case 'business':
      return `/marketplace/supplier/${result.id}`;
    case 'opportunity':
      return `/investment/opportunity/${result.id}`;
    case 'user': {
      // Identity search returns role in metadata (guide/merchant/driver)
      // Only guides have profile pages; others fall back to section pages
      const role = result.metadata.role;
      if (role === 'guide') return `/guides/${result.id}`;
      if (role === 'merchant') return '/marketplace';
      if (role === 'driver') return '/logistics';
      return '/search';
    }
    case 'guide':
      return `/guides/${result.id}`;
    case 'attraction':
      // AttractionDetailsPage expects slug, not id
      return result.metadata.slug ? `/tourism/attraction/${result.metadata.slug}` : '/tourism';
    case 'package':
      return `/tourism/packages`;
    case 'poi':
      return `/logistics`;
    default:
      return '/search';
  }
}

const SearchResultsPage = () => {
  const { t } = useTranslation('search');
  const { language } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('q') ?? '');
  // Derive query directly from URL so it stays in sync when navigating from Header
  const query = searchParams.get('q') ?? '';
  const typeFilter = (searchParams.get('type') as SearchResultType) || undefined;

  // Sync inputValue when URL changes (e.g., navigating from Header search)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const { data, isLoading, isError } = useSearch(query, typeFilter);

  const applySearch = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    });
  };

  const debouncedSearch = useDebouncedCallback(applySearch);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    debouncedSearch(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(inputValue);
  };

  const filterByType = (type: string) => {
    const newType = typeFilter === type ? undefined : type;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newType) next.set('type', newType);
      else next.delete('type');
      if (query) next.set('q', query);
      return next;
    });
  };

  // When a filter is active, show all known types so user can switch filters.
  // Otherwise, derive from current results (with optional chaining to avoid TypeError during loading).
  const availableTypes = useMemo(
    () =>
      typeFilter
        ? (Object.keys(typeColors) as SearchResultType[])
        : [...new Set(data?.data?.map((r) => r.type) ?? [])],
    [data, typeFilter],
  );

  const results = data?.data ?? [];

  return (
    <Layout title={t('title')}>
      <PageTransition>
        <section className="relative py-14 md:py-20 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-3xl">
            <SR>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-primary">{t('comprehensiveSearch')}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('mainHeading')}</h1>
              </div>
            </SR>

            <SR delay={100}>
              <form onSubmit={handleSubmit} className="relative mb-8">
                <Search className="search-inline-icon-lg absolute top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                <Input
                  placeholder={t('placeholder')}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="search-input-with-icon-lg h-16 text-lg rounded-2xl shadow-lg border-0 bg-card/90 backdrop-blur-sm"
                />
              </form>
            </SR>

            {availableTypes.length > 0 && (
              <SR delay={200}>
                <div className="flex flex-wrap gap-2 mb-8">
                  {availableTypes.map((type) => (
                    <Button
                      key={type}
                      variant={typeFilter === type ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-lg hover:scale-[1.05] transition-transform"
                      onClick={() => filterByType(type)}
                    >
                      {t(`types.${type}`)}
                    </Button>
                  ))}
                </div>
              </SR>
            )}

            {query && !isLoading && (
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-muted-foreground">
                  {t('resultsCount', { count: results.length, query })}
                  {data?.hasMore && t('hasMore')}
                </p>
                {data?.sources && data.sources.length > 0 && (
                  <p className="text-xs text-muted-foreground">{t('fromSources', { sources: data.sources.join('، ') })}</p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {isLoading
                ? [1, 2, 3, 4].map((i) => <Skeleton key={i} h="h-24" className="rounded-2xl" />)
                : results.map((r, idx) => (
                    <SR key={r.id} delay={idx * 50}>
                      <Link to={getResultUrl(r)}>
                        <Card className="hover-lift hover:border-primary/30 rounded-2xl mb-1 cursor-pointer">
                          <CardContent className="p-5 flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={typeColors[r.type] ?? ''}
                                  variant="outline"
                                >
                                  {t(`types.${r.type}`)}
                                </Badge>
                                {r.metadata.district && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {r.metadata.district}
                                  </span>
                                )}
                                {r.metadata.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {r.metadata.category}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-bold text-foreground text-lg">{(language === 'en' ? r.title.en : r.title.ar) ?? r.title.ar ?? ''}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{r.snippet}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </SR>
                  ))}
              {isError && (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    {t('error')}
                  </CardContent>
                </Card>
              )}
              {query && !isLoading && !isError && results.length === 0 && (
                <Card className="rounded-2xl">
                  <CardContent className="p-14 text-center text-muted-foreground text-lg">
                    {t('empty')}
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
