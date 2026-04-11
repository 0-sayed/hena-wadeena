import { AlertCircle, CheckCircle, Eye, FileText, ShoppingBag, Store, XCircle } from 'lucide-react';
import { useState } from 'react';
import { KycStatus } from '@hena-wadeena/types';

import { DocumentViewerDialog } from '@/components/admin/DocumentViewerDialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import {
  useAdminKyc,
  useAdminPendingBusinesses,
  useAdminPendingListings,
  useReviewKyc,
  useVerifyBusiness,
  useVerifyListing,
} from '@/hooks/use-admin';
import { districtLabel, listingCategoryLabel } from '@/lib/format';
import { useTranslation } from 'react-i18next';
import type { KycSubmission } from '@/services/api';
import type { AppLanguage } from '@/lib/localization';

const kycStatusConfig: Record<
  KycSubmission['status'],
  {
    labelKey: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  pending: {
    labelKey: 'moderation.kyc.status.pending',
    variant: 'secondary',
  },
  under_review: {
    labelKey: 'moderation.kyc.status.under_review',
    variant: 'outline',
    className: 'border-blue-500/40 text-blue-700 dark:text-blue-300',
  },
  approved: {
    labelKey: 'moderation.kyc.status.approved',
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-600',
  },
  rejected: {
    labelKey: 'moderation.kyc.status.rejected',
    variant: 'destructive',
  },
};

const kycFilterOptions: Array<{ value: 'all' | KycSubmission['status']; labelKey: string }> = [
  { value: 'all', labelKey: 'moderation.kyc.status.all' },
  { value: KycStatus.PENDING, labelKey: 'moderation.kyc.status.pending' },
  { value: KycStatus.UNDER_REVIEW, labelKey: 'moderation.kyc.status.under_review' },
  { value: KycStatus.APPROVED, labelKey: 'moderation.kyc.status.approved' },
  { value: KycStatus.REJECTED, labelKey: 'moderation.kyc.status.rejected' },
];

const documentTypeLabels: Record<string, string> = {
  national_id: 'moderation.kyc.doc.national_id',
  student_id: 'moderation.kyc.doc.student_id',
  guide_license: 'moderation.kyc.doc.guide_license',
  commercial_register: 'moderation.kyc.doc.commercial_register',
  business_document: 'moderation.kyc.doc.business_document',
};

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return Array.from({ length: 3 }).map((_, rowIndex) => (
    <TableRow key={rowIndex}>
      {Array.from({ length: cols }).map((_, colIndex) => (
        <TableCell key={colIndex}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function AdminModeration() {
  const { language } = useAuth();
  const { t } = useTranslation('admin');
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const currencyLabel = t('bookings.currency');

  const [activeTab, setActiveTab] = useState('kyc');
  const [kycStatusFilter, setKycStatusFilter] = useState<'all' | KycSubmission['status']>('all');
  const [viewDocument, setViewDocument] = useState<{
    url: string;
    type: string;
    name: string;
  } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    type: 'kyc' | 'listing' | 'business';
    id: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const kycQuery = useAdminKyc({
    status: kycStatusFilter !== 'all' ? kycStatusFilter : undefined,
  });
  const listingsQuery = useAdminPendingListings();
  const businessesQuery = useAdminPendingBusinesses();

  const reviewKyc = useReviewKyc();
  const verifyListing = useVerifyListing();
  const verifyBusiness = useVerifyBusiness();

  const formatDate = (value: string) => new Date(value).toLocaleDateString(locale);
  const badgeCountSide = appLanguage === 'en' ? 'ms-1' : 'me-1';

  const handleApprove = (type: 'kyc' | 'listing' | 'business', id: string) => {
    if (type === 'kyc') {
      reviewKyc.mutate({ id, status: 'approved' });
      return;
    }

    if (type === 'listing') {
      verifyListing.mutate({ id, approved: true });
      return;
    }

    verifyBusiness.mutate({ id, approved: true });
  };

  const handleReject = () => {
    if (!rejectDialog) {
      return;
    }

    const { type, id } = rejectDialog;
    const onSuccess = () => {
      setRejectDialog(null);
      setRejectReason('');
    };

    if (type === 'kyc') {
      reviewKyc.mutate({ id, status: 'rejected', notes: rejectReason }, { onSuccess });
      return;
    }

    if (type === 'listing') {
      verifyListing.mutate({ id, approved: false, notes: rejectReason }, { onSuccess });
      return;
    }

    verifyBusiness.mutate({ id, approved: false, reason: rejectReason }, { onSuccess });
  };

  const activeKycFilter = kycFilterOptions.find((option) => option.value === kycStatusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('moderation.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('moderation.subtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kyc" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('moderation.tabs.kyc')}
            {kycQuery.data && kycQuery.data.total > 0 && (
              <Badge variant="secondary" className={badgeCountSide}>
                {kycQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            {t('moderation.tabs.listings')}
            {listingsQuery.data && listingsQuery.data.total > 0 && (
              <Badge variant="secondary" className={badgeCountSide}>
                {listingsQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2">
            <Store className="h-4 w-4" />
            {t('moderation.tabs.businesses')}
            {businessesQuery.data && businessesQuery.data.total > 0 && (
              <Badge variant="secondary" className={badgeCountSide}>
                {businessesQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('moderation.kyc.title')}
              </CardTitle>
              <CardDescription>
                {t('moderation.kyc.desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {kycFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={kycStatusFilter === option.value ? 'default' : 'outline'}
                    onClick={() => setKycStatusFilter(option.value)}
                  >
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>
              {kycQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={t('moderation.errorLoad')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('moderation.kyc.table.name')}</TableHead>
                      <TableHead>{t('moderation.kyc.table.docType')}</TableHead>
                      <TableHead>{t('moderation.kyc.table.status')}</TableHead>
                      <TableHead>{t('moderation.kyc.table.submitted')}</TableHead>
                      <TableHead>{t('moderation.kyc.table.reviewed')}</TableHead>
                      <TableHead className="w-40">{t('moderation.kyc.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycQuery.isLoading ? (
                      <TableSkeleton cols={6} />
                    ) : kycQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState
                            icon={CheckCircle}
                            message={
                              kycStatusFilter === 'all'
                                ? t('moderation.kyc.noSubmissions')
                                : t('moderation.kyc.noSubmissionsStatus', { status: t(activeKycFilter?.labelKey ?? '') })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      kycQuery.data?.data.map((item) => {
                        const statusConfig = kycStatusConfig[item.status];
                        const documentType = item.documentType;
                        const documentTypeLabel = documentTypeLabels[documentType] ? t(documentTypeLabels[documentType]) : documentType;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.fullName}</TableCell>
                            <TableCell>{documentTypeLabel}</TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig.variant}
                                className={statusConfig.className}
                              >
                                {t(statusConfig.labelKey)}
                              </Badge>
                              {item.notes ? (
                                <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                              ) : null}
                            </TableCell>
                            <TableCell>{formatDate(item.submittedAt)}</TableCell>
                            <TableCell>
                              {item.reviewedAt ? (
                                <div className="space-y-1 text-sm">
                                  <p>
                                    {item.reviewedByName ?? t('moderation.kyc.reviewedBy')}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {formatDate(item.reviewedAt)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  {t('moderation.kyc.notReviewed')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-600 hover:text-blue-700"
                                  onClick={() =>
                                    setViewDocument({
                                      url: item.documentUrl,
                                      type: item.documentType,
                                      name: item.fullName,
                                    })
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  disabled={reviewKyc.isPending || item.status !== 'pending'}
                                  onClick={() => handleApprove('kyc', item.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={reviewKyc.isPending || item.status !== 'pending'}
                                  onClick={() => setRejectDialog({ type: 'kyc', id: item.id })}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>{t('moderation.listings.title')}</CardTitle>
              <CardDescription>{t('moderation.listings.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {listingsQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={t('moderation.errorLoad')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('moderation.listings.table.title')}</TableHead>
                      <TableHead>{t('moderation.listings.table.category')}</TableHead>
                      <TableHead>{t('moderation.listings.table.price')}</TableHead>
                      <TableHead>{t('moderation.listings.table.created')}</TableHead>
                      <TableHead className="w-32">{t('moderation.listings.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listingsQuery.isLoading ? (
                      <TableSkeleton cols={5} />
                    ) : listingsQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            icon={CheckCircle}
                            message={t('moderation.listings.noPending')}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      listingsQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                              {item.titleAr && item.titleEn ? (appLanguage === 'ar' ? item.titleAr : item.titleEn) : (item.titleAr || item.titleEn)}
                            </TableCell>
                          <TableCell>{listingCategoryLabel(item.category, appLanguage)}</TableCell>
                          <TableCell>
                            {(item.price / 100).toLocaleString(locale)} {currencyLabel}
                          </TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                disabled={verifyListing.isPending}
                                onClick={() => handleApprove('listing', item.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={verifyListing.isPending}
                                onClick={() => setRejectDialog({ type: 'listing', id: item.id })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="businesses">
          <Card>
            <CardHeader>
              <CardTitle>{t('moderation.businesses.title')}</CardTitle>
              <CardDescription>{t('moderation.businesses.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {businessesQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={t('moderation.errorLoad')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('moderation.businesses.table.name')}</TableHead>
                      <TableHead>{t('moderation.businesses.table.category')}</TableHead>
                      <TableHead>{t('moderation.businesses.table.district')}</TableHead>
                      <TableHead>{t('moderation.businesses.table.created')}</TableHead>
                      <TableHead className="w-32">{t('moderation.businesses.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessesQuery.isLoading ? (
                      <TableSkeleton cols={5} />
                    ) : businessesQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            icon={CheckCircle}
                            message={t('moderation.businesses.noPending')}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      businessesQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                              {item.nameAr && item.nameEn ? (appLanguage === 'ar' ? item.nameAr : item.nameEn) : (item.nameAr || item.nameEn)}
                            </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            {item.district ? districtLabel(item.district, appLanguage) : '-'}
                          </TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700"
                                disabled={verifyBusiness.isPending}
                                onClick={() => handleApprove('business', item.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={verifyBusiness.isPending}
                                onClick={() => setRejectDialog({ type: 'business', id: item.id })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentViewerDialog
        open={!!viewDocument}
        onOpenChange={(open) => {
          if (!open) {
            setViewDocument(null);
          }
        }}
        documentUrl={viewDocument?.url ?? null}
        documentType={viewDocument?.type ?? ''}
        userName={viewDocument?.name ?? ''}
      />

      <Dialog
        open={!!rejectDialog}
        onOpenChange={() => {
          setRejectDialog(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('moderation.reject.title')}</DialogTitle>
            <DialogDescription>
              {rejectDialog?.type === 'listing'
                ? t('moderation.reject.descListing')
                : t('moderation.reject.descOther')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('moderation.reject.placeholder')}
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
              {t('moderation.actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() && rejectDialog?.type !== 'listing'}
              onClick={handleReject}
            >
              {t('moderation.reject.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
