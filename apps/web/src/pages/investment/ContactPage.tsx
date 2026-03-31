import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, Building2, Mail, MessageSquare, Phone, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { investmentApplicationsAPI } from '@/services/api';
import { parseEgpInputToPiasters } from '@/lib/wallet-store';

const investorTypes = ['مستثمر فردي', 'شركة', 'صندوق استثماري', 'مؤسسة حكومية', 'أخرى'];

const investmentRanges = [
  'أقل من مليون جنيه',
  '1-5 مليون جنيه',
  '5-10 مليون جنيه',
  '10-50 مليون جنيه',
  'أكثر من 50 مليون جنيه',
];

const ContactPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    investorType: '',
    investmentRange: '',
    amount: '',
    message: '',
  });

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.full_name,
      email: prev.email || user.email,
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!id) {
      toast.error('الفرصة غير متاحة حالياً');
      return;
    }

    if (!isAuthenticated) {
      toast.error('سجل الدخول أولاً لإرسال الاستفسار');
      void navigate('/login');
      return;
    }

    if (!['investor', 'merchant'].includes(user?.role ?? '')) {
      toast.error('هذه الميزة متاحة للمستثمرين والتجار فقط');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('يرجى استكمال الاسم والبريد الإلكتروني والرسالة');
      return;
    }

    setSubmitting(true);
    try {
      const amountProposed = formData.amount.trim()
        ? parseEgpInputToPiasters(formData.amount)
        : null;
      const enrichedMessage = [
        `الاسم: ${formData.name.trim()}`,
        formData.company.trim() ? `الشركة: ${formData.company.trim()}` : null,
        formData.investorType ? `نوع المستثمر: ${formData.investorType}` : null,
        formData.investmentRange ? `النطاق الاستثماري: ${formData.investmentRange}` : null,
        '',
        formData.message.trim(),
      ]
        .filter((line) => line != null)
        .join('\n');

      await investmentApplicationsAPI.submitInterest(id, {
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim() || undefined,
        amountProposed: amountProposed ?? undefined,
        message: enrichedMessage,
      });

      toast.success('تم إرسال الاستفسار بنجاح، وسيظهر مباشرة في صندوق وارد مالك الفرصة');
      void navigate('/dashboard/investor');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إرسال الاستفسار';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">تواصل للاستثمار</CardTitle>
              <p className="text-muted-foreground">
                سيتم حفظ طلبك وإرساله مباشرة إلى مالك الفرصة الاستثمارية.
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني *</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, email: event.target.value }))
                        }
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">اسم الشركة</Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, company: event.target.value }))
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>نوع المستثمر</Label>
                    <Select
                      value={formData.investorType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, investorType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المستثمر" />
                      </SelectTrigger>
                      <SelectContent>
                        {investorTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>النطاق الاستثماري المتوقع</Label>
                    <Select
                      value={formData.investmentRange}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, investmentRange: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النطاق" />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">القيمة المقترحة (جنيه)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, amount: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">رسالتك *</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="اشرح اهتمامك بالفرصة أو طبيعة الشراكة التي تبحث عنها..."
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  <Send className="h-5 w-5 ml-2" />
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
