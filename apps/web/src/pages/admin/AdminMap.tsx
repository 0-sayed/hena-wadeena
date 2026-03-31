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

const categoryLabels: Record<string, string> = {
  historical: 'تاريخي',
  natural: 'طبيعي',
  religious: 'ديني',
  recreational: 'ترفيهي',
  accommodation: 'إقامة',
  restaurant: 'مطعم',
  service: 'خدمات',
  government: 'حكومي',
};

export default function AdminMap() {
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedPoi, setExpandedPoi] = useState<string | null>(null);

  const poisQuery = useAdminPendingPois();
  const approvePoi = useApprovePoi();
  const rejectPoi = useRejectPoi();

  const handleReject = () => {
    if (!rejectDialog) return;
    rejectPoi.mutate({ id: rejectDialog, reason: rejectReason || undefined });
    setRejectDialog(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة نقاط الاهتمام</h1>
        <p className="text-muted-foreground">مراجعة نقاط الاهتمام المقترحة من المستخدمين</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>نقاط الاهتمام المعلقة</CardTitle>
          <CardDescription>
            {poisQuery.data ? `${poisQuery.data.total} نقطة تنتظر المراجعة` : 'جاري التحميل...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poisQuery.error ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">فشل تحميل البيانات</p>
            </div>
          ) : poisQuery.data?.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-muted-foreground">لا توجد نقاط معلقة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                  <TableHead className="w-32">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              {poisQuery.isLoading ? (
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  {poisQuery.data?.data.map((poi) => (
                    <Fragment key={poi.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpandedPoi(expandedPoi === poi.id ? null : poi.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{poi.nameAr}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {categoryLabels[poi.category] ?? poi.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {poi.location
                            ? `${poi.location.y.toFixed(4)}, ${poi.location.x.toFixed(4)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(poi.createdAt).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700"
                              disabled={approvePoi.isPending}
                              onClick={() => approvePoi.mutate(poi.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={rejectPoi.isPending}
                              onClick={() => setRejectDialog(poi.id)}
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
                                  <strong>الاسم بالإنجليزية:</strong> {poi.nameEn}
                                </p>
                              )}
                              {poi.description && (
                                <p>
                                  <strong>الوصف:</strong> {poi.description}
                                </p>
                              )}
                              {poi.address && (
                                <p>
                                  <strong>العنوان:</strong> {poi.address}
                                </p>
                              )}
                              {poi.phone && (
                                <p>
                                  <strong>الهاتف:</strong> {poi.phone}
                                </p>
                              )}
                              {poi.website && (
                                <p>
                                  <strong>الموقع:</strong>{' '}
                                  <a
                                    href={poi.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                  >
                                    {poi.website}
                                  </a>
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض نقطة الاهتمام</DialogTitle>
            <DialogDescription>يرجى إدخال سبب الرفض (اختياري)</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="سبب الرفض..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
