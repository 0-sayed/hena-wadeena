import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrorAlert } from '@/components/ui/form-feedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { authAPI } from '@/services/api';
import type { AuthFlowResponse } from '@/services/api';
import * as authManager from '@/services/auth-manager';
import * as kycSessionManager from '@/services/kyc-session-manager';

function isPendingKycResponse(
  response: AuthFlowResponse,
): response is Extract<AuthFlowResponse, { status: 'pending_kyc' }> {
  return 'status' in response && response.status === 'pending_kyc';
}

export default function ConfirmPasswordResetPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setFormError('كلمتا المرور غير متطابقتين');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const response = await authAPI.confirmPasswordReset({
        email: formData.email,
        otp: formData.otp,
        new_password: formData.newPassword,
      });

      if (isPendingKycResponse(response)) {
        authManager.clearTokens();
        kycSessionManager.setKycSessionToken(response.kyc_session_token);
        toast.success('تم تحديث كلمة المرور. أكمل إجراءات التحقق للمتابعة');
        void navigate('/kyc/continue');
        return;
      }

      kycSessionManager.clearKycSessionToken();
      authManager.setTokens(response.access_token, response.refresh_token);
      auth.updateUser(response.user);
      toast.success('تمت إعادة تعيين كلمة المرور بنجاح');
      void navigate('/');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر إكمال إعادة التعيين');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="تأكيد إعادة التعيين">
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-24">
          <GradientMesh />
          <div className="container relative max-w-md px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 pt-10 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
                    <KeyRound className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">تأكيد رمز OTP وكلمة المرور الجديدة</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    أدخل البريد الإلكتروني والرمز وكلمة المرور الجديدة
                  </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 pt-8">
                  <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                    {formError ? <FormErrorAlert message={formError} /> : null}
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((current) => {
                            if (formError) {
                              setFormError(null);
                            }
                            return { ...current, email: event.target.value };
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otp">رمز OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        dir="ltr"
                        maxLength={6}
                        value={formData.otp}
                        onChange={(event) =>
                          setFormData((current) => {
                            if (formError) {
                              setFormError(null);
                            }
                            return {
                              ...current,
                              otp: event.target.value.replace(/\D/g, '').slice(0, 6),
                            };
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(event) =>
                          setFormData((current) => {
                            if (formError) {
                              setFormError(null);
                            }
                            return {
                              ...current,
                              newPassword: event.target.value,
                            };
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(event) =>
                          setFormData((current) => {
                            if (formError) {
                              setFormError(null);
                            }
                            return {
                              ...current,
                              confirmPassword: event.target.value,
                            };
                          })
                        }
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-14 w-full rounded-xl text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد إعادة التعيين'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
}
