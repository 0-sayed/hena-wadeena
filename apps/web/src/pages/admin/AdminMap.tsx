import { AlertCircle, CheckCircle, MapPin, XCircle } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminPendingPois, useApprovePoi, useRejectPoi } from '@/hooks/use-admin';
import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import { useTranslation } from 'react-i18next';

type LocalizedLabel = {
  ar: string;
  en: string;
};

const categoryLabels: Record<string, LocalizedLabel> = {
  historical: { ar: 'تاريخي', en: 'Historical' },
  natural: { ar: 'طبيعي', en: 'Natural' },
  religious: { ar: 'ديني', en: 'Religious' },
  recreational: { ar: 'ترفيهي', en: 'Recreational' },
  accommodation: { ar: 'إقامة', en: 'Accommodation' },
  restaurant: { ar: 'مطعم', en: 'Restaurant' },
  service: { ar: 'خدمات', en: 'Service' },
  government: { ar: 'حكومي', en: 'Government' },
};

function pendingCountLabel(total: number, language: AppLanguage) {
  if (language === 'en') {
    return `${total} ${total === 1 ? 'point' : 'points'} awaiting review`;
  }

  return `${total} نقطة تنتظر المراجعة`;
}

export default function AdminMap() {
  const {
    t
  } = useTranslation(['admin', 'dashboard', 'market', 'marketplace', 'tourism', 'guides', 'wallet']);

  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedPoi, setExpandedPoi] = useState<string | null>(null);

  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';

  const poisQuery = useAdminPendingPois();
  const approvePoi = useApprovePoi();
  const rejectPoi = useRejectPoi();

  const handleReject = () => {
    if (!rejectDialog) {
      return;
    }

    rejectPoi.mutate(
      { id: rejectDialog, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setRejectDialog(null);
          setRejectReason('');
        },
      },
    );
  };

  const localizedCategory = (category: string) =>
    pickLocalizedCopy(appLanguage, categoryLabels[category] ?? { ar: category, en: category });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('pois.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('pois.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('pois.pendingTitle')}
          </CardTitle>
          <CardDescription>
            {poisQuery.data
              ? pendingCountLabel(poisQuery.data.total, appLanguage)
              : t('driver.rides.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poisQuery.error ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">
                {t('pois.loadError')}
              </p>
            </div>
          ) : poisQuery.data?.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-muted-foreground">
                {t('pois.noPending')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('listingEditor.nameLabel')}</TableHead>
                  <TableHead>{t('prices.table.category')}</TableHead>
                  <TableHead>{t('attractions.locationTitle')}</TableHead>
                  <TableHead>{t('pois.table.dateAdded')}</TableHead>
                  <TableHead className="w-32">
                    {t('dashboard.packagesList.colActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              {poisQuery.isLoading ? (
                <TableBody>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  {poisQuery.data?.data.map((poi) => {
                    const poiName =
                      pickLocalizedField(appLanguage, { ar: poi.nameAr, en: poi.nameEn }) || poi.nameAr;

                    return (
                      <Fragment key={poi.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setExpandedPoi(expandedPoi === poi.id ? null : poi.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{poiName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{localizedCategory(poi.category)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {poi.location
                              ? `${poi.location.y.toFixed(4)}, ${poi.location.x.toFixed(4)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(poi.createdAt).toLocaleDateString(locale)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                disabled={approvePoi.isPending}
                                onClick={() => approvePoi.mutate(poi.id)}
                                title={t('pois.approve')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={rejectPoi.isPending}
                                onClick={() => setRejectDialog(poi.id)}
                                title={t('bookings.actions.reject')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedPoi === poi.id && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/50">
                              <div className="space-y-2 p-2">
                                {poi.nameEn && (
                                  <p>
                                    <strong>
                                      {t('pois.nameEn')}
                                    </strong>{' '}
                                    {poi.nameEn}
                                  </p>
                                )}
                                {poi.description && (
                                  <p>
                                    <strong>
                                      {t('pois.description')}
                                    </strong>{' '}
                                    {poi.description}
                                  </p>
                                )}
                                {poi.address && (
                                  <p>
                                    <strong>
                                      {t('pois.address')}
                                    </strong>{' '}
                                    {poi.address}
                                  </p>
                                )}
                                {poi.phone && (
                                  <p>
                                    <strong>
                                      {t('investor.inbox.phone')}
                                    </strong>{' '}
                                    <LtrText>{poi.phone}</LtrText>
                                  </p>
                                )}
                                {poi.website && (
                                  <p>
                                    <strong>
                                      {t('pois.website')}
                                    </strong>{' '}
                                    <a
                                      href={poi.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline"
                                    >
                                      <LtrText>{poi.website}</LtrText>
                                    </a>
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!rejectDialog}
        onOpenChange={() => {
          setRejectDialog(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('pois.rejectTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('pois.rejectDesc')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('pois.rejectPlaceholder')}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason('');
              }}
            >
              {t('topup.cancelBtn')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t('pois.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
