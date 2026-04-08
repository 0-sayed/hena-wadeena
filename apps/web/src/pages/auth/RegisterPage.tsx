import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, Link } from 'react-router';
import { User, Mail, Lock, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldErrorText, FormErrorAlert } from '@/components/ui/form-feedback';
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
  const [formError, setFormError] = useState<string | null>(null);

  const focusField = (field: string) => {
    window.requestAnimationFrame(() => {
      if (field === 'role') {
        const currentRoleButton = formData.role
          ? document.querySelector<HTMLButtonElement>(`[data-role-option="${formData.role}"]`)
          : document.querySelector<HTMLButtonElement>('[data-role-option]');
        currentRoleButton?.focus();
        return;
      }

      document.getElementById(field)?.focus();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const step2Result = step2Schema.safeParse({ role: formData.role });
    if (!step2Result.success) {
      const errs: Record<string, string> = {};
      step2Result.error.errors.forEach((err) => {
        const key = err.path[0] as string;
        errs[key] = err.message;
      });
      setFieldErrors(errs);
      const firstInvalidField = step2Result.error.errors[0]?.path[0];
      if (typeof firstInvalidField === 'string') {
        focusField(firstInvalidField);
      }
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const result = await auth.register({
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
        role: formData.role,
      });
      if (result.status === 'pending_kyc') {
        toast.success('تم إنشاء الحساب. أكمل رفع وثائق التحقق لتفعيل الحساب');
        void navigate('/kyc/continue');
        return;
      }
      toast.success('تم إنشاء الحساب بنجاح');
      void navigate('/');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setStep(1);
          setFieldErrors({ email: 'هذا البريد مسجل بالفعل' });
          focusField('email');
          return;
        }
        if (err.status === 400) {
          const backendToFrontend: Record<string, string> = { full_name: 'fullName' };
          const zodErrors = err.data?.errors as Array<{ path: string[]; message: string }> | undefined;
          if (zodErrors && zodErrors.length > 0) {
            const errs: Record<string, string> = {};
            let earliestStep: 1 | 2 = 2;
            zodErrors.forEach((ve) => {
              const backendField = ve.path[0] ?? '';
              const field = backendToFrontend[backendField] ?? backendField;
              errs[field] = ve.message;
              const currentStep = fieldToStep[backendField] ?? 2;
              if (currentStep < earliestStep) {
                earliestStep = currentStep;
              }
            });
            setFieldErrors(errs);
            setStep(earliestStep);
            const firstInvalidField = Object.keys(errs)[0];
            if (firstInvalidField) {
              focusField(firstInvalidField);
            }
            return;
          }
        }
      }
      setFormError(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
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
        if (!errs[key]) {
          errs[key] = err.message;
        }
      });
      setFieldErrors(errs);
      const firstInvalidField = result.error.errors[0]?.path[0];
      if (typeof firstInvalidField === 'string') {
        focusField(firstInvalidField);
      }
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setStep(2);
  };

  return (
    <Layout title="تسجيل حساب جديد">
      <PageTransition>
        <section className="relative overflow-hidden py-10 md:py-14">
          <GradientMesh />
          <div className="container relative max-w-xl px-4">
            <SR>
              <div className="mb-10 flex items-center justify-center gap-4">
                {[1, 2].map((currentStep) => (
                  <div key={currentStep} className="flex items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 ${
                        step > currentStep
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : step === currentStep
                            ? 'scale-110 bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > currentStep ? <Check className="h-5 w-5" /> : currentStep}
                    </div>
                    <span className="hidden text-sm font-semibold sm:inline">
                      {currentStep === 1 ? 'البيانات الأساسية' : 'نوع الحساب'}
                    </span>
                    {currentStep < 2 ? <div className="h-px w-10 bg-border" /> : null}
                  </div>
                ))}
              </div>
            </SR>

            <SR delay={100}>
              <Card className="overflow-hidden rounded-2xl border-border/50 shadow-xl">
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                  <p className="text-muted-foreground">
                    {step === 1 ? 'أدخل بياناتك الأساسية' : 'اختر نوع حسابك'}
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={(e) => void handleSubmit(e)}>
                    {formError ? <FormErrorAlert className="mb-4" message={formError} /> : null}

                    {step === 1 ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">الاسم الكامل *</Label>
                          <div className="relative">
                            <User className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="fullName"
                              placeholder="أدخل اسمك الكامل"
                              value={formData.fullName}
                              onChange={(e) => {
                                setFormData({ ...formData, fullName: e.target.value });
                                if (fieldErrors.fullName) {
                                  setFieldErrors({ ...fieldErrors, fullName: '' });
                                }
                                if (formError) {
                                  setFormError(null);
                                }
                              }}
                              className="pe-10"
                              aria-invalid={Boolean(fieldErrors.fullName)}
                              aria-describedby={fieldErrors.fullName ? 'fullName-error' : undefined}
                            />
                          </div>
                          <FieldErrorText id="fullName-error" message={fieldErrors.fullName} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">البريد الإلكتروني *</Label>
                          <div className="relative">
                            <Mail className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="example@email.com"
                              value={formData.email}
                              onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value });
                                if (fieldErrors.email) {
                                  setFieldErrors({ ...fieldErrors, email: '' });
                                }
                                if (formError) {
                                  setFormError(null);
                                }
                              }}
                              className="pe-10"
                              aria-invalid={Boolean(fieldErrors.email)}
                              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                            />
                          </div>
                          <FieldErrorText id="email-error" message={fieldErrors.email} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => {
                                  setFormData({ ...formData, password: e.target.value });
                                  if (fieldErrors.password) {
                                    setFieldErrors({ ...fieldErrors, password: '' });
                                  }
                                  if (formError) {
                                    setFormError(null);
                                  }
                                }}
                                className="pe-10"
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                              />
                            </div>
                            <FieldErrorText id="password-error" message={fieldErrors.password} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => {
                                  setFormData({ ...formData, confirmPassword: e.target.value });
                                  if (fieldErrors.confirmPassword) {
                                    setFieldErrors({ ...fieldErrors, confirmPassword: '' });
                                  }
                                  if (formError) {
                                    setFormError(null);
                                  }
                                }}
                                className="pe-10"
                                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                                aria-describedby={
                                  fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined
                                }
                              />
                            </div>
                            <FieldErrorText
                              id="confirmPassword-error"
                              message={fieldErrors.confirmPassword}
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="h-14 w-full rounded-xl transition-transform hover:scale-[1.02]"
                          size="lg"
                          onClick={nextStep}
                        >
                          التالي
                          <ArrowLeft className="me-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {roles.map((role) => (
                            <button
                              id={`role-option-${role.value}`}
                              key={role.value}
                              type="button"
                              data-role-option={role.value}
                              aria-pressed={formData.role === role.value}
                              className={`rounded-2xl border p-5 text-start transition-all hover:scale-[1.02] ${
                                formData.role === role.value
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border hover:border-primary/50 hover:shadow-sm'
                              }`}
                              onClick={() => {
                                setFormData({ ...formData, role: role.value });
                                if (fieldErrors.role) {
                                  setFieldErrors({ ...fieldErrors, role: '' });
                                }
                                if (formError) {
                                  setFormError(null);
                                }
                              }}
                            >
                              <p className="font-medium text-foreground">{role.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                            </button>
                          ))}
                        </div>
                        <FieldErrorText id="role-error" message={fieldErrors.role} />

                        <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                          <h4 className="mb-3 font-semibold">ملخص البيانات</h4>
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
                            <span>{roles.find((role) => role.value === formData.role)?.label ?? '—'}</span>
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

                  {step === 1 ? (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      لديك حساب بالفعل؟{' '}
                      <Link to="/login" className="font-medium text-primary hover:underline">
                        تسجيل الدخول
                      </Link>
                    </p>
                  ) : null}
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
