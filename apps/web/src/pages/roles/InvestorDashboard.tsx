import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Inbox, Mail, MapPin, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LtrText } from '@/components/ui/ltr-text';
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
import { useBusinessInquiriesReceived } from '@/hooks/use-business-inquiries';
import { useMyBusinesses } from '@/hooks/use-my-businesses';
import { useMyOpportunities } from '@/hooks/use-my-opportunities';
import { useAuth } from '@/hooks/use-auth';
import { formatPrice } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { useTranslation } from 'react-i18next';

const applicationStatusLabels: Record<string, { ar: string; en: string }> = {
  pending: { ar: 'قيد المراجعة', en: 'Pending' },
  reviewed: { ar: 'تمت المراجعة', en: 'Reviewed' },
  accepted: { ar: 'مقبول', en: 'Accepted' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  withdrawn: { ar: 'مسحوب', en: 'Withdrawn' },
};

function formatAmountWithCurrency(value: number, language: AppLanguage): string {
  return `${formatPrice(value)} ${t('transactions.currency')}`;
}

function applicationStatusLabel(status: string, language: AppLanguage) {
  const labels = applicationStatusLabels[status];
  return labels ? pickLocalizedCopy(language, labels) : status;
}

export default function InvestorDashboard() {
  const {
    t
  } = useTranslation(['wallet', 'dashboard', 'tourism', 'search', 'investment']);

  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const { data: opportunities, isLoading: loadingOpportunities, error } = useMyOpportunities();
  const { data: myBusinesses, isLoading: loadingBusinesses } = useMyBusinesses();
  const {
    data: myInterests,
    isLoading: loadingMyInterests,
    isError: myInterestsError,
  } = useMyInvestmentApplications();
  const {
    data: startupInquiries,
    isLoading: loadingStartupInquiries,
    isError: startupInquiriesError,
  } = useBusinessInquiriesReceived(
    { limit: 5 },
    { enabled: !loadingBusinesses && (myBusinesses?.length ?? 0) > 0 },
  );
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
      new Map(
        (opportunities ?? []).map((opportunity) => [
          opportunity.id,
          pickLocalizedField(appLanguage, {
            ar: opportunity.titleAr,
            en: opportunity.titleEn,
          }),
        ]),
      ),
    [appLanguage, opportunities],
  );

  const stats = {
    opportunities: opportunities?.length ?? 0,
    receivedApplications:
      opportunities?.reduce((sum, opportunity) => sum + (opportunity.interestCount ?? 0), 0) ?? 0,
    sentApplications: myInterests?.total ?? 0,
    startupInquiries: startupInquiries?.total ?? 0,
  };

  return (
    <DashboardShell
      icon={TrendingUp}
      title={t('investor.title')}
      subtitle={t('investor.subtitle')}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('investor.stats.published')}
          value={loadingOpportunities ? '...' : stats.opportunities}
          icon={Briefcase}
        />
        <StatCard
          label={t('investor.stats.received')}
          value={loadingOpportunities ? '...' : stats.receivedApplications}
          icon={Inbox}
          variant="warning"
        />
        <StatCard
          label={t('investor.stats.sent')}
          value={loadingMyInterests ? '...' : stats.sentApplications}
          icon={Mail}
          variant="success"
        />
        <StatCard
          label={t('investor.stats.startups')}
          value={loadingBusinesses || loadingStartupInquiries ? '...' : stats.startupInquiries}
          icon={Inbox}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('investor.opportunities.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOpportunities ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">
                {t('investor.opportunities.loadError')}
              </p>
            ) : !opportunities || opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('investor.opportunities.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('investor.submitted.table.opportunity')}
                    </TableHead>
                    <TableHead>
                      {t('attractions.locationTitle')}
                    </TableHead>
                    <TableHead>
                      {t('types.opportunity')}
                    </TableHead>
                    <TableHead>
                      {t('investor.opportunities.table.interest')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opportunity) => (
                    <TableRow
                      key={opportunity.id}
                      className={selectedOpportunityId === opportunity.id ? 'bg-muted/40' : ''}
                      onClick={() => setSelectedOpportunityId(opportunity.id)}
                    >
                      <TableCell className="font-medium">
                        {pickLocalizedField(appLanguage, {
                          ar: opportunity.titleAr,
                          en: opportunity.titleEn,
                        })}
                      </TableCell>
                      <TableCell>{opportunity.area}</TableCell>
                      <TableCell>
                        {formatAmountWithCurrency(opportunity.minInvestment, appLanguage)} -{' '}
                        {formatAmountWithCurrency(opportunity.maxInvestment, appLanguage)}
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
            <CardTitle>
              {t('investor.inbox.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedOpportunity ? (
              <p className="text-sm text-muted-foreground">
                {t('investor.inbox.empty')}
              </p>
            ) : applicationsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : applicationsQuery.isError ? (
              <p className="text-sm text-destructive">
                {t('investor.inbox.loadError')}
              </p>
            ) : receivedApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('investor.inbox.noInquiries')}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="font-semibold text-foreground">
                    {pickLocalizedField(appLanguage, {
                      ar: selectedOpportunity.titleAr,
                      en: selectedOpportunity.titleEn,
                    })}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedOpportunity.area}
                  </p>
                </div>
                {receivedApplications.map((application) => (
                  <div
                    key={application.id}
                    className="rounded-xl border border-border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {application.contactEmail ? (
                        <LtrText as="span" className="font-semibold text-foreground">
                          {application.contactEmail}
                        </LtrText>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('investor.inbox.noEmail')}
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-3 py-1 text-xs">
                        {applicationStatusLabel(application.status, appLanguage)}
                      </span>
                    </div>
                    {application.contactPhone && (
                      <p className="text-sm text-muted-foreground">
                        {t('investor.inbox.phone')}{' '}
                        <LtrText>{application.contactPhone}</LtrText>
                      </p>
                    )}
                    {application.amountProposed != null && (
                      <p className="text-sm text-muted-foreground">
                        {t('investor.inbox.proposedAmount')}{' '}
                        {formatAmountWithCurrency(application.amountProposed, appLanguage)}
                      </p>
                    )}
                    {application.message && (
                      <p className="text-sm text-muted-foreground">{application.message}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {application.contactEmail && (
                        <Button asChild size="sm" variant="outline">
                          <a href={`mailto:${application.contactEmail}`}>
                            {t('investor.startupInbox.replyEmail')}
                          </a>
                        </Button>
                      )}
                      {application.contactPhone && (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`tel:${application.contactPhone}`}>
                            {t('investor.startupInbox.callDirect')}
                          </a>
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
          <CardTitle>
            {t('investor.startupInbox.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBusinesses || loadingStartupInquiries ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : (myBusinesses?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('investor.startupInbox.noBusinesses')}
            </p>
          ) : startupInquiriesError ? (
            <p className="text-sm text-destructive">
              {t('investor.startupInbox.loadError')}
            </p>
          ) : (startupInquiries?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('investor.startupInbox.empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {(startupInquiries?.data ?? []).map((inquiry) => (
                <div key={inquiry.id} className="space-y-2 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{inquiry.businessName}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('merchant.inbox.from')}{' '}
                        {inquiry.contactName}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs">
                      {inquiry.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{inquiry.message}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inquiry.contactEmail && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${inquiry.contactEmail}`}>
                          {t('investor.startupInbox.replyEmail')}
                        </a>
                      </Button>
                    )}
                    {inquiry.contactPhone && (
                      <Button asChild size="sm" variant="secondary">
                        <a href={`tel:${inquiry.contactPhone}`}>
                          {t('investor.startupInbox.callDirect')}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('investor.submitted.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMyInterests ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : myInterestsError ? (
            <p className="text-sm text-destructive">
              {t('investor.submitted.loadError')}
            </p>
          ) : (myInterests?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('investor.submitted.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('investor.submitted.table.opportunity')}
                  </TableHead>
                  <TableHead>
                    {t('startupDetails.status')}
                  </TableHead>
                  <TableHead>
                    {t('investor.submitted.table.amount')}
                  </TableHead>
                  <TableHead>
                    {t('driver.rides.detailsBtn')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(myInterests?.data ?? []).map((application) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {opportunityTitles.get(application.opportunityId) ??
                        application.opportunityId}
                    </TableCell>
                    <TableCell>{applicationStatusLabel(application.status, appLanguage)}</TableCell>
                    <TableCell>
                      {application.amountProposed != null
                        ? formatAmountWithCurrency(application.amountProposed, appLanguage)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/investment/opportunity/${application.opportunityId}`}
                        className="text-primary hover:underline"
                      >
                        {t('investor.submitted.viewBtn')}
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
