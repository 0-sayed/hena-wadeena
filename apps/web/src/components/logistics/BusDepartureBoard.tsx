import { useMemo, useState } from 'react';
import { Bus, Clock, MapPin, Phone, RefreshCw } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { pickLocalizedCopy } from '@/lib/localization';
import { LtrText } from '@/components/ui/ltr-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RouteStatus = 'on_time' | 'delayed' | 'boarding' | 'departed';

type BusStopEta = {
  stop: string;
  eta: string;
};

type BusDepartureRoute = {
  id: string;
  routeName: string;
  direction: string;
  stationName: string;
  phone: string;
  whatsapp: string;
  nextDeparture: string;
  lastDeparted: string;
  status: RouteStatus;
  stops: BusStopEta[];
};

const BUS_ROUTES: BusDepartureRoute[] = [
  {
    id: 'kharga',
    routeName: 'الخارجة',
    direction: 'محطة الخارجة الرئيسية -> باريس -> بلاط',
    stationName: 'موقف الخارجة الرئيسي',
    phone: '+20927920000',
    whatsapp: '+201001112222',
    nextDeparture: '07:30 صباحا',
    lastDeparted: '06:15 صباحا',
    status: 'boarding',
    stops: [
      { stop: 'باريس', eta: '55 دقيقة' },
      { stop: 'بلاط', eta: 'ساعتان و10 دقائق' },
    ],
  },
  {
    id: 'dakhla',
    routeName: 'الداخلة',
    direction: 'الخارجة -> موط -> القصر',
    stationName: 'موقف الخارجة الرئيسي',
    phone: '+20927920000',
    whatsapp: '+201001112222',
    nextDeparture: '08:00 صباحا',
    lastDeparted: '05:45 صباحا',
    status: 'on_time',
    stops: [
      { stop: 'موط', eta: '3 ساعات' },
      { stop: 'القصر', eta: '3 ساعات و35 دقيقة' },
    ],
  },
  {
    id: 'farafra',
    routeName: 'الفرافرة',
    direction: 'الداخلة -> الفرافرة',
    stationName: 'موقف الداخلة',
    phone: '+20927830000',
    whatsapp: '+201001113333',
    nextDeparture: '09:15 صباحا',
    lastDeparted: '06:30 صباحا',
    status: 'delayed',
    stops: [
      { stop: 'أبو منقار', eta: 'ساعتان' },
      { stop: 'الفرافرة', eta: '3 ساعات و20 دقيقة' },
    ],
  },
  {
    id: 'bahariya',
    routeName: 'البحرية',
    direction: 'الفرافرة -> البحرية',
    stationName: 'موقف الفرافرة',
    phone: '+20927840000',
    whatsapp: '+201001114444',
    nextDeparture: '10:30 صباحا',
    lastDeparted: '07:00 صباحا',
    status: 'on_time',
    stops: [
      { stop: 'الصحراء البيضاء', eta: '45 دقيقة' },
      { stop: 'البحرية', eta: '4 ساعات' },
    ],
  },
  {
    id: 'cairo',
    routeName: 'القاهرة',
    direction: 'الخارجة -> أسيوط -> القاهرة',
    stationName: 'موقف الخارجة الرئيسي',
    phone: '+20927920000',
    whatsapp: '+201001112222',
    nextDeparture: '11:00 مساء',
    lastDeparted: '02:00 مساء',
    status: 'departed',
    stops: [
      { stop: 'أسيوط', eta: '3 ساعات و30 دقيقة' },
      { stop: 'القاهرة', eta: '8 ساعات' },
    ],
  },
];

const statusLabels: Record<RouteStatus, { ar: string; en: string; className: string }> = {
  on_time: { ar: 'في الموعد', en: 'On time', className: 'bg-emerald-100 text-emerald-800' },
  delayed: { ar: 'متأخرة', en: 'Delayed', className: 'bg-amber-100 text-amber-800' },
  boarding: { ar: 'جاري الصعود', en: 'Boarding', className: 'bg-blue-100 text-blue-800' },
  departed: { ar: 'غادرت', en: 'Departed', className: 'bg-slate-100 text-slate-800' },
};

const buildWhatsAppUrl = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

export function BusDepartureBoard() {
  const { language: appLanguage } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [selectedStop, setSelectedStop] = useState('all');
  const routeFilterLabel = pickLocalizedCopy(appLanguage, {
    ar: 'اختر الخط',
    en: 'Choose route',
  });
  const stopFilterLabel = pickLocalizedCopy(appLanguage, {
    ar: 'اختر المحطة',
    en: 'Choose stop',
  });

  const stopOptions = useMemo(
    () => Array.from(new Set(BUS_ROUTES.flatMap((route) => route.stops.map((stop) => stop.stop)))),
    [],
  );

  const filteredRoutes = useMemo(
    () =>
      BUS_ROUTES.filter((route) => {
        const matchesRoute = selectedRoute === 'all' || route.id === selectedRoute;
        const matchesStop =
          selectedStop === 'all' || route.stops.some((stop) => stop.stop === selectedStop);

        return matchesRoute && matchesStop;
      }),
    [selectedRoute, selectedStop],
  );

  const hasActiveFilters = selectedRoute !== 'all' || selectedStop !== 'all';
  const primaryStation = BUS_ROUTES[0];
  const primaryStationWhatsAppUrl = buildWhatsAppUrl(primaryStation.whatsapp);

  const clearFilters = () => {
    setSelectedRoute('all');
    setSelectedStop('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'وصّلني وادينا لايت',
              en: 'Wadeena Connects You Lite',
            })}
          </h3>
          <p className="text-muted-foreground">
            {pickLocalizedCopy(appLanguage, {
              ar: 'لوحة مواعيد ثابتة لأقرب خطوط الحافلات بين مراكز الوادي الجديد ومحطات الربط الرئيسية.',
              en: 'A static departure board for key bus routes across New Valley and major connection stations.',
            })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          <Button asChild variant="outline">
            <a href={`tel:${primaryStation.phone}`}>
              <Phone className="ms-2 h-4 w-4" />
              <span>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'اتصال',
                  en: 'Call',
                })}
              </span>
              <LtrText>{primaryStation.phone}</LtrText>
            </a>
          </Button>
          <Button asChild>
            <a href={primaryStationWhatsAppUrl} target="_blank" rel="noopener noreferrer">
              <Phone className="ms-2 h-4 w-4" />
              <span>
                {pickLocalizedCopy(appLanguage, {
                  ar: 'واتساب',
                  en: 'WhatsApp',
                })}
              </span>
              <LtrText>{primaryStation.whatsapp}</LtrText>
            </a>
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4" />
              {pickLocalizedCopy(appLanguage, {
                ar: 'مسح الفلاتر',
                en: 'Clear filters',
              })}
            </Button>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 shadow-lg md:p-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{routeFilterLabel}</p>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger aria-label={routeFilterLabel}>
                <SelectValue placeholder={routeFilterLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'كل الخطوط',
                    en: 'All routes',
                  })}
                </SelectItem>
                {BUS_ROUTES.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.routeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{stopFilterLabel}</p>
            <Select value={selectedStop} onValueChange={setSelectedStop}>
              <SelectTrigger aria-label={stopFilterLabel}>
                <SelectValue placeholder={stopFilterLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {pickLocalizedCopy(appLanguage, {
                    ar: 'كل المحطات',
                    en: 'All stops',
                  })}
                </SelectItem>
                {stopOptions.map((stop) => (
                  <SelectItem key={stop} value={stop}>
                    {stop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredRoutes.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-14 text-center">
            <Bus className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {pickLocalizedCopy(appLanguage, {
                ar: 'لا توجد خطوط مطابقة للفلاتر الحالية.',
                en: 'No routes match the current filters.',
              })}
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4" />
              {pickLocalizedCopy(appLanguage, {
                ar: 'عرض كل الخطوط',
                en: 'Show all routes',
              })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {filteredRoutes.map((route) => {
            const status = statusLabels[route.status];
            const whatsappUrl = buildWhatsAppUrl(route.whatsapp);

            return (
              <Card key={route.id} className="rounded-2xl border-border/60">
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bus className="h-5 w-5 text-primary" />
                        <h4 className="text-lg font-bold text-foreground">{route.routeName}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.direction}</p>
                    </div>
                    <Badge className={status.className}>
                      {pickLocalizedCopy(appLanguage, {
                        ar: status.ar,
                        en: status.en,
                      })}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'المغادرة القادمة',
                          en: 'Next departure',
                        })}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        {route.nextDeparture}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'آخر رحلة غادرت',
                          en: 'Last departed',
                        })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {route.lastDeparted}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {pickLocalizedCopy(appLanguage, {
                          ar: 'الموقف',
                          en: 'Station',
                        })}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        {route.stationName}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'الوصول المتوقع للمحطات',
                        en: 'Stop ETAs',
                      })}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {route.stops.map((stop) => (
                        <div
                          key={`${route.id}-${stop.stop}`}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-foreground">{stop.stop}</span>
                          <span className="text-muted-foreground">{stop.eta}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 border-t pt-4">
                    <Button asChild variant="outline" className="flex-1">
                      <a href={`tel:${route.phone}`}>
                        <Phone className="ms-2 h-4 w-4" />
                        <span>
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'اتصال',
                            en: 'Call',
                          })}
                        </span>
                        <LtrText>{route.phone}</LtrText>
                      </a>
                    </Button>
                    <Button asChild className="flex-1">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Phone className="ms-2 h-4 w-4" />
                        <span>
                          {pickLocalizedCopy(appLanguage, {
                            ar: 'واتساب',
                            en: 'WhatsApp',
                          })}
                        </span>
                        <LtrText>{route.whatsapp}</LtrText>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
