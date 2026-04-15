import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageHero } from '@/components/layout/PageHero';
import { Search, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStatusBoard } from '@/hooks/use-map';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';
import { useDebouncedCallback } from '@/hooks/use-debounce';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  limited: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

function SiteStatusBoardPage() {
  const navigate = useNavigate();
  const { language } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading, isError } = useStatusBoard(page, search, statusFilter ?? 'all');

  const handleSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const t = {
    title: pickLocalizedCopy(language, { ar: 'حالة المواقع', en: 'Site Status' }),
    description: pickLocalizedCopy(language, {
      ar: 'معرفة حالة المواقع السياحية والخدمية',
      en: 'Check the status of tourist and service sites',
    }),
    searchPlaceholder: pickLocalizedCopy(language, {
      ar: 'البحث عن موقع...',
      en: 'Search sites...',
    }),
    noResults: pickLocalizedCopy(language, { ar: 'لا توجد نتائج', en: 'No results found' }),
    error: pickLocalizedCopy(language, { ar: 'حدث خطأ', en: 'An error occurred' }),
    previous: pickLocalizedCopy(language, { ar: 'السابق', en: 'Previous' }),
    next: pickLocalizedCopy(language, { ar: 'التالي', en: 'Next' }),
  };

  return (
    <Layout title={t.title}>
      <PageHero image="/images/seed/wiki-white-desert-1.jpg" alt={t.title}>
        <div className="mb-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => void navigate('/tourism')}
            className="text-card hover:bg-card/10 hover:text-card"
          >
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {pickLocalizedCopy(language, { ar: 'العودة إلى السياحة', en: 'Back to Tourism' })}
          </Button>
        </div>
        <h1 className="mb-4 text-center text-4xl font-bold tracking-tight text-card">{t.title}</h1>
        <p className="text-center text-lg text-card/80">{t.description}</p>
      </PageHero>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              className="ps-9"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            aria-label={pickLocalizedCopy(language, { ar: 'تصفية الحالة', en: 'Filter status' })}
            value={statusFilter ?? ''}
            onChange={(e) => {
              setStatusFilter(e.target.value || undefined);
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              {pickLocalizedCopy(language, { ar: 'كل الحالات', en: 'All statuses' })}
            </option>
            <option value="open">{pickLocalizedCopy(language, { ar: 'مفتوح', en: 'Open' })}</option>
            <option value="limited">
              {pickLocalizedCopy(language, { ar: 'جزئي', en: 'Limited' })}
            </option>
            <option value="closed">
              {pickLocalizedCopy(language, { ar: 'مغلق', en: 'Closed' })}
            </option>
          </select>
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">{t.error}</p>
          </div>
        )}

        {data && data.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <MapPin className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{t.noResults}</p>
          </div>
        )}

        {data && data.data.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((site) => (
                <Card key={site.id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-semibold">
                        {language === 'ar' ? site.nameAr : site.nameEn || site.nameAr}
                      </h3>
                      {site.status && (
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[site.status] || 'bg-muted'}
                        >
                          {site.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{site.category}</p>
                    {(site.statusNoteAr || site.statusNoteEn) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {language === 'ar'
                          ? site.statusNoteAr
                          : site.statusNoteEn || site.statusNoteAr}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t.previous}
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.hasMore}
              >
                {t.next}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default SiteStatusBoardPage;
