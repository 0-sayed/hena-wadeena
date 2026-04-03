import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Copy, KeyRound, Mail, Phone, Shield, User, UserCog } from 'lucide-react';
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
import { LtrText } from '@/components/ui/ltr-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useAdminUser, useResetUserPassword } from '@/hooks/use-admin';
import { pickLocalizedCopy, type AppLanguage } from '@/lib/localization';

type LocalizedLabel = {
  ar: string;
  en: string;
};

const roleLabels: Record<string, LocalizedLabel> = {
  admin: { ar: 'مدير', en: 'Admin' },
  moderator: { ar: 'مشرف', en: 'Moderator' },
  reviewer: { ar: 'مراجع', en: 'Reviewer' },
  tourist: { ar: 'سائح', en: 'Tourist' },
  resident: { ar: 'مقيم', en: 'Resident' },
  student: { ar: 'طالب', en: 'Student' },
  merchant: { ar: 'تاجر', en: 'Merchant' },
  driver: { ar: 'سائق', en: 'Driver' },
  guide: { ar: 'مرشد', en: 'Guide' },
  investor: { ar: 'مستثمر', en: 'Investor' },
};

const statusLabels: Record<string, LocalizedLabel> = {
  active: { ar: 'نشط', en: 'Active' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  banned: { ar: 'محظور', en: 'Banned' },
};

const kycLabels: Record<string, LocalizedLabel> = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  under_review: { ar: 'قيد المراجعة', en: 'Under review' },
  approved: { ar: 'معتمد', en: 'Approved' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
};

const auditLabels: Record<string, LocalizedLabel> = {
  register: { ar: 'تسجيل حساب', en: 'Account registration' },
  login: { ar: 'تسجيل دخول', en: 'Login' },
  logout: { ar: 'تسجيل خروج', en: 'Logout' },
  failed_login: { ar: 'محاولة دخول فاشلة', en: 'Failed login attempt' },
  password_changed: { ar: 'تغيير كلمة المرور', en: 'Password changed' },
  password_reset: { ar: 'إعادة تعيين كلمة المرور', en: 'Password reset' },
  token_refreshed: { ar: 'تحديث الجلسة', en: 'Session refreshed' },
  account_suspended: { ar: 'إيقاف الحساب', en: 'Account suspended' },
  account_banned: { ar: 'حظر الحساب', en: 'Account banned' },
  role_changed: { ar: 'تغيير الدور', en: 'Role changed' },
  account_activated: { ar: 'إعادة تفعيل الحساب', en: 'Account reactivated' },
  account_deleted: { ar: 'حذف الحساب', en: 'Account deleted' },
  kyc_submitted: { ar: 'إرسال مستندات التحقق', en: 'KYC submitted' },
  kyc_approved: { ar: 'اعتماد التحقق', en: 'KYC approved' },
  kyc_rejected: { ar: 'رفض التحقق', en: 'KYC rejected' },
};

const documentTypeLabels: Record<string, LocalizedLabel> = {
  national_id: { ar: 'بطاقة الرقم القومي', en: 'National ID' },
  student_id: { ar: 'بطاقة الطالب', en: 'Student ID' },
  guide_license: { ar: 'رخصة الإرشاد', en: 'Guide license' },
  commercial_register: { ar: 'السجل التجاري', en: 'Commercial register' },
  business_document: { ar: 'مستند تجاري', en: 'Business document' },
};

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
  const { language } = useAuth();
  const appLanguage: AppLanguage = language === 'en' ? 'en' : 'ar';
  const locale = appLanguage === 'en' ? 'en-US' : 'ar-EG';

  const { data: user, isLoading, error } = useAdminUser(id);
  const resetPasswordMutation = useResetUserPassword();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return pickLocalizedCopy(appLanguage, { ar: 'غير متاح', en: 'Unavailable' });
    }

    return new Date(value).toLocaleString(locale);
  };

  const localizedRole = (role: string) =>
    pickLocalizedCopy(appLanguage, roleLabels[role] ?? { ar: role, en: role });
  const localizedStatus = (status: string) =>
    pickLocalizedCopy(appLanguage, statusLabels[status] ?? { ar: status, en: status });
  const localizedKyc = (status: string) =>
    pickLocalizedCopy(appLanguage, kycLabels[status] ?? { ar: status, en: status });
  const localizedAudit = (eventType: string) =>
    pickLocalizedCopy(appLanguage, auditLabels[eventType] ?? { ar: eventType, en: eventType });
  const localizedDocumentType = (documentType: string | null) => {
    if (!documentType) {
      return pickLocalizedCopy(appLanguage, { ar: 'غير متاح', en: 'Unavailable' });
    }

    return pickLocalizedCopy(
      appLanguage,
      documentTypeLabels[documentType] ?? {
        ar: documentType,
        en: documentType,
      },
    );
  };

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
      toast.success(
        pickLocalizedCopy(appLanguage, {
          ar: 'تم نسخ كلمة المرور الجديدة',
          en: 'The new password has been copied',
        }),
      );
    } catch {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'تعذر نسخ كلمة المرور',
          en: 'Could not copy the password',
        }),
      );
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
          className="gap-2"
          onClick={() => {
            void navigate('/admin/users');
          }}
        >
          <ArrowRight className="h-4 w-4" />
          {pickLocalizedCopy(appLanguage, { ar: 'العودة إلى المستخدمين', en: 'Back to users' })}
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            {pickLocalizedCopy(appLanguage, {
              ar: 'تعذر تحميل تفاصيل المستخدم المطلوبة.',
              en: 'Could not load the requested user details.',
            })}
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
            className="gap-2 px-0"
            onClick={() => {
              void navigate('/admin/users');
            }}
          >
            <ArrowRight className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, { ar: 'العودة إلى المستخدمين', en: 'Back to users' })}
          </Button>
          <h1 className="text-2xl font-bold">
            {pickLocalizedCopy(appLanguage, {
              ar: 'الملف الإداري للمستخدم',
              en: 'Admin user profile',
            })}
          </h1>
          <p className="text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'عرض حالة الحساب، التحقق، وسجل النشاط مع إمكانية إعادة تعيين كلمة المرور.',
              en: 'Review the account status, verification details, and activity log, with the option to reset the password.',
            })}
          </p>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <KeyRound className="ms-2 h-4 w-4" />
          {pickLocalizedCopy(appLanguage, {
            ar: 'إعادة تعيين كلمة المرور',
            en: 'Reset password',
          })}
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
                <Badge variant="secondary">{localizedRole(user.role)}</Badge>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                  {localizedStatus(user.status)}
                </Badge>
              </div>
              <LtrText as="p" className="text-sm text-muted-foreground">
                {user.email}
              </LtrText>
              {user.displayName && (
                <p className="text-sm text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, { ar: 'الاسم الظاهر:', en: 'Display name:' })}{' '}
                  {user.displayName}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>
              {pickLocalizedCopy(appLanguage, {
                ar: 'تم إنشاء الحساب:',
                en: 'Account created:',
              })}{' '}
              {formatDateTime(user.createdAt)}
            </p>
            <p>
              {pickLocalizedCopy(appLanguage, { ar: 'آخر تحديث:', en: 'Last updated:' })}{' '}
              {formatDateTime(user.updatedAt)}
            </p>
            <p>
              {pickLocalizedCopy(appLanguage, { ar: 'آخر تسجيل دخول:', en: 'Last login:' })}{' '}
              {formatDateTime(user.lastLoginAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'بيانات الحساب', en: 'Account details' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'البريد الإلكتروني',
                    en: 'Email',
                  })}
                </p>
                <LtrText as="p" className="font-medium text-foreground">
                  {user.email}
                </LtrText>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, { ar: 'الهاتف', en: 'Phone' })}
                </p>
                {user.phone ? (
                  <LtrText as="p" className="font-medium text-foreground">
                    {user.phone}
                  </LtrText>
                ) : (
                  <p className="font-medium text-foreground">
                    {pickLocalizedCopy(appLanguage, { ar: 'غير متاح', en: 'Unavailable' })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'الدور الحالي',
                    en: 'Current role',
                  })}
                </p>
                <p className="font-medium text-foreground">{localizedRole(user.role)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <UserCog className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">
                  {pickLocalizedCopy(appLanguage, { ar: 'اللغة', en: 'Language' })}
                </p>
                <p className="font-medium text-foreground">
                  {user.language === 'en'
                    ? 'English'
                    : pickLocalizedCopy(appLanguage, { ar: 'العربية', en: 'Arabic' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              {pickLocalizedCopy(appLanguage, {
                ar: 'التحقق والحالة',
                en: 'Verification and status',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'حالة الحساب',
                  en: 'Account status',
                })}
              </p>
              <p className="font-medium text-foreground">{localizedStatus(user.status)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, { ar: 'حالة KYC', en: 'KYC status' })}
              </p>
              <p className="font-medium text-foreground">
                {user.kycStatus
                  ? localizedKyc(user.kycStatus)
                  : pickLocalizedCopy(appLanguage, {
                      ar: 'لا يوجد طلب تحقق',
                      en: 'No KYC submission',
                    })}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'نوع آخر مستند',
                  en: 'Latest document type',
                })}
              </p>
              <p className="font-medium text-foreground">
                {localizedDocumentType(user.latestKycDocumentType)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'تم التحقق من الحساب',
                  en: 'Account verified at',
                })}
              </p>
              <p className="font-medium text-foreground">
                {user.verifiedAt
                  ? formatDateTime(user.verifiedAt)
                  : pickLocalizedCopy(appLanguage, {
                      ar: 'لم يتم التحقق بعد',
                      en: 'Not verified yet',
                    })}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'آخر إرسال KYC',
                  en: 'Last KYC submission',
                })}
              </p>
              <p className="font-medium text-foreground">{formatDateTime(user.kycSubmittedAt)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'آخر مراجعة KYC',
                  en: 'Last KYC review',
                })}
              </p>
              <p className="font-medium text-foreground">{formatDateTime(user.kycReviewedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              {pickLocalizedCopy(appLanguage, { ar: 'ملخص النشاط', en: 'Recent activity' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.recentAuditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'لا توجد أحداث مسجلة لهذا الحساب حتى الآن.',
                  en: 'No activity has been recorded for this account yet.',
                })}
              </p>
            ) : (
              user.recentAuditEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-border/60 p-4 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">
                      {localizedAudit(event.eventType)}
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
            <AlertDialogTitle>
              {pickLocalizedCopy(appLanguage, {
                ar: 'إعادة تعيين كلمة المرور',
                en: 'Reset password',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'سيتم إنشاء كلمة مرور عشوائية جديدة لهذا المستخدم وإلغاء جلساته الحالية. اعرض كلمة المرور الجديدة مرة واحدة فقط وشاركها معه بشكل آمن.',
                en: 'A new random password will be generated for this user and all active sessions will be revoked. The new password is shown only once, so share it through a secure channel.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {pickLocalizedCopy(appLanguage, { ar: 'إلغاء', en: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleResetPassword();
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? pickLocalizedCopy(appLanguage, {
                    ar: 'جارٍ التنفيذ...',
                    en: 'Processing...',
                  })
                : pickLocalizedCopy(appLanguage, {
                    ar: 'تأكيد إعادة التعيين',
                    en: 'Confirm reset',
                  })}
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
            <DialogTitle>
              {pickLocalizedCopy(appLanguage, {
                ar: 'تم إنشاء كلمة مرور جديدة',
                en: 'A new password has been generated',
              })}
            </DialogTitle>
            <DialogDescription>
              {pickLocalizedCopy(appLanguage, {
                ar: 'هذه الكلمة ستُعرض مرة واحدة فقط. يرجى نسخها ومشاركتها مع المستخدم عبر قناة آمنة.',
                en: 'This password is shown only once. Copy it now and share it with the user through a secure channel.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'كلمة المرور المؤقتة',
                en: 'Temporary password',
              })}
            </p>
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
              <Copy className="ms-2 h-4 w-4" />
              {pickLocalizedCopy(appLanguage, {
                ar: 'نسخ كلمة المرور',
                en: 'Copy password',
              })}
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              {pickLocalizedCopy(appLanguage, { ar: 'إغلاق', en: 'Close' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
