import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, Link } from 'react-router';
import { User, Mail, Lock, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';
import { z } from 'zod';
import { ApiError } from '@/services/api';

const roles = [
  { value: 'resident', label: 'مواطن', description: 'مستخدم عادي يبحث عن الخدمات' },
  { value: 'merchant', label: 'تاجر', description: 'تاجر أو منتج محلي' },
  { value: 'investor', label: 'مستثمر', description: 'مستثمر يبحث عن فرص' },
  { value: 'tourist', label: 'سائح', description: 'زائر أو سائح' },
  { value: 'student', label: 'طالب', description: 'طالب في الوادي الجديد' },
  { value: 'driver', label: 'سائق', description: 'سائق نقل أو كاربول' },
  { value: 'guide', label: 'مرشد سياحي', description: 'مرشد سياحي مرخص' },
];

const step1Schema = z
  .object({
    fullName: z.string().min(1, 'الاسم مطلوب').max(100, 'الاسم طويل جداً'),
    email: z.string().min(1, 'البريد الإلكتروني مطلوب').email('بريد إلكتروني غير صالح'),
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  });

const step2Schema = z.object({
  role: z.string().min(1, 'يرجى اختيار نوع الحساب'),
});

// Map backend field names to frontend step numbers
const fieldToStep: Record<string, 1 | 2> = {
  email: 1,
  password: 1,
  full_name: 1,
  role: 2,
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const step2Result = step2Schema.safeParse({ role: formData.role });
    if (!step2Result.success) {
      const errs: Record<string, string> = {};
      step2Result.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        errs[key] = err.message;
      });
      setFieldErrors(errs);
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      await auth.register({
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
        role: formData.role,
      });
      toast.success('تم إنشاء الحساب بنجاح');
      void navigate('/');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setStep(1);
          setFieldErrors({ email: 'هذا البريد مسجل بالفعل' });
          return;
        }
        if (err.status === 400) {
          const backendToFrontend: Record<string, string> = { full_name: 'fullName' };
          const zodErrors = err.data?.errors as
            | Array<{ path: string[]; message: string }>
            | undefined;
          if (zodErrors && zodErrors.length > 0) {
            const errs: Record<string, string> = {};
            let earliestStep: 1 | 2 = 2;
            zodErrors.forEach((ve) => {
              const backendField = ve.path[0] ?? '';
              const field = backendToFrontend[backendField] ?? backendField;
              errs[field] = ve.message;
              const s = fieldToStep[backendField] ?? 2;
              if (s < earliestStep) earliestStep = s;
            });
            setFieldErrors(errs);
            setStep(earliestStep);
            return;
          }
        }
      }
      toast.error(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    const result = step1Schema.safeParse(formData);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        if (!errs[key]) errs[key] = err.message;
      });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  return (
    <Layout title="تسجيل حساب جديد">
      <PageTransition>
        <section className="relative py-10 md:py-14 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-xl">
            {/* Progress */}
            <SR>
              <div className="flex items-center justify-center gap-4 mb-10">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        step > s
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : step === s
                            ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <span className="text-sm font-semibold hidden sm:inline">
                      {s === 1 ? 'البيانات الأساسية' : 'نوع الحساب'}
                    </span>
                    {s < 2 && <div className="h-px w-10 bg-border" />}
                  </div>
                ))}
              </div>
            </SR>

            <SR delay={100}>
              <Card className="border-border/50 rounded-2xl shadow-xl overflow-hidden">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                  <p className="text-muted-foreground">
                    {step === 1 ? 'أدخل بياناتك الأساسية' : 'اختر نوع حسابك'}
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={(e) => void handleSubmit(e)}>
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">الاسم الكامل *</Label>
                          <div className="relative">
                            <User className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fullName"
                              placeholder="أدخل اسمك الكامل"
                              value={formData.fullName}
                              onChange={(e) => {
                                setFormData({ ...formData, fullName: e.target.value });
                                if (fieldErrors.fullName)
                                  setFieldErrors({ ...fieldErrors, fullName: '' });
                              }}
                              className="pe-10"
                            />
                          </div>
                          {fieldErrors.fullName && (
                            <p className="text-xs text-red-500">{fieldErrors.fullName}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">البريد الإلكتروني *</Label>
                          <div className="relative">
                            <Mail className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="example@email.com"
                              value={formData.email}
                              onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value });
                                if (fieldErrors.email)
                                  setFieldErrors({ ...fieldErrors, email: '' });
                              }}
                              className="pe-10"
                            />
                          </div>
                          {fieldErrors.email && (
                            <p className="text-xs text-red-500">{fieldErrors.email}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => {
                                  setFormData({ ...formData, password: e.target.value });
                                  if (fieldErrors.password)
                                    setFieldErrors({ ...fieldErrors, password: '' });
                                }}
                                className="pe-10"
                              />
                            </div>
                            {fieldErrors.password && (
                              <p className="text-xs text-red-500">{fieldErrors.password}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => {
                                  setFormData({ ...formData, confirmPassword: e.target.value });
                                  if (fieldErrors.confirmPassword)
                                    setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                                }}
                                className="pe-10"
                              />
                            </div>
                            {fieldErrors.confirmPassword && (
                              <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full h-14 rounded-xl hover:scale-[1.02] transition-transform"
                          size="lg"
                          onClick={nextStep}
                        >
                          التالي
                          <ArrowLeft className="h-4 w-4 me-2" />
                        </Button>
                      </div>
                    )}

                    {/* Step 2: Role + Confirm */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {roles.map((role) => (
                            <div
                              key={role.value}
                              className={`border rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02] ${
                                formData.role === role.value
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border hover:border-primary/50 hover:shadow-sm'
                              }`}
                              onClick={() => {
                                setFormData({ ...formData, role: role.value });
                                if (fieldErrors.role) setFieldErrors({ ...fieldErrors, role: '' });
                              }}
                            >
                              <p className="font-medium text-foreground">{role.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {role.description}
                              </p>
                            </div>
                          ))}
                        </div>
                        {fieldErrors.role && (
                          <p className="text-xs text-red-500">{fieldErrors.role}</p>
                        )}

                        {/* Summary */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold mb-3">ملخص البيانات</h4>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">الاسم</span>
                            <span>{formData.fullName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">البريد</span>
                            <span dir="ltr">{formData.email}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">نوع الحساب</span>
                            <span>
                              {roles.find((r) => r.value === formData.role)?.label ?? '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setStep(1)}
                          >
                            <ArrowRight className="h-4 w-4" />
                            السابق
                          </Button>
                          <Button type="submit" className="flex-1" size="lg" disabled={isLoading}>
                            {isLoading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>

                  {step === 1 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      لديك حساب بالفعل؟{' '}
                      <Link to="/login" className="text-primary hover:underline font-medium">
                        تسجيل الدخول
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            </SR>
          </div>
        </section>
      </PageTransition>
    </Layout>
  );
};

export default RegisterPage;
