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
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import type { KycSubmission } from '@/services/api';

type LocalizedLabel = {
  ar: string;
  en: string;
};

const kycStatusConfig: Record<
  KycSubmission['status'],
  {
    label: LocalizedLabel;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  pending: {
    label: { ar: 'معلق', en: 'Pending' },
    variant: 'secondary',
  },
  under_review: {
    label: { ar: 'قيد المراجعة', en: 'Under review' },
    variant: 'outline',
    className: 'border-blue-500/40 text-blue-700 dark:text-blue-300',
  },
  approved: {
    label: { ar: 'مقبول', en: 'Approved' },
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-600',
  },
  rejected: {
    label: { ar: 'مرفوض', en: 'Rejected' },
    variant: 'destructive',
  },
};

const kycFilterOptions: Array<{ value: 'all' | KycSubmission['status']; label: LocalizedLabel }> = [
  { value: 'all', label: { ar: 'الكل', en: 'All' } },
  { value: KycStatus.PENDING, label: { ar: 'معلق', en: 'Pending' } },
  { value: KycStatus.UNDER_REVIEW, label: { ar: 'قيد المراجعة', en: 'Under review' } },
  { value: KycStatus.APPROVED, label: { ar: 'مقبول', en: 'Approved' } },
  { value: KycStatus.REJECTED, label: { ar: 'مرفوض', en: 'Rejected' } },
];

const documentTypeLabels: Record<string, LocalizedLabel> = {
  national_id: { ar: 'بطاقة الرقم القومي', en: 'National ID' },
  student_id: { ar: 'بطاقة الطالب', en: 'Student ID' },
  guide_license: { ar: 'رخصة الإرشاد', en: 'Guide license' },
  commercial_register: { ar: 'السجل التجاري', en: 'Commercial register' },
  business_document: { ar: 'مستند تجاري', en: 'Business document' },
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
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';
  const currencyLabel = pickLocalizedCopy(appLanguage, { ar: 'ج.م', en: 'EGP' });

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
          {pickLocalizedCopy(appLanguage, {
            ar: 'المراجعة والموافقات',
            en: 'Moderation and approvals',
          })}
        </h1>
        <p className="text-muted-foreground">
          {pickLocalizedCopy(appLanguage, {
            ar: 'مراجعة الطلبات المعلقة والموافقة عليها أو رفضها',
            en: 'Review pending requests and approve or reject them',
          })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kyc" className="gap-2">
            <FileText className="h-4 w-4" />
            KYC
            {kycQuery.data && kycQuery.data.total > 0 && (
              <Badge variant="secondary" className={badgeCountSide}>
                {kycQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'الإعلانات', en: 'Listings' })}
            {listingsQuery.data && listingsQuery.data.total > 0 && (
              <Badge variant="secondary" className={badgeCountSide}>
                {listingsQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2">
            <Store className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'الأنشطة التجارية', en: 'Businesses' })}
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
                {pickLocalizedCopy(appLanguage, {
                  ar: 'طلبات التحقق من الهوية',
                  en: 'KYC submissions',
                })}
              </CardTitle>
              <CardDescription>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'جميع طلبات التحقق مع إمكانية التصفية حسب الحالة',
                  en: 'All identity-verification submissions with status-based filtering',
                })}
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
                    {pickLocalizedCopy(appLanguage, option.label)}
                  </Button>
                ))}
              </div>
              {kycQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={pickLocalizedCopy(appLanguage, {
                    ar: 'فشل تحميل البيانات',
                    en: 'Failed to load data',
                  })}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الاسم', en: 'Name' })}</TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'نوع المستند',
                          en: 'Document type',
                        })}
                      </TableHead>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الحالة', en: 'Status' })}</TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تاريخ التقديم',
                          en: 'Submitted on',
                        })}
                      </TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'آخر مراجعة',
                          en: 'Last review',
                        })}
                      </TableHead>
                      <TableHead className="w-40">
                        {pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}
                      </TableHead>
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
                                ? pickLocalizedCopy(appLanguage, {
                                    ar: 'لا توجد طلبات تحقق حاليًا',
                                    en: 'No KYC submissions right now',
                                  })
                                : pickLocalizedCopy(appLanguage, {
                                    ar: `لا توجد طلبات بحالة "${pickLocalizedCopy(appLanguage, activeKycFilter?.label ?? { ar: '', en: '' })}"`,
                                    en: `No submissions with status "${pickLocalizedCopy(appLanguage, activeKycFilter?.label ?? { ar: '', en: '' })}"`,
                                  })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      kycQuery.data?.data.map((item) => {
                        const statusConfig = kycStatusConfig[item.status];
                        const documentType = documentTypeLabels[item.documentType] ?? {
                          ar: item.documentType,
                          en: item.documentType,
                        };

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.fullName}</TableCell>
                            <TableCell>{pickLocalizedCopy(appLanguage, documentType)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={statusConfig.variant}
                                className={statusConfig.className}
                              >
                                {pickLocalizedCopy(appLanguage, statusConfig.label)}
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
                                    {item.reviewedByName ??
                                      pickLocalizedCopy(appLanguage, {
                                        ar: 'تمت المراجعة',
                                        en: 'Reviewed',
                                      })}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {formatDate(item.reviewedAt)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  {pickLocalizedCopy(appLanguage, {
                                    ar: 'لم تُراجع بعد',
                                    en: 'Not reviewed yet',
                                  })}
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
              <CardTitle>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'الإعلانات المعلقة',
                  en: 'Pending listings',
                })}
              </CardTitle>
              <CardDescription>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'إعلانات تحتاج موافقة',
                  en: 'Listings awaiting approval',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listingsQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={pickLocalizedCopy(appLanguage, {
                    ar: 'فشل تحميل البيانات',
                    en: 'Failed to load data',
                  })}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'العنوان', en: 'Title' })}</TableHead>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الفئة', en: 'Category' })}</TableHead>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'السعر', en: 'Price' })}</TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تاريخ الإنشاء',
                          en: 'Created on',
                        })}
                      </TableHead>
                      <TableHead className="w-32">
                        {pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}
                      </TableHead>
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
                            message={pickLocalizedCopy(appLanguage, {
                              ar: 'لا توجد إعلانات معلقة',
                              en: 'No pending listings',
                            })}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      listingsQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {pickLocalizedField(appLanguage, {
                              ar: item.titleAr,
                              en: item.titleEn,
                            })}
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
              <CardTitle>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'الأنشطة التجارية المعلقة',
                  en: 'Pending businesses',
                })}
              </CardTitle>
              <CardDescription>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'أنشطة تجارية تحتاج موافقة',
                  en: 'Business entries awaiting approval',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {businessesQuery.error ? (
                <EmptyState
                  icon={AlertCircle}
                  message={pickLocalizedCopy(appLanguage, {
                    ar: 'فشل تحميل البيانات',
                    en: 'Failed to load data',
                  })}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الاسم', en: 'Name' })}</TableHead>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'الفئة', en: 'Category' })}</TableHead>
                      <TableHead>{pickLocalizedCopy(appLanguage, { ar: 'المنطقة', en: 'District' })}</TableHead>
                      <TableHead>
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'تاريخ الإنشاء',
                          en: 'Created on',
                        })}
                      </TableHead>
                      <TableHead className="w-32">
                        {pickLocalizedCopy(appLanguage, { ar: 'الإجراءات', en: 'Actions' })}
                      </TableHead>
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
                            message={pickLocalizedCopy(appLanguage, {
                              ar: 'لا توجد أنشطة معلقة',
                              en: 'No pending businesses',
                            })}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      businessesQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {pickLocalizedField(appLanguage, {
                              ar: item.nameAr,
                              en: item.nameEn,
                            })}
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
            <DialogTitle>
              {pickLocalizedCopy(appLanguage, {
                ar: 'تأكيد الرفض',
                en: 'Confirm rejection',
              })}
            </DialogTitle>
            <DialogDescription>
              {rejectDialog?.type === 'listing'
                ? pickLocalizedCopy(appLanguage, {
                    ar: 'يرجى إدخال سبب الرفض (اختياري)',
                    en: 'Add a rejection reason (optional)',
                  })
                : pickLocalizedCopy(appLanguage, {
                    ar: 'يرجى إدخال سبب الرفض (مطلوب)',
                    en: 'Add a rejection reason (required)',
                  })}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={pickLocalizedCopy(appLanguage, {
              ar: 'سبب الرفض...',
              en: 'Rejection reason...',
            })}
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
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() && rejectDialog?.type !== 'listing'}
              onClick={handleReject}
            >
              {pickLocalizedCopy(appLanguage, {
                ar: 'تأكيد الرفض',
                en: 'Confirm rejection',
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
