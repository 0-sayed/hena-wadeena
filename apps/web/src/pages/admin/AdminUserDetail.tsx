import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Copy,
  KeyRound,
  Mail,
  Phone,
  Shield,
  User,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminUser, useResetUserPassword } from '@/hooks/use-admin';

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  moderator: 'مشرف',
  reviewer: 'مراجع',
  tourist: 'سائح',
  resident: 'مقيم',
  student: 'طالب',
  merchant: 'تاجر',
  driver: 'سائق',
  guide: 'مرشد',
  investor: 'مستثمر',
};

const statusLabels: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  banned: 'محظور',
};

const kycLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  under_review: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const auditLabels: Record<string, string> = {
  register: 'تسجيل حساب',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  failed_login: 'محاولة دخول فاشلة',
  password_changed: 'تغيير كلمة المرور',
  password_reset: 'إعادة تعيين كلمة المرور',
  token_refreshed: 'تحديث الجلسة',
  account_suspended: 'إيقاف الحساب',
  account_banned: 'حظر الحساب',
  role_changed: 'تغيير الدور',
  account_activated: 'إعادة تفعيل الحساب',
  account_deleted: 'حذف الحساب',
  kyc_submitted: 'إرسال مستندات التحقق',
  kyc_approved: 'اعتماد التحقق',
  kyc_rejected: 'رفض التحقق',
};

function formatDateTime(value: string | null) {
  if (!value) {
    return 'غير متاح';
  }

  return new Date(value).toLocaleString('ar-EG');
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, error } = useAdminUser(id);
  const resetPasswordMutation = useResetUserPassword();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const handleResetPassword = async () => {
    if (!id) {
      return;
    }

    try {
      const result = await resetPasswordMutation.mutateAsync(id);
      setGeneratedPassword(result.password);
      setPasswordDialogOpen(true);
      setConfirmOpen(false);
    } catch {
      // handled in mutation toast
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success('تم نسخ كلمة المرور الجديدة');
    } catch {
      toast.error('تعذر نسخ كلمة المرور');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            void navigate('/admin/users');
          }}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى المستخدمين
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            تعذر تحميل تفاصيل المستخدم المطلوبة.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="px-0"
            onClick={() => {
              void navigate('/admin/users');
            }}
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة إلى المستخدمين
          </Button>
          <h1 className="text-2xl font-bold">الملف الإداري للمستخدم</h1>
          <p className="text-muted-foreground">
            عرض حالة الحساب، التحقق، وسجل النشاط مع إمكانية إعادة تعيين كلمة المرور.
          </p>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <KeyRound className="ml-2 h-4 w-4" />
          إعادة تعيين كلمة المرور
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
              <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{user.fullName}</h2>
                <Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                  {statusLabels[user.status] || user.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.displayName && (
                <p className="text-sm text-muted-foreground">
                  الاسم الظاهر: {user.displayName}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>تم إنشاء الحساب: {formatDateTime(user.createdAt)}</p>
            <p>آخر تحديث: {formatDateTime(user.updatedAt)}</p>
            <p>آخر تسجيل دخول: {formatDateTime(user.lastLoginAt)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>بيانات الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">الهاتف</p>
                <p className="font-medium text-foreground">{user.phone ?? 'غير متاح'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">الدور الحالي</p>
                <p className="font-medium text-foreground">
                  {roleLabels[user.role] || user.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <UserCog className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">اللغة</p>
                <p className="font-medium text-foreground">
                  {user.language === 'en' ? 'English' : 'العربية'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>التحقق والحالة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">حالة الحساب</p>
              <p className="font-medium text-foreground">
                {statusLabels[user.status] || user.status}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">حالة KYC</p>
              <p className="font-medium text-foreground">
                {user.kycStatus
                  ? kycLabels[user.kycStatus] || user.kycStatus
                  : 'لا يوجد طلب تحقق'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">نوع آخر مستند</p>
              <p className="font-medium text-foreground">
                {user.latestKycDocumentType ?? 'غير متاح'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">تم التحقق من الحساب</p>
              <p className="font-medium text-foreground">
                {user.verifiedAt ? formatDateTime(user.verifiedAt) : 'لم يتم التحقق بعد'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">آخر إرسال KYC</p>
              <p className="font-medium text-foreground">
                {formatDateTime(user.kycSubmittedAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">آخر مراجعة KYC</p>
              <p className="font-medium text-foreground">
                {formatDateTime(user.kycReviewedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>ملخص النشاط</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.recentAuditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أحداث مسجلة لهذا الحساب حتى الآن.
              </p>
            ) : (
              user.recentAuditEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border/60 p-4 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">
                      {auditLabels[event.eventType] || event.eventType}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إعادة تعيين كلمة المرور</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إنشاء كلمة مرور عشوائية جديدة لهذا المستخدم وإلغاء جلساته الحالية. اعرض
              كلمة المرور الجديدة مرة واحدة فقط وشاركها معه بشكل آمن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleResetPassword();
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? 'جارٍ التنفيذ...'
                : 'تأكيد إعادة التعيين'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setGeneratedPassword('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تم إنشاء كلمة مرور جديدة</DialogTitle>
            <DialogDescription>
              هذه الكلمة ستُعرض مرة واحدة فقط. يرجى نسخها ومشاركتها مع المستخدم عبر قناة آمنة.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-sm text-muted-foreground">كلمة المرور المؤقتة</p>
            <code className="block break-all rounded-lg bg-background px-3 py-3 text-base font-semibold">
              {generatedPassword}
            </code>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void handleCopyPassword();
              }}
            >
              <Copy className="ml-2 h-4 w-4" />
              نسخ كلمة المرور
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
