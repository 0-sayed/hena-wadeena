import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Inbox, Mail, MapPin, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useMyInvestmentApplications,
  useOpportunityApplications,
} from '@/hooks/use-investment-applications';
import { useMyOpportunities } from '@/hooks/use-my-opportunities';
import { formatPrice } from '@/lib/format';

export default function InvestorDashboard() {
  const { data: opportunities, isLoading: loadingOpportunities, error } = useMyOpportunities();
  const { data: myInterests, isLoading: loadingMyInterests } = useMyInvestmentApplications();
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedOpportunityId && opportunities && opportunities.length > 0) {
      setSelectedOpportunityId(opportunities[0].id);
    }
  }, [opportunities, selectedOpportunityId]);

  const applicationsQuery = useOpportunityApplications(selectedOpportunityId);
  const selectedOpportunity = opportunities?.find(
    (opportunity) => opportunity.id === selectedOpportunityId,
  );
  const receivedApplications = applicationsQuery.data?.data ?? [];
  const opportunityTitles = useMemo(
    () =>
      new Map((opportunities ?? []).map((opportunity) => [opportunity.id, opportunity.titleAr])),
    [opportunities],
  );

  const stats = {
    opportunities: opportunities?.length ?? 0,
    receivedApplications:
      opportunities?.reduce((sum, opportunity) => sum + (opportunity.interestCount ?? 0), 0) ?? 0,
    sentApplications: myInterests?.total ?? 0,
  };

  return (
    <DashboardShell
      icon={TrendingUp}
      title="لوحة المستثمر"
      subtitle="متابعة الفرص التي نشرتها والاهتمامات التي استلمتها أو أرسلتها"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="فرصي المنشورة"
          value={loadingOpportunities ? '...' : stats.opportunities}
          icon={Briefcase}
        />
        <StatCard
          label="استفسارات مستلمة"
          value={loadingOpportunities ? '...' : stats.receivedApplications}
          icon={Inbox}
          variant="warning"
        />
        <StatCard
          label="استفسارات مرسلة"
          value={loadingMyInterests ? '...' : stats.sentApplications}
          icon={Mail}
          variant="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>فرصي الاستثمارية</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOpportunities ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">تعذر تحميل فرصك الاستثمارية</p>
            ) : !opportunities || opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لم تقم بإضافة فرص استثمارية بعد.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفرصة</TableHead>
                    <TableHead>الموقع</TableHead>
                    <TableHead>الاستثمار</TableHead>
                    <TableHead>الاهتمامات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opportunity) => (
                    <TableRow
                      key={opportunity.id}
                      className={selectedOpportunityId === opportunity.id ? 'bg-muted/40' : ''}
                      onClick={() => setSelectedOpportunityId(opportunity.id)}
                    >
                      <TableCell className="font-medium">{opportunity.titleAr}</TableCell>
                      <TableCell>{opportunity.area}</TableCell>
                      <TableCell>
                        {formatPrice(opportunity.minInvestment)} -{' '}
                        {formatPrice(opportunity.maxInvestment)} ج.م
                      </TableCell>
                      <TableCell>{opportunity.interestCount ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>صندوق الوارد الاستثماري</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedOpportunity ? (
              <p className="text-sm text-muted-foreground">
                اختر فرصة من الجدول لعرض الاستفسارات المستلمة عنها.
              </p>
            ) : applicationsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : receivedApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد استفسارات مستلمة لهذه الفرصة حتى الآن.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">{selectedOpportunity.titleAr}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedOpportunity.area}
                  </p>
                </div>
                {receivedApplications.map((application) => (
                  <div key={application.id} className="rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      {application.contactEmail ? (
                        <span className="font-semibold text-foreground">
                          {application.contactEmail}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          لا يوجد بريد إلكتروني
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-3 py-1 text-xs">
                        {application.status}
                      </span>
                    </div>
                    {application.contactPhone && (
                      <p className="text-sm text-muted-foreground">
                        الهاتف: {application.contactPhone}
                      </p>
                    )}
                    {application.amountProposed != null && (
                      <p className="text-sm text-muted-foreground">
                        قيمة مقترحة: {formatPrice(application.amountProposed)} ج.م
                      </p>
                    )}
                    {application.message && (
                      <p className="text-sm text-muted-foreground">{application.message}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {application.contactEmail && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${application.contactEmail}`}>رد عبر البريد</a>
                        </Button>
                      )}
                      {application.contactPhone && (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`tel:${application.contactPhone}`}>اتصال مباشر</a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الاستفسارات التي أرسلتها</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMyInterests ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (myInterests?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لم ترسل استفسارات استثمارية بعد.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرصة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>القيمة المقترحة</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(myInterests?.data ?? []).map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {opportunityTitles.get(application.opportunityId) ?? application.opportunityId}
                    </TableCell>
                    <TableCell>{application.status}</TableCell>
                    <TableCell>
                      {application.amountProposed != null
                        ? `${formatPrice(application.amountProposed)} ج.م`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/investment/opportunity/${application.opportunityId}`}
                        className="text-primary hover:underline"
                      >
                        عرض الفرصة
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
