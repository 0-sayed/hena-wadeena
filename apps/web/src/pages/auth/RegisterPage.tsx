import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, Link } from 'react-router';
import { User, Mail, Lock, Phone, Building2, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { PageTransition, GradientMesh } from '@/components/motion/PageTransition';
import { SR } from '@/components/motion/ScrollReveal';

const roles = [
  { value: 'resident', label: 'مواطن', description: 'مستخدم عادي يبحث عن الخدمات' },
  { value: 'merchant', label: 'تاجر', description: 'تاجر أو منتج محلي' },
  { value: 'investor', label: 'مستثمر', description: 'مستثمر يبحث عن فرص' },
  { value: 'tourist', label: 'سائح', description: 'زائر أو سائح' },
  { value: 'student', label: 'طالب', description: 'طالب في الوادي الجديد' },
  { value: 'driver', label: 'سائق', description: 'سائق نقل أو كاربول' },
  { value: 'guide', label: 'مرشد سياحي', description: 'مرشد سياحي مرخص' },
];

const RegisterPage = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
    city: '',
    organization: '',
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);

    try {
      await auth.register({
        email: formData.email,
        phone: formData.phone,
        full_name: formData.fullName,
        password: formData.password,
        role: formData.role || 'tourist',
      });
      toast.success('تم إنشاء الحساب بنجاح');
      void navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('كلمتا المرور غير متطابقتين');
        return;
      }
    }
    if (step === 2 && !formData.role) {
      toast.error('يرجى اختيار نوع الحساب');
      return;
    }
    setStep(step + 1);
  };

  return (
    <Layout>
      <PageTransition>
        <section className="relative py-10 md:py-14 overflow-hidden">
          <GradientMesh />
          <div className="container relative px-4 max-w-xl">
            {/* Progress */}
            <SR>
              <div className="flex items-center justify-center gap-4 mb-10">
                {[1, 2, 3].map((s) => (
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
                      {s === 1 ? 'البيانات الأساسية' : s === 2 ? 'نوع الحساب' : 'المستندات'}
                    </span>
                    {s < 3 && <div className="h-px w-10 bg-border" />}
                  </div>
                ))}
              </div>
            </SR>

            <SR delay={100}>
              <Card className="border-border/50 rounded-2xl shadow-xl overflow-hidden">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                  <p className="text-muted-foreground">
                    {step === 1
                      ? 'أدخل بياناتك الأساسية'
                      : step === 2
                        ? 'اختر نوع حسابك'
                        : 'ارفع المستندات المطلوبة'}
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
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fullName"
                              placeholder="أدخل اسمك الكامل"
                              value={formData.fullName}
                              onChange={(e) =>
                                setFormData({ ...formData, fullName: e.target.value })
                              }
                              className="pr-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">البريد الإلكتروني *</Label>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="example@email.com"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              className="pr-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الهاتف *</Label>
                          <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="01xxxxxxxxx"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="pr-10"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) =>
                                  setFormData({ ...formData, password: e.target.value })
                                }
                                className="pr-10"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                            <div className="relative">
                              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) =>
                                  setFormData({ ...formData, confirmPassword: e.target.value })
                                }
                                className="pr-10"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full h-14 rounded-xl hover:scale-[1.02] transition-transform"
                          size="lg"
                          onClick={nextStep}
                        >
                          التالي
                          <ArrowLeft className="h-4 w-4 mr-2" />
                        </Button>
                      </div>
                    )}

                    {/* Step 2: Role Selection */}
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
                              onClick={() => setFormData({ ...formData, role: role.value })}
                            >
                              <p className="font-medium text-foreground">{role.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {role.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="city">المدينة</Label>
                          <Select
                            value={formData.city}
                            onValueChange={(value) => setFormData({ ...formData, city: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المدينة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kharga">الخارجة</SelectItem>
                              <SelectItem value="dakhla">الداخلة</SelectItem>
                              <SelectItem value="farafra">الفرافرة</SelectItem>
                              <SelectItem value="paris">باريس</SelectItem>
                              <SelectItem value="balat">بلاط</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="organization">اسم المؤسسة (اختياري)</Label>
                          <div className="relative">
                            <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="organization"
                              placeholder="اسم الشركة أو المؤسسة"
                              value={formData.organization}
                              onChange={(e) =>
                                setFormData({ ...formData, organization: e.target.value })
                              }
                              className="pr-10"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setStep(1)}
                          >
                            <ArrowRight className="h-4 w-4 ml-2" />
                            السابق
                          </Button>
                          <Button type="button" className="flex-1" onClick={nextStep}>
                            التالي
                            <ArrowLeft className="h-4 w-4 mr-2" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Review & Submit */}
                    {step === 3 && (
                      <div className="space-y-4">
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
                            <span className="text-muted-foreground">الهاتف</span>
                            <span dir="ltr">{formData.phone}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">نوع الحساب</span>
                            <span>{roles.find((r) => r.value === formData.role)?.label}</span>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setStep(2)}
                          >
                            <ArrowRight className="h-4 w-4 ml-2" />
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
