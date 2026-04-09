import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { ArrowRight, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useJob, useMyApplications, useApplyMutation } from '@/hooks/use-jobs';
import { usePublicUsers } from '@/hooks/use-users';
import { pickLocalizedField } from '@/lib/localization';
import {
  formatArabicSeats,
  formatPrice,
  districtLabel,
  jobCategoryLabel,
  jobStatusLabel,
  applicationStatusLabel,
  compensationTypeLabel,
} from '@/lib/format';
import { getInitials } from '@/lib/utils';

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, language } = useAuth();

  const { data: job, isLoading, isError, refetch } = useJob(id);
  const posterProfiles = usePublicUsers(job ? [job.posterId] : []);
  const { data: myAppsData } = useMyApplications(isAuthenticated);

  const myApplication = myAppsData?.data?.find((app) => app.jobId === id);
  const isPoster = user?.id === job?.posterId;

  const applyMutation = useApplyMutation(id ?? '');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [noteAr, setNoteAr] = useState('');

  const poster = job ? posterProfiles.data?.[job.posterId] : undefined;
  const posterInitials = poster?.full_name ? getInitials(poster.full_name) : '?';

  async function handleApply() {
    try {
      await applyMutation.mutateAsync({ noteAr: noteAr.trim() || undefined });
      toast.success('تم تقديم طلبك بنجاح');
      setShowApplyForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تقديم الطلب');
    }
  }

  if (isLoading) {
    return (
      <Layout title="تفاصيل الوظيفة">
        <div className="container py-10 space-y-6">
          <Skeleton h="h-10" className="w-32 rounded-xl" />
          <Skeleton h="h-64" className="rounded-2xl" />
          <Skeleton h="h-40" className="rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !job) {
    return (
      <Layout title="تفاصيل الوظيفة">
        <div className="container py-20 text-center space-y-4">
          <p className="text-lg text-muted-foreground">تعذر تحميل تفاصيل الوظيفة.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => void navigate('/jobs')}>
              العودة إلى لوحة التوظيف
            </Button>
            <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const canApply = isAuthenticated && !isPoster && job.status === 'open' && !myApplication;

  return (
    <Layout title="تفاصيل الوظيفة">
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="space-y-6 lg:col-span-2">
              <Card className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{jobCategoryLabel(job.category)}</Badge>
                    <Badge variant="outline">{jobStatusLabel(job.status)}</Badge>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground md:text-3xl">{job.title}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>{districtLabel(job.area)}</span>
                    <span>
                      {formatPrice(job.compensation)} جنيه /{' '}
                      {compensationTypeLabel(job.compensationType)}
                    </span>
                    <span>{formatArabicSeats(job.slots)}</span>
                  </div>
                  {(job.startsAt ?? job.endsAt) && (
                    <div className="text-sm text-muted-foreground">
                      {job.startsAt && (
                        <span>من {new Date(job.startsAt).toLocaleDateString('ar-EG')} </span>
                      )}
                      {job.endsAt && (
                        <span>إلى {new Date(job.endsAt).toLocaleDateString('ar-EG')}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">الوصف</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {pickLocalizedField(language, {
                      ar: job.descriptionAr,
                      en: job.descriptionEn,
                    })}
                  </p>
                </CardContent>
              </Card>

              {/* Existing application banner */}
              {myApplication && (
                <Card className="border-border/50 bg-muted/30">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">طلبك الحالي</p>
                      <Badge variant="outline">
                        {applicationStatusLabel(myApplication.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apply section */}
              {!isAuthenticated && job.status === 'open' && (
                <Card className="border-border/50">
                  <CardContent className="p-6 text-center">
                    <p className="mb-4 text-muted-foreground">سجّل دخولك للتقديم على هذه الوظيفة</p>
                    <Button onClick={() => void navigate('/login')}>تسجيل الدخول</Button>
                  </CardContent>
                </Card>
              )}

              {canApply && !showApplyForm && (
                <Button className="w-full" size="lg" onClick={() => setShowApplyForm(true)}>
                  <Briefcase className="ms-2 h-5 w-5" />
                  تقديم طلب
                </Button>
              )}

              {canApply && showApplyForm && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">تقديم طلب</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="noteAr" className="text-sm font-medium">
                        ملاحظة (اختياري)
                      </label>
                      <Textarea
                        id="noteAr"
                        placeholder="اكتب ملاحظة للناشر..."
                        value={noteAr}
                        onChange={(e) => setNoteAr(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => void handleApply()} disabled={applyMutation.isPending}>
                        {applyMutation.isPending ? 'جارٍ التقديم...' : 'إرسال الطلب'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                        إلغاء
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Poster info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">ناشر الوظيفة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={poster?.avatar_url ?? undefined} alt={poster?.full_name} />
                      <AvatarFallback>{posterInitials}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-foreground">
                      {poster?.full_name ?? 'صاحب العمل'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Poster management actions */}
              {isPoster && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">إدارة الوظيفة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/jobs/my-posts">إدارة الطلبات</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
