import { useState } from 'react';
import { Link } from 'react-router';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authAPI } from '@/services/api';

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await authAPI.requestPasswordReset({ email });
      toast.success('إذا كان البريد الإلكتروني موجودًا، فسيصلك رمز إعادة التعيين');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال رمز إعادة التعيين');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="إعادة تعيين كلمة المرور">
      <PageTransition>
        <section className="relative py-14 md:py-24 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-md">
            <SR>
              <Card className="border-border/50 rounded-2xl shadow-xl overflow-hidden">
                <CardHeader className="text-center pb-2 pt-10">
                  <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 shadow-lg">
                    <Mail className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">إرسال رمز إعادة التعيين</CardTitle>
                  <p className="text-muted-foreground mt-2">
                    أدخل بريدك الإلكتروني وسنرسل لك رمز OTP صالح لمدة 10 دقائق
                  </p>
                </CardHeader>
                <CardContent className="pt-8 pb-10 px-8">
                  <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-13 rounded-xl text-base"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 rounded-xl text-base" disabled={isSubmitting}>
                      {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرمز'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      لديك الرمز بالفعل؟{' '}
                      <Link to="/password-reset/confirm" className="text-primary hover:underline font-semibold">
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
