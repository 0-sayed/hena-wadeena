import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useLocation, Link } from 'react-router';
import type { Location } from 'react-router';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await auth.login({ email: formData.email, password: formData.password });
      if (result.status === 'pending_kyc') {
        toast.success('يجب استكمال وثائق التحقق قبل تفعيل الحساب');
        void navigate('/kyc/continue');
        return;
      }
      toast.success('تم تسجيل الدخول بنجاح');
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      void navigate(from);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-14 md:py-24 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-md">
            <SR>
              <Card className="border-border/50 rounded-2xl shadow-xl overflow-hidden">
                <CardHeader className="text-center pb-2 pt-10">
                  <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 shadow-lg">
                    <LogIn className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
                  <p className="text-muted-foreground mt-2">أدخل بياناتك للوصول إلى حسابك</p>
                </CardHeader>
                <CardContent className="pt-8 pb-10 px-8">
                  <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pr-12 h-13 rounded-xl text-base"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pr-12 h-13 rounded-xl text-base"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-14 rounded-xl text-base hover:scale-[1.02] transition-transform"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      ليس لديك حساب؟{' '}
                      <Link to="/register" className="text-primary hover:underline font-semibold">
                        سجل الآن
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
};

export default LoginPage;
