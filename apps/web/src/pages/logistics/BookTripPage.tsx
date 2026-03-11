import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, MapPin, Calendar, Clock, Users, User, Phone, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Mock trip data
const tripData = {
  id: 1,
  from: 'الخارجة',
  to: 'القاهرة',
  date: '25 يناير 2024',
  time: '7:00 ص',
  seats: 2,
  price: 200,
  driver: 'أحمد محمد',
  driverPhone: '01012345678',
  rating: 4.8,
  carType: 'تويوتا كورولا 2022',
};

const BookTripPage = () => {
  const navigate = useNavigate();
  useParams();
  const [step, setStep] = useState(1);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      toast.success('تم حجز المقعد بنجاح! سيتواصل معك السائق قريباً');
      void navigate('/logistics');
    }
  };

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? void navigate('/logistics') : setStep(1))}
            className="mb-6"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            {step === 1 ? 'العودة للرحلات' : 'العودة للخطوة السابقة'}
          </Button>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">تفاصيل الرحلة</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </div>
              <span className="text-sm font-medium">بيانات الحجز</span>
            </div>
          </div>

          {step === 1 ? (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl">تفاصيل الرحلة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Route */}
                <div className="flex items-center gap-3 text-xl font-semibold">
                  <MapPin className="h-6 w-6 text-primary" />
                  <span>{tripData.from}</span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-180" />
                  <span>{tripData.to}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">التاريخ</span>
                    </div>
                    <span className="font-medium">{tripData.date}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">الوقت</span>
                    </div>
                    <span className="font-medium">{tripData.time}</span>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">معلومات السائق</h4>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tripData.driver}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="text-primary">★ {tripData.rating}</span>
                        <span>•</span>
                        <span>{tripData.carType}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seats Selection */}
                <div className="space-y-3">
                  <Label>عدد المقاعد المطلوبة</Label>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                      disabled={seatsToBook <= 1}
                    >
                      -
                    </Button>
                    <span className="text-2xl font-bold w-12 text-center">{seatsToBook}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setSeatsToBook(Math.min(tripData.seats, seatsToBook + 1))}
                      disabled={seatsToBook >= tripData.seats}
                    >
                      +
                    </Button>
                    <Badge variant="secondary" className="mr-auto">
                      <Users className="h-3 w-3 ml-1" />
                      {tripData.seats} مقاعد متاحة
                    </Badge>
                  </div>
                </div>

                {/* Price */}
                <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-muted-foreground">إجمالي السعر</span>
                  <span className="text-2xl font-bold text-primary">
                    {tripData.price * seatsToBook} جنيه
                  </span>
                </div>

                <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                  متابعة الحجز
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-xl">بيانات الحجز</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="أدخل اسمك الكامل"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
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

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold mb-3">ملخص الحجز</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الرحلة</span>
                      <span>
                        {tripData.from} → {tripData.to}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">التاريخ</span>
                      <span>{tripData.date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المقاعد</span>
                      <span>{seatsToBook}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span>الإجمالي</span>
                      <span className="text-primary">{tripData.price * seatsToBook} جنيه</span>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    تأكيد الحجز
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default BookTripPage;
