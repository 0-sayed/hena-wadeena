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
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useCreateRide } from '@/hooks/use-map';
import { AREA_PRESETS, findArea, getAreaDisplayName } from '@/lib/area-presets';

const CreateRidePage = () => {
  const { t } = useTranslation('logistics');
  const navigate = useNavigate();
  const { language } = useAuth();
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
      toast.error(t('rides.createRide.toasts.selectEndpoints'));
      return;
    }

    if (originId === destId) {
      toast.error(t('rides.createRide.toasts.sameEndpoints'));
      return;
    }

    if (!date || !time) {
      toast.error(t('rides.createRide.toasts.missingDateTime'));
      return;
    }

    const departureTime = new Date(`${date}T${time}`).toISOString();

    if (new Date(departureTime) <= new Date()) {
      toast.error(t('rides.createRide.toasts.futureOnly'));
      return;
    }

    createRide.mutate(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        originName: getAreaDisplayName(origin, (language === 'en' ? 'en' : 'ar')),
        destinationName: getAreaDisplayName(dest, (language === 'en' ? 'en' : 'ar')),
        departureTime,
        seatsTotal: Number(seats),
        pricePerSeat: Math.round(Number(price) * 100),
        notes: notes || undefined,
      },
      {
        onSuccess: (ride) => {
          toast.success(t('rides.createRide.toasts.success'));
          void navigate(`/logistics/ride/${ride.id}`);
        },
        onError: (err) => {
          toast.error(
            err.message || t('rides.createRide.toasts.error')
          );
        },
      },
    );
  };

  return (
    <Layout
      title={t('rides.createRide.title')}
    >
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => void navigate('/logistics')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            {t('rides.createRide.backBtn')}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {t('rides.createRide.cardTitle')}
              </CardTitle>
              <p className="text-muted-foreground">
                {t('rides.createRide.cardSubtitle')}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('rides.createRide.labels.from')}</Label>
                    <Select value={originId} onValueChange={setOriginId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('rides.createRide.placeholders.origin')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {getAreaDisplayName(a, (language === 'en' ? 'en' : 'ar'))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('rides.createRide.labels.to')}</Label>
                    <Select value={destId} onValueChange={setDestId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('rides.createRide.placeholders.destination')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_PRESETS.filter((a) => a.id !== originId).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {getAreaDisplayName(a, (language === 'en' ? 'en' : 'ar'))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      {t('rides.createRide.labels.date')}
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
                      {t('rides.createRide.labels.time')}
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
                      {t('rides.createRide.labels.seats')}
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
                      {t('rides.createRide.labels.price')}
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
                    {t('rides.createRide.labels.notes')}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={t('rides.createRide.placeholders.notes')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={createRide.isPending}>
                  {createRide.isPending
                    ? t('rides.createRide.creating')
                    : t('rides.createRide.publishBtn')}
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
