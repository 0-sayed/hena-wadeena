import { useNavigate, useSearchParams } from 'react-router';
import { Briefcase, Plus } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/motion/Skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useJobs } from '@/hooks/use-jobs';
import { normalizePageParam } from '@/pages/jobs/job-form.utils';
import {
  formatArabicSeats,
  formatPrice,
  districtLabel,
  jobCategoryLabel,
  jobStatusLabel,
  compensationTypeLabel,
  JOB_CATEGORY_OPTIONS_WITH_ALL,
  COMPENSATION_TYPE_OPTIONS_WITH_ALL,
  DISTRICTS_WITH_ALL,
} from '@/lib/format';
import { UserRole } from '@hena-wadeena/types';
import type { JobPost } from '@/services/api';

const CATEGORY_BADGE_COLOR: Record<string, string> = {
  agriculture: 'bg-green-100 text-green-800',
  tourism: 'bg-blue-100 text-blue-800',
  skilled_trade: 'bg-orange-100 text-orange-800',
  domestic: 'bg-purple-100 text-purple-800',
  logistics: 'bg-yellow-100 text-yellow-800',
  handicraft: 'bg-pink-100 text-pink-800',
};

const PAGE_SIZE = 12;

function JobCard({ job, onClick }: { job: JobPost; onClick: () => void }) {
  const colorClass = CATEGORY_BADGE_COLOR[job.category] ?? 'bg-muted text-muted-foreground';
  return (
    <Card
      className="cursor-pointer border-border/50 transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground leading-snug">{job.title}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {jobCategoryLabel(job.category)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{districtLabel(job.area)}</span>
          <span>
            {formatPrice(job.compensation)} جنيه / {compensationTypeLabel(job.compensationType)}
          </span>
          <span>{formatArabicSeats(job.slots)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{jobStatusLabel(job.status)}</span>
          <span dir="ltr">{new Date(job.createdAt).toLocaleDateString('ar-EG')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobBoardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canPost = user?.role === UserRole.MERCHANT || user?.role === UserRole.FARMER;

  const category = searchParams.get('category') ?? undefined;
  const area = searchParams.get('area') ?? undefined;
  const compensationType = searchParams.get('compensationType') ?? undefined;
  const page = normalizePageParam(searchParams.get('page'));

  const { data, isLoading, isError, refetch } = useJobs({
    category,
    area,
    compensationType,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function setFilter(key: string, value: string | undefined) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete('page');
      return next;
    });
  }

  return (
    <Layout title="لوحة التوظيف">
      <section className="py-8 md:py-12">
        <div className="container px-4">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">لوحة التوظيف</h1>
            </div>
            {canPost && (
              <Button onClick={() => void navigate('/jobs/post')}>
                <Plus className="ms-2 h-4 w-4" />
                نشر وظيفة
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <Select
              value={category ?? 'all'}
              onValueChange={(v) => setFilter('category', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                {JOB_CATEGORY_OPTIONS_WITH_ALL.map((opt) => (
                  <SelectItem key={opt.id ?? 'all'} value={opt.id ?? 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={area ?? 'all'}
              onValueChange={(v) => setFilter('area', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="المنطقة" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS_WITH_ALL.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={compensationType ?? 'all'}
              onValueChange={(v) => setFilter('compensationType', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="نوع التعويض" />
              </SelectTrigger>
              <SelectContent>
                {COMPENSATION_TYPE_OPTIONS_WITH_ALL.map((opt) => (
                  <SelectItem key={opt.id ?? 'all'} value={opt.id ?? 'all'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h="h-36" className="rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-muted-foreground">تعذر تحميل الوظائف.</p>
              <Button onClick={() => void refetch()}>إعادة المحاولة</Button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <p className="text-lg text-muted-foreground">لا توجد وظائف متاحة في الوقت الحالي</p>
              {canPost && <Button onClick={() => void navigate('/jobs/post')}>نشر وظيفة</Button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => void navigate(`/jobs/${job.id}`)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() =>
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set('page', String(page - 1));
                        return next;
                      })
                    }
                  >
                    السابق
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() =>
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set('page', String(page + 1));
                        return next;
                      })
                    }
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
