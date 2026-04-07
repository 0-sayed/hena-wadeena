import { useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { useCreateRide } from '@/hooks/use-map';
import { AREA_PRESETS, findArea, getAreaDisplayName } from '@/lib/area-presets';
import { pickLocalizedCopy } from '@/lib/localization';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const { language: appLanguage } = useAuth();
  const createRide = useCreateRide();

  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (originId && originId === destId) setDestId('');
  }, [originId, destId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const origin = findArea(originId);
    const dest = findArea(destId);

    if (!origin || !dest) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر نقطة الانطلاق والوجهة',
          en: 'Select both the origin and destination',
        }),
      );
      return;
    }

    if (originId === destId) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'نقطة الانطلاق والوجهة يجب أن تكونا مختلفتين',
          en: 'Origin and destination must be different',
        }),
      );
      return;
    }

    if (!date || !time) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'حدد التاريخ والوقت',
          en: 'Choose the date and time',
        }),
      );
      return;
    }

    const departureTime = new Date(`${date}T${time}`).toISOString();

    if (new Date(departureTime) <= new Date()) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'وقت المغادرة يجب أن يكون في المستقبل',
          en: 'Departure time must be in the future',
        }),
      );
      return;
    }

    createRide.mutate(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        originName: getAreaDisplayName(origin, appLanguage),
        destinationName: getAreaDisplayName(dest, appLanguage),
        departureTime,
        seatsTotal: Number(seats),
        pricePerSeat: Math.round(Number(price) * 100),
        notes: notes || undefined,
      },
      {
        onSuccess: (ride) => {
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم إنشاء الرحلة بنجاح!',
              en: 'Ride created successfully!',
            }),
          );
          void navigate(`/logistics/ride/${ride.id}`);
        },
        onError: (err) => {
          toast.error(
            err.message ||
              pickLocalizedCopy(appLanguage, {
                ar: 'حدث خطأ أثناء إنشاء الرحلة',
                en: 'Something went wrong while creating the ride',
              }),
          );
        },
      },
    );
  };

  return (
    <Layout
      title={pickLocalizedCopy(appLanguage, { ar: 'إنشاء رحلة جديدة', en: 'Create New Ride' })}
    >
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => void navigate('/logistics')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'العودة للخريطة والتنقل',
              en: 'Back to maps & transport',
            })}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'إنشاء رحلة جديدة',
                  en: 'Create a new ride',
                })}
              </CardTitle>
              <p className="text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'شارك رحلتك مع الآخرين ووفر التكلفة',
                  en: 'Share your trip with others and split the cost',
                })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{pickLocalizedCopy(appLanguage, { ar: 'من', en: 'From' })}</Label>
                    <Select value={originId} onValueChange={setOriginId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={pickLocalizedCopy(appLanguage, {
                            ar: 'اختر نقطة الانطلاق',
                            en: 'Select the origin',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {getAreaDisplayName(a, appLanguage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{pickLocalizedCopy(appLanguage, { ar: 'إلى', en: 'To' })}</Label>
                    <Select value={destId} onValueChange={setDestId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={pickLocalizedCopy(appLanguage, {
                            ar: 'اختر الوجهة',
                            en: 'Select the destination',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.filter((a) => a.id !== originId).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {getAreaDisplayName(a, appLanguage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      {pickLocalizedCopy(appLanguage, { ar: 'التاريخ', en: 'Date' })}
                    </Label>
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
                    <Label htmlFor="time">
                      {pickLocalizedCopy(appLanguage, { ar: 'الوقت', en: 'Time' })}
                    </Label>
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
                    <Label htmlFor="seats">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'عدد المقاعد المتاحة',
                        en: 'Available seats',
                      })}
                    </Label>
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
                    <Label htmlFor="price">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'السعر للمقعد (جنيه) — 0 = مجاني',
                        en: 'Price per seat (EGP) - 0 = free',
                      })}
                    </Label>
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
                  <Label htmlFor="notes">
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'ملاحظات إضافية',
                      en: 'Additional notes',
                    })}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={pickLocalizedCopy(appLanguage, {
                      ar: 'أي تفاصيل إضافية عن الرحلة...',
                      en: 'Any extra details about the ride...',
                    })}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={createRide.isPending}>
                  {createRide.isPending
                    ? pickLocalizedCopy(appLanguage, {
                        ar: 'جارٍ الإنشاء...',
                        en: 'Creating...',
                      })
                    : pickLocalizedCopy(appLanguage, {
                        ar: 'نشر الرحلة',
                        en: 'Publish ride',
                      })}
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
