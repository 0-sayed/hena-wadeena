import { useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrorAlert } from '@/components/ui/form-feedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/services/api';

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await authAPI.requestPasswordReset({ email });
      toast.success('إذا كان البريد الإلكتروني موجودًا، فسيصلك رمز إعادة التعيين');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر إرسال رمز إعادة التعيين');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="إعادة تعيين كلمة المرور">
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-24">
          <GradientMesh />
          <div className="container relative max-w-md px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 pt-10 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
                    <Mail className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">إرسال رمز إعادة التعيين</CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    أدخل بريدك الإلكتروني وسنرسل لك رمز OTP صالح لمدة 10 دقائق
                  </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 pt-8">
                  <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (formError) {
                            setFormError(null);
                          }
                        }}
                        className="h-13 rounded-xl text-base"
                        required
                      />
                    </div>
                    {formError ? <FormErrorAlert message={formError} /> : null}
                    <Button
                      type="submit"
                      className="h-14 w-full rounded-xl text-base"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرمز'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      لديك الرمز بالفعل؟{' '}
                      <Link to="/password-reset/confirm" className="font-semibold text-primary hover:underline">
                        تأكيد إعادة التعيين
                      </Link>
                    </p>
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
