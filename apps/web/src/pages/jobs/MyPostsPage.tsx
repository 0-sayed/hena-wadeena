import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import {
  useMyPosts,
  useJobApplications,
  useUpdateApplicationMutation,
  useUserReviews,
} from '@/hooks/use-jobs';
import { usePublicUsers } from '@/hooks/use-users';
import {
  jobStatusLabel,
  applicationStatusLabel,
  formatArabicSeats,
  formatPrice,
  compensationTypeLabel,
} from '@/lib/format';
import { getInitials } from '@/lib/utils';
import type { JobPost, JobApplication, PublicUserProfile } from '@/services/api';
import { ReviewForm } from './_shared';
import type { AppLanguage } from '@/lib/localization';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// ── Applicant row ─────────────────────────────────────────────────────────────

function ApplicantRow({
  app,
  jobId,
  profile,
  posterRatings,
  appLanguage,
  t,
}: {
  app: JobApplication;
  jobId: string;
  profile: PublicUserProfile | undefined;
  posterRatings: { applicationId: string }[];
  appLanguage: AppLanguage;
  t: TFunction;
}) {
  const updateMutation = useUpdateApplicationMutation(jobId);
  const [showReview, setShowReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(false);

  const hasRated = submittedReview || posterRatings.some((r) => r.applicationId === app.id);
  const initials = profile?.full_name ? getInitials(profile.full_name) : '?';

  async function updateStatus(newStatus: 'accepted' | 'rejected' | 'in_progress' | 'completed') {
    try {
      await updateMutation.mutateAsync({ appId: app.id, status: newStatus });
      const label = t(`updateStatusLabels.${newStatus}`);
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateStatusError'));
    }
  }

  return (
    <div className="rounded-lg border border-border/50 p-4 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{profile?.full_name ?? '...'}</span>
          <Badge variant="outline" className="text-xs">
            {applicationStatusLabel(app.status, appLanguage)}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          {app.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => void updateStatus('accepted')}
                disabled={updateMutation.isPending}
              >
                {t('acceptBtn')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void updateStatus('rejected')}
                disabled={updateMutation.isPending}
              >
                {t('rejectBtn')}
              </Button>
            </>
          )}
          {app.status === 'accepted' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void updateStatus('in_progress')}
              disabled={updateMutation.isPending}
            >
              {t('startWorkBtn')}
            </Button>
          )}
          {app.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => void updateStatus('completed')}
              disabled={updateMutation.isPending}
            >
              {t('completeBtn')}
            </Button>
          )}
          {app.status === 'completed' && !hasRated && !showReview && (
            <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
              {t('rateBtn')}
            </Button>
          )}
        </div>
      </div>
      {app.noteAr && (
        <p className="text-sm text-muted-foreground">
          {t('notePrefixLabel')} {app.noteAr}
        </p>
      )}
      {showReview && (
        <ReviewForm
          jobId={jobId}
          appId={app.id}
          direction="poster_rates_worker"
          label={t('rateWorkerBtn')}
          onDone={() => {
            setShowReview(false);
            setSubmittedReview(true);
          }}
        />
      )}
    </div>
  );
}

// ── Job accordion row ─────────────────────────────────────────────────────────

function JobAccordionRow({
  job,
  posterRatings,
  appLanguage,
  t,
}: {
  job: JobPost;
  posterRatings: { applicationId: string }[];
  appLanguage: AppLanguage;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const { data: appsData, isLoading: appsLoading } = useJobApplications(open ? job.id : undefined);
  const apps = appsData?.data ?? [];
  const profiles = usePublicUsers(apps.map((a) => a.applicantId));

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        type="button"
        className="w-full p-4 flex items-center justify-between gap-3 text-start hover:bg-muted/20 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-semibold text-foreground truncate">{job.title}</span>
          <Badge variant="secondary" className="shrink-0">
            {jobStatusLabel(job.status, appLanguage)}
          </Badge>
          <span className="text-sm text-muted-foreground shrink-0">
            {formatArabicSeats(job.slots)}
          </span>
          <span className="text-sm text-muted-foreground shrink-0">
            {t('perCompensation', {
              price: formatPrice(job.compensation),
              compensation: compensationTypeLabel(job.compensationType, appLanguage),
            })}
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border/50 p-4 space-y-3 bg-muted/5">
          {appsLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noApplicationsYet')}</p>
          ) : (
            apps.map((app) => (
              <ApplicantRow
                key={app.id}
                app={app}
                jobId={job.id}
                profile={profiles.data?.[app.applicantId]}
                posterRatings={posterRatings}
                appLanguage={appLanguage}
                t={t}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyPostsPage() {
  const navigate = useNavigate();
  const { user, language } = useAuth();
  const appLanguage = language as AppLanguage;
  const { t } = useTranslation('jobs');
  const { data, isLoading, isError, refetch } = useMyPosts(true);
  const { data: myReviews } = useUserReviews(user?.id, 'reviewer');
  const jobs = data?.data ?? [];

  const posterRatings = (myReviews?.data ?? []).filter(
    (r) => r.direction === 'poster_rates_worker',
  );

  if (isLoading) {
    return (
      <Layout title={t('myPostsTitle')}>
        <div className="container py-10 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout title={t('myPostsTitle')}>
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground">{t('loadErrorPosts')}</p>
          <Button onClick={() => void refetch()}>{t('retryBtn')}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('myPostsTitle')}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">{t('myPostsTitle')}</h1>
            <Button onClick={() => void navigate('/jobs/post')}>{t('postNewJobBtn')}</Button>
          </div>

          {jobs.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center space-y-4">
                <p className="text-lg text-muted-foreground">{t('emptyPosts')}</p>
                <Button onClick={() => void navigate('/jobs/post')}>{t('createJobBtn')}</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobAccordionRow
                  key={job.id}
                  job={job}
                  posterRatings={posterRatings}
                  appLanguage={appLanguage}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
