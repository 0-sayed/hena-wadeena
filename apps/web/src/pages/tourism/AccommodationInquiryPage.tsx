import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate } from 'react-router';
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

const tenantTypes = ['طالب جامعي', 'موظف حكومي', 'موظف قطاع خاص', 'عائلة', 'أخرى'];

const AccommodationInquiryPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tenantType: '',
    moveInDate: '',
    duration: '',
    occupants: '',
    isStudent: false,
    university: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('تم إرسال استفسارك بنجاح! سيتواصل معك المالك قريباً');
    void navigate('/tourism');
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
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">استفسار عن السكن</CardTitle>
              <p className="text-muted-foreground">أرسل استفسارك وسيتواصل معك المالك</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل *</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="أدخل اسمك"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>نوع المستأجر *</Label>
                  <Select
                    value={formData.tenantType}
                    onValueChange={(value) => setFormData({ ...formData, tenantType: value })}
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
                      setFormData({ ...formData, isStudent: checked as boolean })
                    }
                  />
                  <Label htmlFor="isStudent" className="flex items-center gap-2 cursor-pointer">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    أنا طالب جامعي
                  </Label>
                </div>

                {formData.isStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="university">اسم الجامعة / الكلية</Label>
                    <Input
                      id="university"
                      placeholder="مثال: جامعة الوادي الجديد - كلية الهندسة"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate">تاريخ الانتقال المتوقع</Label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="moveInDate"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">مدة الإيجار المتوقعة</Label>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المدة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3">1-3 شهور</SelectItem>
                        <SelectItem value="3-6">3-6 شهور</SelectItem>
                        <SelectItem value="6-12">6-12 شهر</SelectItem>
                        <SelectItem value="12+">أكثر من سنة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupants">عدد الأفراد</Label>
                  <div className="relative">
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="occupants"
                      type="number"
                      min="1"
                      placeholder="عدد الأفراد"
                      value={formData.occupants}
                      onChange={(e) => setFormData({ ...formData, occupants: e.target.value })}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">رسالتك</Label>
                  <Textarea
                    id="message"
                    placeholder="اكتب أي استفسارات أو متطلبات خاصة..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
