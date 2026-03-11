import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Calendar,
  Star,
  MapPin,
  Check,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Mock guide data
const guideData = {
  id: 1,
  name: 'أحمد السيد',
  languages: ['العربية', 'الإنجليزية'],
  specialties: ['سفاري صحراوي', 'مواقع أثرية'],
  rating: 4.9,
  reviews: 87,
  pricePerDay: 800,
  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  bio: 'مرشد سياحي محترف بخبرة 10 سنوات في الوادي الجديد. متخصص في رحلات السفاري والمواقع الأثرية. حاصل على ترخيص وزارة السياحة.',
  experience: '10 سنوات',
  phone: '01012345678',
  email: 'ahmed.guide@email.com',
};

const GuideBookingPage = () => {
  const navigate = useNavigate();
  useParams(); // route param `id` used for future API integration
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: '',
    days: 1,
    groupSize: 1,
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const totalPrice = guideData.pricePerDay * formData.days;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      toast.success('تم إرسال طلب الحجز بنجاح! سيتواصل معك المرشد قريباً');
      void navigate('/tourism');
    }
  };

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => { if (step === 1) { void navigate('/tourism'); } else { setStep(1); } }}
            className="mb-6"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            {step === 1 ? 'العودة للمرشدين' : 'العودة للخطوة السابقة'}
          </Button>

          {/* Progress */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">تفاصيل الرحلة</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                2
              </div>
              <span className="text-sm font-medium">بيانات الحجز</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guide Info Sidebar */}
            <Card className="border-border/50 lg:order-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={guideData.image}
                    alt={guideData.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{guideData.name}</h3>
                    <div className="flex items-center gap-1 text-accent-foreground">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{guideData.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({guideData.reviews} تقييم)
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{guideData.bio}</p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-primary" />
                    <span>{guideData.languages.join('، ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{guideData.specialties.join('، ')}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">السعر اليومي</span>
                    <span className="text-xl font-bold text-primary">
                      {guideData.pricePerDay} جنيه
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="border-border/50 lg:col-span-2 lg:order-1">
              <CardHeader>
                <CardTitle className="text-xl">
                  {step === 1 ? 'تفاصيل الرحلة' : 'بيانات الحجز'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {step === 1 ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="date">تاريخ بدء الرحلة</Label>
                        <div className="relative">
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="pr-10"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>عدد الأيام</Label>
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setFormData({ ...formData, days: Math.max(1, formData.days - 1) })
                              }
                            >
                              -
                            </Button>
                            <span className="text-xl font-bold w-8 text-center">
                              {formData.days}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setFormData({ ...formData, days: formData.days + 1 })}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>عدد الأفراد</Label>
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  groupSize: Math.max(1, formData.groupSize - 1),
                                })
                              }
                            >
                              -
                            </Button>
                            <span className="text-xl font-bold w-8 text-center">
                              {formData.groupSize}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setFormData({ ...formData, groupSize: formData.groupSize + 1 })
                              }
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">ملاحظات إضافية</Label>
                        <Textarea
                          id="notes"
                          placeholder="أخبرنا عن توقعاتك للرحلة..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                        <span className="text-muted-foreground">إجمالي التكلفة</span>
                        <span className="text-2xl font-bold text-primary">{totalPrice} جنيه</span>
                      </div>

                      <Button type="button" className="w-full" size="lg" onClick={() => setStep(2)}>
                        متابعة
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">الاسم الكامل</Label>
                        <Input
                          id="name"
                          placeholder="أدخل اسمك"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">رقم الهاتف</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="01xxxxxxxxx"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">البريد الإلكتروني</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="example@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold mb-3">ملخص الحجز</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المرشد</span>
                          <span>{guideData.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">التاريخ</span>
                          <span>{formData.date}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">المدة</span>
                          <span>{formData.days} يوم</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">عدد الأفراد</span>
                          <span>{formData.groupSize}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2 border-t border-border">
                          <span>الإجمالي</span>
                          <span className="text-primary">{totalPrice} جنيه</span>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" size="lg">
                        تأكيد الحجز
                      </Button>
                    </>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default GuideBookingPage;
