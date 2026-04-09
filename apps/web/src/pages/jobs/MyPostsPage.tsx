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

const UPDATE_STATUS_LABEL: Record<'accepted' | 'rejected' | 'in_progress' | 'completed', string> = {
  accepted: 'تم قبول الطلب',
  rejected: 'تم رفض الطلب',
  in_progress: 'بدأ العمل',
  completed: 'تم إتمام العمل وتحويل الأجر',
};

// ── Applicant row ─────────────────────────────────────────────────────────────

function ApplicantRow({
  app,
  jobId,
  profile,
  posterRatings,
}: {
  app: JobApplication;
  jobId: string;
  profile: PublicUserProfile | undefined;
  posterRatings: { applicationId: string }[];
}) {
  const updateMutation = useUpdateApplicationMutation(jobId);
  const [showReview, setShowReview] = useState(false);

  const hasRated = posterRatings.some((r) => r.applicationId === app.id);
  const initials = profile?.full_name ? getInitials(profile.full_name) : '?';

  async function updateStatus(newStatus: 'accepted' | 'rejected' | 'in_progress' | 'completed') {
    try {
      await updateMutation.mutateAsync({ appId: app.id, status: newStatus });
      toast.success(UPDATE_STATUS_LABEL[newStatus]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحديث الحالة');
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
            {applicationStatusLabel(app.status)}
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
                قبول
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void updateStatus('rejected')}
                disabled={updateMutation.isPending}
              >
                رفض
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
              بدء العمل
            </Button>
          )}
          {app.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => void updateStatus('completed')}
              disabled={updateMutation.isPending}
            >
              إتمام
            </Button>
          )}
          {app.status === 'completed' && !hasRated && !showReview && (
            <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
              تقييم
            </Button>
          )}
        </div>
      </div>
      {app.noteAr && <p className="text-sm text-muted-foreground">ملاحظة: {app.noteAr}</p>}
      {showReview && (
        <ReviewForm
          jobId={jobId}
          appId={app.id}
          label="تقييم العامل"
          onDone={() => setShowReview(false)}
        />
      )}
    </div>
  );
}

// ── Job accordion row ─────────────────────────────────────────────────────────

function JobAccordionRow({
  job,
  posterRatings,
}: {
  job: JobPost;
  posterRatings: { applicationId: string }[];
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
            {jobStatusLabel(job.status)}
          </Badge>
          <span className="text-sm text-muted-foreground shrink-0">
            {formatArabicSeats(job.slots)}
          </span>
          <span className="text-sm text-muted-foreground shrink-0">
            {formatPrice(job.compensation)} جنيه / {compensationTypeLabel(job.compensationType)}
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
            <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
          ) : (
            apps.map((app) => (
              <ApplicantRow
                key={app.id}
                app={app}
                jobId={job.id}
                profile={profiles.data?.[app.applicantId]}
                posterRatings={posterRatings}
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
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useMyPosts(true);
  const { data: myReviews } = useUserReviews(user?.id);
  const jobs = data?.data ?? [];

  const posterRatings = (myReviews ?? []).filter((r) => r.direction === 'poster_rates_worker');

  if (isLoading) {
    return (
      <Layout title="وظائفي المنشورة">
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
      <Layout title="وظائفي المنشورة">
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground">تعذر تحميل وظائفك.</p>
          <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="وظائفي المنشورة">
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">وظائفي المنشورة</h1>
            <Button onClick={() => void navigate('/jobs/post')}>نشر وظيفة جديدة</Button>
          </div>

          {jobs.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center space-y-4">
                <p className="text-lg text-muted-foreground">لم تنشر وظائف بعد.</p>
                <Button onClick={() => void navigate('/jobs/post')}>نشر وظيفة</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobAccordionRow key={job.id} job={job} posterRatings={posterRatings} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
