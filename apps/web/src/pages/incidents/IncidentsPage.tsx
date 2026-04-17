import { useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, PlusCircle } from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { usePublicIncidents } from '@/hooks/use-incidents';
import { pickLocalizedCopy } from '@/lib/localization';
import {
  statusLabel,
  typeLabel,
  STATUS_VARIANT,
  TYPE_LABELS,
  STATUS_LABELS,
} from '@/lib/incidents';
import type { IncidentStatus, IncidentType } from '@/services/api';

const STATUS_COLOR: Record<IncidentStatus, string> = {
  reported: '#ef4444',
  under_review: '#f59e0b',
  resolved: '#22c55e',
  dismissed: '#6b7280',
};

export default function IncidentsPage() {
  const { language } = useAuth();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all');

  const { data, isLoading } = usePublicIncidents({
    limit: 100,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    incidentType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const incidents = data?.data ?? [];

  const mapLocations = incidents.map((inc) => ({
    id: inc.id,
    name: typeLabel(inc.incidentType, language),
    lat: inc.location.y,
    lng: inc.location.x,
    color: STATUS_COLOR[inc.status],
    description: statusLabel(inc.status, language),
    type: new Date(inc.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB'),
    image: inc.photos?.[0],
  }));

  return (
    <Layout
      title={pickLocalizedCopy(language, {
        ar: 'الحوادث البيئية',
        en: 'Environmental Incidents',
      })}
    >
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {pickLocalizedCopy(language, {
                    ar: 'الحوادث البيئية',
                    en: 'Environmental Incidents',
                  })}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {pickLocalizedCopy(language, {
                    ar: 'الحوادث المُبلَّغ عنها في الصحراء البيضاء',
                    en: 'Reported incidents in the White Desert',
                  })}
                </p>
              </div>
            </div>
            <Link to="/incidents/report">
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                {pickLocalizedCopy(language, { ar: 'الإبلاغ عن حادثة', en: 'Report Incident' })}
              </Button>
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as IncidentStatus | 'all')}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(language, { ar: 'كل الحالات', en: 'All statuses' })}
                </SelectItem>
                {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as IncidentType | 'all')}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(language, { ar: 'كل الأنواع', en: 'All types' })}
                </SelectItem>
                {(Object.keys(TYPE_LABELS) as IncidentType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabel(t, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {incidents.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-xl border">
              <InteractiveMap
                locations={mapLocations}
                center={[27.3, 28.1]}
                zoom={10}
                className="h-[28rem] w-full"
                fitBounds={incidents.length > 1}
                showGoogleMapsButton={false}
              />
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 opacity-30" />
              <p>
                {pickLocalizedCopy(language, {
                  ar: 'لا توجد حوادث مطابقة للفلتر المحدد',
                  en: 'No incidents match the selected filters',
                })}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {incidents.map((inc) => (
                <Card key={inc.id} className="border-border/50">
                  <CardContent className="p-4">
                    {inc.photos && inc.photos.length > 0 && (
                      <img
                        src={inc.photos[0]}
                        alt=""
                        className="mb-3 h-32 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{typeLabel(inc.incidentType, language)}</Badge>
                      <Badge variant={STATUS_VARIANT[inc.status]}>
                        {statusLabel(inc.status, language)}
                      </Badge>
                    </div>
                    {inc.descriptionAr && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground" dir="rtl">
                        {inc.descriptionAr}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(inc.createdAt).toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-GB',
                        { year: 'numeric', month: 'short', day: 'numeric' },
                      )}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
