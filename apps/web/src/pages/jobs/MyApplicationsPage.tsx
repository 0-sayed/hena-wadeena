import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import {
  useMyApplications,
  useWithdrawApplicationMutation,
  useUserReviews,
} from '@/hooks/use-jobs';
import { applicationStatusLabel } from '@/lib/format';
import type { JobApplication } from '@/services/api';
import { ReviewForm } from './_shared';
import type { AppLanguage } from '@/lib/localization';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-muted text-muted-foreground',
  withdrawn: 'bg-gray-100 text-gray-600',
};

// ── Application row ───────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  workerRatings,
  appLanguage,
  t,
}: {
  app: JobApplication;
  workerRatings: { applicationId: string }[];
  appLanguage: AppLanguage;
  t: TFunction;
}) {
  const withdrawMutation = useWithdrawApplicationMutation(app.jobId);
  const [showReview, setShowReview] = useState(false);

  const hasRated = workerRatings.some((r) => r.applicationId === app.id);
  const colorClass = STATUS_BADGE_CLASS[app.status] ?? '';

  async function handleWithdraw() {
    try {
      await withdrawMutation.mutateAsync(app.id);
      toast.success(t('withdrawSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('withdrawError'));
    }
  }

  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            to={`/jobs/${app.jobId}`}
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            {t('jobIdPrefix')}{app.jobId.slice(0, 8)}
          </Link>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              {t('appliedOn', { 
                date: new Date(app.appliedAt).toLocaleDateString(appLanguage === 'en' ? 'en-US' : 'ar-EG') 
              })}
            </span>
            {app.resolvedAt && (
              <span>
                • {t('updatedOn', { 
                    date: new Date(app.resolvedAt).toLocaleDateString(appLanguage === 'en' ? 'en-US' : 'ar-EG') 
                  })}
              </span>
            )}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
          {applicationStatusLabel(app.status, appLanguage)}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {app.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleWithdraw()}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending ? t('withdrawingStatus') : t('withdrawBtn')}
          </Button>
        )}
        {app.status === 'completed' && !hasRated && !showReview && (
          <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
            {t('rateEmployerBtn')}
          </Button>
        )}
      </div>

      {showReview && (
        <ReviewForm
          jobId={app.jobId}
          appId={app.id}
          label={t('rateEmployerBtn')}
          onDone={() => setShowReview(false)}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const { user, language } = useAuth();
  const appLanguage = language as AppLanguage;
  const { t } = useTranslation('jobs');
  const { data, isLoading, isError, refetch } = useMyApplications(true);
  const { data: myReviews } = useUserReviews(user?.id);
  const apps = data?.data ?? [];

  const workerRatings = (myReviews ?? []).filter((r) => r.direction === 'worker_rates_poster');

  if (isLoading) {
    return (
      <Layout title={t('myApplicationsTitle')}>
        <div className="container py-10 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout title={t('myApplicationsTitle')}>
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground">{t('loadErrorApplications')}</p>
          <Button onClick={() => void refetch()}>{t('retryBtn')}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('myApplicationsTitle')}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <h1 className="mb-8 text-2xl font-bold text-foreground">{t('myApplicationsTitle')}</h1>

          {apps.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center">
                <p className="text-lg text-muted-foreground mb-4">{t('emptyApplications')}</p>
                <Button asChild>
                  <Link to="/jobs">{t('browseJobsBtn')}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <ApplicationRow key={app.id} app={app} workerRatings={workerRatings} appLanguage={appLanguage} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
