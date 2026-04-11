import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useLocation, Link } from 'react-router';
import type { Location } from 'react-router';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormErrorAlert } from '@/components/ui/form-feedback';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { t } = useTranslation('auth');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);
    try {
      const result = await auth.login({ email: formData.email, password: formData.password });
      if (result.status === 'pending_kyc') {
        toast.success(t('login.kycRequired'));
        void navigate('/kyc/continue');
        return;
      }
      toast.success(t('login.success'));
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      void navigate(from);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title={t('login.title')}>
      <PageTransition>
        <section className="relative overflow-hidden py-14 md:py-24">
          <GradientMesh />
          <div className="container relative max-w-md px-4">
            <SR>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 pt-10 text-center">
                  <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
                    <LogIn className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
                  <p className="mt-2 text-muted-foreground">{t('login.subtitle')}</p>
                </CardHeader>
                <CardContent className="px-8 pb-10 pt-8">
                  <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('login.emailLabel')}</Label>
                      <div className="relative">
                        <Mail className="absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('login.emailPlaceholder')}
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (formError) {
                              setFormError(null);
                            }
                          }}
                          className="h-13 rounded-xl pe-12 text-base"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                      <div className="relative">
                        <Lock className="absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder={t('login.passwordPlaceholder')}
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            if (formError) {
                              setFormError(null);
                            }
                          }}
                          className="h-13 rounded-xl pe-12 text-base"
                          required
                        />
                      </div>
                      <div className="text-start">
                        <Link
                          to="/password-reset/request"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {t('login.forgotPassword')}
                        </Link>
                      </div>
                    </div>
                    {formError ? <FormErrorAlert message={formError} /> : null}
                    <Button
                      type="submit"
                      className="h-14 w-full rounded-xl text-base transition-transform hover:scale-[1.02]"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? t('login.submitting') : t('login.submit')}
                    </Button>
                    <p className="pt-2 text-center text-sm text-muted-foreground">
                      {t('login.noAccount')}{' '}
                      <Link to="/register" className="font-semibold text-primary hover:underline">
                        {t('login.registerNow')}
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
