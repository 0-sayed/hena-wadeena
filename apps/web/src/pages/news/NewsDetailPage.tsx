// apps/web/src/pages/news/NewsDetailPage.tsx
import { Link, useParams } from 'react-router';
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewsArticle } from '@/hooks/use-news';
import { NEWS_CATEGORY_COLORS, NEWS_CATEGORY_LABELS, formatNewsDate } from '@/lib/news-utils';

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useNewsArticle(slug);

  return (
    <Layout>
      <div className="container max-w-3xl py-8 md:py-12" dir="rtl">
        <Link
          to="/news"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 ltr:rotate-180" />
          العودة إلى الأخبار
        </Link>

        {isLoading && (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">المقال غير موجود أو تم إزالته.</p>
          </div>
        )}

        {article && (
          <article>
            {article.coverImage && (
              <img
                src={article.coverImage}
                alt={article.titleAr}
                className="mb-8 h-64 w-full rounded-xl object-cover md:h-80"
                loading="lazy"
              />
            )}

            <Badge className={`mb-4 ${NEWS_CATEGORY_COLORS[article.category]}`}>
              {NEWS_CATEGORY_LABELS[article.category] ?? article.category}
            </Badge>

            <h1 className="mb-4 text-2xl font-bold leading-snug text-foreground md:text-3xl">
              {article.titleAr}
            </h1>

            <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {article.readingTimeMinutes} دقيقة للقراءة
              </span>
              {article.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatNewsDate(article.publishedAt)}
                </span>
              )}
            </div>

            {/* pre preserves paragraph breaks from contentAr; font-[inherit] keeps body font */}
            <pre className="whitespace-pre-wrap font-[inherit] text-base leading-8 text-foreground">
              {article.contentAr}
            </pre>
          </article>
        )}
      </div>
    </Layout>
  );
}
