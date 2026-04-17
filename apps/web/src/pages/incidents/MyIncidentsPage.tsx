import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Plus } from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useMyIncidents } from '@/hooks/use-incidents';
import { STATUS_VARIANT, TYPE_LABELS, statusLabel } from '@/lib/incidents';
import { pickLocalizedCopy } from '@/lib/localization';
import type { EnvironmentalIncident } from '@/services/api';

function IncidentCard({
  incident,
  language,
}: {
  incident: EnvironmentalIncident;
  language: 'ar' | 'en';
}) {
  const description = language === 'en' ? incident.descriptionEn : incident.descriptionAr;
  const date = new Date(incident.createdAt).toLocaleDateString(
    language === 'en' ? 'en-US' : 'ar-EG',
  );

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <p className="font-medium">{TYPE_LABELS[incident.incidentType][language]}</p>
            {description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <Badge variant={STATUS_VARIANT[incident.status]}>
            {statusLabel(incident.status, language)}
          </Badge>
        </div>
        {incident.photos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {incident.photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
              />
            ))}
          </div>
        )}
        {incident.adminNotes ? (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {pickLocalizedCopy(language, { ar: 'ملاحظة الإدارة: ', en: 'Admin note: ' })}
            {incident.adminNotes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function MyIncidentsPage() {
  const { language: appLanguage } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyIncidents({ page, limit: 10 });

  const incidents = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <Layout
      title={pickLocalizedCopy(appLanguage, { ar: 'بلاغاتي البيئية', en: 'My Incident Reports' })}
    >
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'بلاغاتي البيئية',
                  en: 'My Incident Reports',
                })}
              </h1>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: `${total} بلاغ`,
                    en: `${total} report${total !== 1 ? 's' : ''}`,
                  })}
                </p>
              )}
            </div>
            <Button asChild size="sm" className="gap-2">
              <Link to="/incidents/report">
                <Plus className="h-4 w-4" />
                {pickLocalizedCopy(appLanguage, { ar: 'بلاغ جديد', en: 'New Report' })}
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'لا توجد بلاغات حتى الآن',
                    en: 'No incident reports yet',
                  })}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/incidents/report">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'أضف أول بلاغ',
                      en: 'Submit your first report',
                    })}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} language={appLanguage} />
              ))}

              {(page > 1 || hasMore) && (
                <div className="flex justify-center gap-3 pt-2">
                  {page > 1 && (
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)}>
                      {pickLocalizedCopy(appLanguage, { ar: 'السابق', en: 'Previous' })}
                    </Button>
                  )}
                  {hasMore && (
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                      {pickLocalizedCopy(appLanguage, { ar: 'التالي', en: 'Next' })}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
