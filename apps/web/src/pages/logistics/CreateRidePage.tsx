import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Car, ArrowRight } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCreateRide } from '@/hooks/use-map';
import { AREA_PRESETS, findArea } from '@/lib/area-presets';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const createRide = useCreateRide();

  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('0');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const origin = findArea(originId);
    const dest = findArea(destId);

    if (!origin || !dest) {
      toast.error('اختر نقطة الانطلاق والوجهة');
      return;
    }

    if (originId === destId) {
      toast.error('نقطة الانطلاق والوجهة يجب أن تكونا مختلفتين');
      return;
    }

    if (!date || !time) {
      toast.error('حدد التاريخ والوقت');
      return;
    }

    const departureTime = new Date(`${date}T${time}`).toISOString();

    if (new Date(departureTime) <= new Date()) {
      toast.error('وقت المغادرة يجب أن يكون في المستقبل');
      return;
    }

    createRide.mutate(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        originName: origin.nameAr,
        destinationName: dest.nameAr,
        departureTime,
        seatsTotal: Number(seats),
        pricePerSeat: Math.round(Number(price) * 100),
        notes: notes || undefined,
      },
      {
        onSuccess: (ride) => {
          toast.success('تم إنشاء الرحلة بنجاح!');
          void navigate(`/logistics/ride/${ride.id}`);
        },
        onError: (err) => {
          toast.error(err.message || 'حدث خطأ أثناء إنشاء الرحلة');
        },
      },
    );
  };

  return (
    <Layout>
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => void navigate('/logistics')} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للخريطة والتنقل
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">إنشاء رحلة جديدة</CardTitle>
              <p className="text-muted-foreground">شارك رحلتك مع الآخرين ووفر التكلفة</p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>من</Label>
                    <Select value={originId} onValueChange={setOriginId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نقطة الانطلاق" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>إلى</Label>
                    <Select value={destId} onValueChange={setDestId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الوجهة" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.filter((a) => a.id !== originId).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">التاريخ</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">الوقت</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seats">عدد المقاعد المتاحة</Label>
                    <Input
                      id="seats"
                      type="number"
                      min="1"
                      max="8"
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر للمقعد (جنيه) — 0 = مجاني</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات إضافية</Label>
                  <Textarea
                    id="notes"
                    placeholder="أي تفاصيل إضافية عن الرحلة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={createRide.isPending}>
                  {createRide.isPending ? 'جارٍ الإنشاء...' : 'نشر الرحلة'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default CreateRidePage;
