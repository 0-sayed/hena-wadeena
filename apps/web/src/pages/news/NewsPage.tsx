// apps/web/src/pages/news/NewsPage.tsx
import { useState } from 'react';
import { Link } from 'react-router';
import { Clock, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewsList } from '@/hooks/use-news';
import type { NewsArticle } from '@hena-wadeena/types';
import {
  NEWS_CATEGORY_COLORS,
  NEWS_CATEGORY_LABELS,
  NEWS_CATEGORY_OPTIONS,
  formatNewsDate,
} from '@/lib/news-utils';

const LIMIT = 12;

const TABS = [{ value: undefined, label: 'الكل' }, ...NEWS_CATEGORY_OPTIONS];

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <Link to={`/news/${article.slug}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.titleAr}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        )}
        <CardContent className="flex flex-col gap-3 p-4">
          <Badge className={`w-fit text-xs ${NEWS_CATEGORY_COLORS[article.category]}`}>
            {NEWS_CATEGORY_LABELS[article.category] ?? article.category}
          </Badge>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {article.titleAr}
          </h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">{article.summaryAr}</p>
          <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.authorName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTimeMinutes} دقيقة
            </span>
            {article.publishedAt && (
              <span className="ms-auto">{formatNewsDate(article.publishedAt)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NewsCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}

export default function NewsPage() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, refetch } = useNewsList({ category, offset, limit: LIMIT });

  const total = data?.total ?? 0;
  const hasMore = offset + LIMIT < total;
  const hasPrev = offset > 0;

  function handleTabChange(value: string | undefined) {
    setCategory(value);
    setOffset(0);
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">أخبار الوادي الجديد</h1>
          <p className="mt-2 text-muted-foreground">آخر أخبار وتطورات محافظة الوادي الجديد</p>
        </div>

        {/* Category tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">حدث خطأ أثناء تحميل الأخبار</p>
            <Button variant="outline" onClick={() => void refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  disabled={!hasPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                >
                  السابق
                </Button>
                <span className="text-sm text-muted-foreground">
                  {offset + 1}–{Math.min(offset + LIMIT, total)} من {total}
                </span>
                <Button
                  variant="outline"
                  disabled={!hasMore}
                  onClick={() => setOffset((o) => o + LIMIT)}
                >
                  التالي
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            لا توجد مقالات في هذه الفئة.
          </div>
        )}
      </div>
    </Layout>
  );
}
