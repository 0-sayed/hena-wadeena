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
import { getInitials } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { language } = useAuth();
  const { t } = useTranslation('admin');
  const locale = language === 'en' ? 'en-US' : 'ar-EG';

  const { data: user, isLoading, error } = useAdminUser(id);
  const resetPasswordMutation = useResetUserPassword();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const formatDateTime = (value: string | null) => {
    if (!value) {
      return t('users.detail.unavailable');
    }

    return new Date(value).toLocaleString(locale);
  };

  const localizedRole = (role: string) => t(`users.roles.${role}`, { defaultValue: role });
  const localizedStatus = (status: string) =>
    t(`users.statuses.${status}`, { defaultValue: status });
  const localizedKyc = (status: string) =>
    t(`moderation.kyc.status.${status}`, { defaultValue: status });
  const localizedAudit = (eventType: string) =>
    t(`users.audit.${eventType}`, { defaultValue: eventType });
  const localizedDocumentType = (documentType: string | null) => {
    if (!documentType) {
      return t('users.detail.unavailable');
    }

    return t(`moderation.kyc.doc.${documentType}`, { defaultValue: documentType });
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
      toast.success(t('users.detail.passwordCopied'));
    } catch {
      toast.error(t('users.detail.passwordCopyError'));
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
          <ArrowRight className="h-4 w-4 ltr:rotate-180" />
          {t('users.detail.back')}
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-destructive">
            {t('users.detail.loadError')}
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
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {t('users.detail.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('users.detail.title')}</h1>
          <p className="text-muted-foreground">{t('users.detail.subtitle')}</p>
        </div>

        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          <KeyRound className="ms-2 h-4 w-4" />
          {t('users.detail.resetPwd')}
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
                  {t('users.detail.displayName')} {user.displayName}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground">
            <p>
              {t('users.detail.created')} {formatDateTime(user.createdAt)}
            </p>
            <p>
              {t('users.detail.updated')} {formatDateTime(user.updatedAt)}
            </p>
            <p>
              {t('users.detail.lastLogin')} {formatDateTime(user.lastLoginAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t('users.detail.accountDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('users.detail.email')}</p>
                <LtrText as="p" className="font-medium text-foreground">
                  {user.email}
                </LtrText>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('users.detail.phone')}</p>
                {user.phone ? (
                  <LtrText as="p" className="font-medium text-foreground">
                    {user.phone}
                  </LtrText>
                ) : (
                  <p className="font-medium text-foreground">{t('users.detail.unavailable')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('users.detail.currentRole')}</p>
                <p className="font-medium text-foreground">{localizedRole(user.role)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4">
              <UserCog className="h-4 w-4 text-primary" />
              <div>
                <p className="text-muted-foreground">{t('users.detail.language')}</p>
                <p className="font-medium text-foreground">
                  {user.language === 'en' ? 'English' : t('users.detail.langAr')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t('users.detail.verificationStats')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.accountStatus')}</p>
              <p className="font-medium text-foreground">{localizedStatus(user.status)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.kycStatus')}</p>
              <p className="font-medium text-foreground">
                {user.kycStatus ? localizedKyc(user.kycStatus) : t('users.detail.noKyc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.latestDoc')}</p>
              <p className="font-medium text-foreground">
                {localizedDocumentType(user.latestKycDocumentType)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.verifiedAt')}</p>
              <p className="font-medium text-foreground">
                {user.verifiedAt ? formatDateTime(user.verifiedAt) : t('users.detail.notVerified')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.kycLastSub')}</p>
              <p className="font-medium text-foreground">{formatDateTime(user.kycSubmittedAt)}</p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-1 text-muted-foreground">{t('users.detail.kycLastReview')}</p>
              <p className="font-medium text-foreground">{formatDateTime(user.kycReviewedAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{t('users.detail.activity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.recentAuditEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('users.detail.noActivity')}</p>
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
            <AlertDialogTitle>{t('users.detail.resetPwd')}</AlertDialogTitle>
            <AlertDialogDescription>{t('users.detail.resetDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('users.detail.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleResetPassword();
              }}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? t('users.detail.processing')
                : t('users.detail.confirmReset')}
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
            <DialogTitle>{t('users.detail.newPwdTitle')}</DialogTitle>
            <DialogDescription>{t('users.detail.newPwdDesc')}</DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-sm text-muted-foreground">{t('users.detail.tempPwd')}</p>
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
              {t('users.detail.copyPwd')}
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>{t('users.detail.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
