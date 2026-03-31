import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  Users,
  MessageSquare,
  Send,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useListing } from '@/hooks/use-listings';

const tenantTypes = ['طالب جامعي', 'موظف حكومي', 'موظف قطاع خاص', 'عائلة', 'أخرى'];

function getContactField(
  contact: Record<string, unknown> | null,
  key: 'phone' | 'email',
): string | null {
  const value = contact?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const AccommodationInquiryPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: listing } = useListing(id);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tenantType: '',
    moveInDate: '',
    duration: '',
    occupants: '1',
    isStudent: false,
    university: '',
    message: '',
  });

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.full_name,
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email,
      isStudent: prev.isStudent || user.role === 'student',
    }));
  }, [user]);

  const contactPhone = getContactField(listing?.contact ?? null, 'phone');
  const contactEmail = getContactField(listing?.contact ?? null, 'email');

  const inquiryMessage = useMemo(() => {
    const details = [
      `الاسم: ${formData.name}`,
      `الهاتف: ${formData.phone}`,
      formData.email ? `البريد الإلكتروني: ${formData.email}` : null,
      `نوع المستأجر: ${formData.tenantType}`,
      formData.moveInDate ? `تاريخ الانتقال المتوقع: ${formData.moveInDate}` : null,
      formData.duration ? `مدة الإيجار: ${formData.duration}` : null,
      `عدد الأفراد: ${formData.occupants}`,
      formData.isStudent ? 'المتقدم طالب جامعي' : null,
      formData.university ? `الجامعة/الكلية: ${formData.university}` : null,
      formData.message ? `رسالة إضافية: ${formData.message}` : null,
    ].filter(Boolean);

    return `استفسار بخصوص السكن: ${listing?.titleAr ?? ''}\n\n${details.join('\n')}`;
  }, [formData, listing?.titleAr]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || !formData.tenantType) {
      toast.error('يرجى استكمال الاسم ورقم الهاتف ونوع المستأجر');
      return;
    }

    if (contactEmail) {
      const subject = `استفسار عن السكن: ${listing?.titleAr ?? 'إعلان سكن'}`;
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryMessage)}`;
      toast.success('تم فتح بريدك لإرسال الاستفسار مباشرة');
      return;
    }

    if (contactPhone) {
      window.location.href = `tel:${contactPhone}`;
      toast.success('تم تجهيز وسيلة التواصل المباشر مع المعلن');
      return;
    }

    void navigator.clipboard
      .writeText(inquiryMessage)
      .then(() => {
        toast.success('تم نسخ نص الاستفسار. يمكنك مشاركته مع المعلن مباشرة');
      })
      .catch(() => {
        toast.error('لا تتوفر وسيلة تواصل مباشرة لهذا الإعلان حالياً');
      });
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
              <CardTitle className="text-2xl">استفسار عن السكن</CardTitle>
              <p className="text-muted-foreground">
                أرسل استفسارك مباشرة إلى المعلن باستخدام بيانات التواصل المتاحة.
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
                        placeholder="أدخل اسمك"
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
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01xxxxxxxxx"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>نوع المستأجر *</Label>
                  <Select
                    value={formData.tenantType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tenantType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المستأجر" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isStudent"
                    checked={formData.isStudent}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isStudent: checked === true }))
                    }
                  />
                  <Label htmlFor="isStudent" className="flex cursor-pointer items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    أنا طالب جامعي
                  </Label>
                </div>

                {formData.isStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="university">الجامعة / الكلية</Label>
                    <Input
                      id="university"
                      placeholder="مثال: جامعة الوادي الجديد - كلية العلوم"
                      value={formData.university}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, university: event.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">تاريخ الانتقال المتوقع</Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="moveInDate"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, moveInDate: event.target.value }))
                        }
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>مدة الإيجار المتوقعة</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, duration: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3 أشهر">1-3 أشهر</SelectItem>
                        <SelectItem value="3-6 أشهر">3-6 أشهر</SelectItem>
                        <SelectItem value="6-12 شهر">6-12 شهر</SelectItem>
                        <SelectItem value="أكثر من سنة">أكثر من سنة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupants">عدد الأفراد</Label>
                  <div className="relative">
                    <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="occupants"
                      type="number"
                      min="1"
                      value={formData.occupants}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, occupants: event.target.value }))
                      }
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">رسالتك</Label>
                  <Textarea
                    id="message"
                    placeholder="اكتب أي تفاصيل إضافية أو أسئلة تريد إرسالها للمعلن..."
                    value={formData.message}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, message: event.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Send className="h-5 w-5 ml-2" />
                  إرسال الاستفسار
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default AccommodationInquiryPage;
