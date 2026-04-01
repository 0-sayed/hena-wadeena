import { AlertCircle, CheckCircle, Eye, FileText, ShoppingBag, Store, XCircle } from 'lucide-react';
import { useState } from 'react';

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

  const kycQuery = useAdminKyc({ status: 'pending' });
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
              <CardDescription>مستندات تحتاج مراجعة</CardDescription>
            </CardHeader>
            <CardContent>
              {kycQuery.error ? (
                <EmptyState icon={AlertCircle} message="فشل تحميل البيانات" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>نوع المستند</TableHead>
                      <TableHead>تاريخ التقديم</TableHead>
                      <TableHead className="w-32">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kycQuery.isLoading ? (
                      <TableSkeleton cols={4} />
                    ) : kycQuery.data?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <EmptyState icon={CheckCircle} message="لا توجد طلبات معلقة" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      kycQuery.data?.data.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.fullName}</TableCell>
                          <TableCell>{item.documentType}</TableCell>
                          <TableCell>
                            {new Date(item.submittedAt).toLocaleDateString('ar-EG')}
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
                                disabled={reviewKyc.isPending}
                                onClick={() => handleApprove('kyc', item.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                disabled={reviewKyc.isPending}
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
