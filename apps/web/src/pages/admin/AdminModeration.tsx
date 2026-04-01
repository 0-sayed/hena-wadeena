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
import {
  useAdminKyc,
  useAdminPendingBusinesses,
  useAdminPendingListings,
  useReviewKyc,
  useVerifyBusiness,
  useVerifyListing,
} from '@/hooks/use-admin';
import type { KycSubmission } from '@/services/api';

const kycStatusConfig: Record<
  KycSubmission['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  pending: { label: 'معلق', variant: 'secondary' },
  under_review: {
    label: 'قيد المراجعة',
    variant: 'outline',
    className: 'border-blue-500/40 text-blue-700 dark:text-blue-300',
  },
  approved: {
    label: 'مقبول',
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-600',
  },
  rejected: { label: 'مرفوض', variant: 'destructive' },
};

const kycFilterOptions: Array<{ value: 'all' | KycSubmission['status']; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: KycStatus.PENDING, label: 'معلق' },
  { value: KycStatus.UNDER_REVIEW, label: 'قيد المراجعة' },
  { value: KycStatus.APPROVED, label: 'مقبول' },
  { value: KycStatus.REJECTED, label: 'مرفوض' },
];

const documentTypeLabels: Record<string, string> = {
  national_id: 'بطاقة الرقم القومي',
  student_id: 'بطاقة الطالب',
  guide_license: 'رخصة الإرشاد',
  commercial_register: 'السجل التجاري',
  business_document: 'مستند تجاري',
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
  return Array.from({ length: 3 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function AdminModeration() {
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

  const handleApprove = (type: 'kyc' | 'listing' | 'business', id: string) => {
    if (type === 'kyc') reviewKyc.mutate({ id, status: 'approved' });
    else if (type === 'listing') verifyListing.mutate({ id, approved: true });
    else if (type === 'business') verifyBusiness.mutate({ id, approved: true });
  };

  const handleReject = () => {
    if (!rejectDialog) return;
    const { type, id } = rejectDialog;
    const onSuccess = () => {
      setRejectDialog(null);
      setRejectReason('');
    };
    if (type === 'kyc')
      reviewKyc.mutate({ id, status: 'rejected', notes: rejectReason }, { onSuccess });
    else if (type === 'listing')
      verifyListing.mutate({ id, approved: false, notes: rejectReason }, { onSuccess });
    else if (type === 'business')
      verifyBusiness.mutate({ id, approved: false, reason: rejectReason }, { onSuccess });
  };

  const activeKycFilter = kycFilterOptions.find((option) => option.value === kycStatusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المراجعة والموافقات</h1>
        <p className="text-muted-foreground">مراجعة الطلبات المعلقة والموافقة عليها أو رفضها</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kyc" className="gap-2">
            <FileText className="h-4 w-4" />
            KYC
            {kycQuery.data && kycQuery.data.total > 0 && (
              <Badge variant="secondary" className="mr-1">
                {kycQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            الإعلانات
            {listingsQuery.data && listingsQuery.data.total > 0 && (
              <Badge variant="secondary" className="mr-1">
                {listingsQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2">
            <Store className="h-4 w-4" />
            الأنشطة التجارية
            {businessesQuery.data && businessesQuery.data.total > 0 && (
              <Badge variant="secondary" className="mr-1">
                {businessesQuery.data.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* KYC Tab */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>طلبات التحقق من الهوية</CardTitle>
              <CardDescription>جميع طلبات التحقق مع إمكانية التصفية حسب الحالة</CardDescription>
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
                    {option.label}
                  </Button>
                ))}
              </div>
              {kycQuery.error ? (
                <EmptyState icon={AlertCircle} message="فشل تحميل البيانات" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>نوع المستند</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ التقديم</TableHead>
                      <TableHead>آخر مراجعة</TableHead>
                      <TableHead className="w-40">الإجراءات</TableHead>
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
                                ? 'لا توجد طلبات تحقق حالياً'
                                : `لا توجد طلبات بحالة "${activeKycFilter?.label ?? ''}"`
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      kycQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.fullName}</TableCell>
                          <TableCell>
                            {documentTypeLabels[item.documentType] ?? item.documentType}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={kycStatusConfig[item.status].variant}
                              className={kycStatusConfig[item.status].className}
                            >
                              {kycStatusConfig[item.status].label}
                            </Badge>
                            {item.notes ? (
                              <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {new Date(item.submittedAt).toLocaleDateString('ar-EG')}
                          </TableCell>
                          <TableCell>
                            {item.reviewedAt ? (
                              <div className="space-y-1 text-sm">
                                <p>{item.reviewedByName ?? 'تمت المراجعة'}</p>
                                <p className="text-muted-foreground">
                                  {new Date(item.reviewedAt).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">لم تُراجع بعد</span>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>الإعلانات المعلقة</CardTitle>
              <CardDescription>إعلانات تحتاج موافقة</CardDescription>
            </CardHeader>
            <CardContent>
              {listingsQuery.error ? (
                <EmptyState icon={AlertCircle} message="فشل تحميل البيانات" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العنوان</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead className="w-32">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listingsQuery.isLoading ? (
                      <TableSkeleton cols={5} />
                    ) : listingsQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState icon={CheckCircle} message="لا توجد إعلانات معلقة" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      listingsQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.titleAr}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{(item.price / 100).toLocaleString('ar-EG')} ج.م</TableCell>
                          <TableCell>
                            {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                          </TableCell>
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

        {/* Businesses Tab */}
        <TabsContent value="businesses">
          <Card>
            <CardHeader>
              <CardTitle>الأنشطة التجارية المعلقة</CardTitle>
              <CardDescription>أنشطة تجارية تحتاج موافقة</CardDescription>
            </CardHeader>
            <CardContent>
              {businessesQuery.error ? (
                <EmptyState icon={AlertCircle} message="فشل تحميل البيانات" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>المنطقة</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead className="w-32">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessesQuery.isLoading ? (
                      <TableSkeleton cols={5} />
                    ) : businessesQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState icon={CheckCircle} message="لا توجد أنشطة معلقة" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      businessesQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.nameAr}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.district || '-'}</TableCell>
                          <TableCell>
                            {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                          </TableCell>
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

      {/* Document Viewer Dialog */}
      <DocumentViewerDialog
        open={!!viewDocument}
        onOpenChange={(open) => !open && setViewDocument(null)}
        documentUrl={viewDocument?.url ?? null}
        documentType={viewDocument?.type ?? ''}
        userName={viewDocument?.name ?? ''}
      />

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={() => {
          setRejectDialog(null);
          setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الرفض</DialogTitle>
            <DialogDescription>
              {rejectDialog?.type === 'listing'
                ? 'يرجى إدخال سبب الرفض (اختياري)'
                : 'يرجى إدخال سبب الرفض (مطلوب)'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="سبب الرفض..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason('');
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() && rejectDialog?.type !== 'listing'}
              onClick={handleReject}
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
