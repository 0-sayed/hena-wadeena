import { useMemo, useState } from 'react';
import { Sun, MapPin, Gift } from 'lucide-react';
import { Link } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { InteractiveMap } from '@/components/maps/InteractiveMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBenefits } from '@/hooks/use-benefits';
import { useListings } from '@/hooks/use-listings';
import { usePois } from '@/hooks/use-map';
import { useAuth } from '@/hooks/use-auth';
import { districtLabel } from '@/lib/format';
import { pickLocalizedCopy, pickLocalizedField, type AppLanguage } from '@/lib/localization';
import type { NvDistrict } from '@hena-wadeena/types';
import type { Listing, BenefitInfo } from '@/services/api';

const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {
  residential: { ar: 'سكني', en: 'Residential' },
  agricultural: { ar: 'زراعي', en: 'Agricultural' },
  commercial: { ar: 'تجاري', en: 'Commercial' },
  industrial: { ar: 'صناعي', en: 'Industrial' },
  grid_connected: { ar: 'متصل بالشبكة', en: 'Grid-connected' },
  off_grid: { ar: 'مستقل', en: 'Off-grid' },
};

function serviceLabel(key: string, lang: AppLanguage): string {
  const entry = SERVICE_LABELS[key];
  if (!entry) return key;
  return lang === 'en' ? entry.en : entry.ar;
}

function InstallerCard({ listing, language }: { listing: Listing; language: AppLanguage }) {
  const features = listing.features;
  const nreaCert = features?.['nrea_cert_number'] as string | undefined;
  const services = features?.['services'] as string[] | undefined;

  const title = language === 'en' && listing.titleEn ? listing.titleEn : listing.titleAr;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{title}</CardTitle>
          {nreaCert && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              NREA ✓
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {listing.district && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{districtLabel(listing.district as NvDistrict, language)}</span>
          </div>
        )}
        {services && services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {services.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {serviceLabel(s, language)}
              </Badge>
            ))}
          </div>
        )}
        {nreaCert && (
          <p className="text-xs text-muted-foreground">
            {pickLocalizedCopy(language, { ar: 'شهادة', en: 'Cert' })}: {nreaCert}
          </p>
        )}
        <Link
          to={`/marketplace/ads/${listing.id}`}
          className="block text-sm text-primary hover:underline mt-1"
        >
          {pickLocalizedCopy(language, { ar: 'عرض التفاصيل ←', en: 'View details →' })}
        </Link>
      </CardContent>
    </Card>
  );
}

function SubsidyCard({ benefit, language }: { benefit: BenefitInfo; language: AppLanguage }) {
  const name = language === 'en' && benefit.nameEn ? benefit.nameEn : benefit.nameAr;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">
          {pickLocalizedField(language, {
            ar: benefit.enrollmentNotesAr,
            en: benefit.enrollmentNotesEn,
          })}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SolarPage() {
  const { language: rawLanguage } = useAuth();
  const language: AppLanguage = rawLanguage === 'en' ? 'en' : 'ar';

  const [district, setDistrict] = useState('all');

  const districtOptions = useMemo(() => {
    const all = {
      value: 'all',
      label: pickLocalizedCopy(language, { ar: 'جميع المدن', en: 'All districts' }),
    };
    const districts = (['kharga', 'dakhla', 'farafra', 'baris', 'balat'] as NvDistrict[]).map(
      (id) => ({ value: id, label: districtLabel(id, language) }),
    );
    return [all, ...districts];
  }, [language]);

  const { data: installersData, isLoading: installersLoading } = useListings({
    category: 'solar_installer',
    ...(district !== 'all' ? { district } : {}),
  });
  const { data: installationsData } = usePois({ category: 'solar_installation', limit: 200 });
  const { data: benefitsData } = useBenefits();

  const installers = installersData?.data ?? [];

  const solarBenefits = useMemo(
    () => benefitsData?.filter((b: BenefitInfo) => b.slug.includes('solar')) ?? [],
    [benefitsData],
  );

  const installationLocations = useMemo(
    () =>
      (installationsData?.data ?? []).map((poi) => ({
        id: poi.id,
        name: language === 'en' && poi.nameEn ? poi.nameEn : poi.nameAr,
        lat: poi.location.y,
        lng: poi.location.x,
        description: poi.description ?? undefined,
        type: pickLocalizedCopy(language, { ar: 'منشأة شمسية', en: 'Solar installation' }),
        color: '#f59e0b',
      })),
    [installationsData?.data, language],
  );

  const copy = {
    subtitle: pickLocalizedCopy(language, {
      ar: 'مجتمع الطاقة الشمسية — محافظة الوادي الجديد',
      en: 'Solar Energy Community — New Valley Governorate',
    }),
    tabInstallers: pickLocalizedCopy(language, { ar: 'مزودو الطاقة', en: 'Installers' }),
    tabMap: pickLocalizedCopy(language, { ar: 'خريطة المجتمع', en: 'Community map' }),
    tabSubsidies: pickLocalizedCopy(language, { ar: 'دعم ومنح', en: 'Subsidies' }),
    filterLabel: pickLocalizedCopy(language, { ar: 'المنطقة:', en: 'District:' }),
    noInstallers: pickLocalizedCopy(language, {
      ar: 'لا يوجد مزودون في هذه المنطقة حالياً',
      en: 'No installers found in this district',
    }),
    noSubsidies: pickLocalizedCopy(language, {
      ar: 'لا توجد برامج دعم متاحة حالياً',
      en: 'No subsidy programs available right now',
    }),
    legendInstallation: pickLocalizedCopy(language, {
      ar: 'منشأة شمسية مجتمعية',
      en: 'Community solar installation',
    }),
    nreaNote: pickLocalizedCopy(language, {
      ar: 'للاستفسار عن برامج الطاقة الشمسية: الهيئة الوطنية للطاقة المتجددة (NREA) —',
      en: 'For solar energy program inquiries: National Renewable Energy Authority (NREA) —',
    }),
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sun className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold">
              {pickLocalizedCopy(language, {
                ar: 'خريطة الطاقة الشمسية المجتمعية',
                en: 'Community Solar Energy Map',
              })}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">{copy.subtitle}</p>
        </div>

        <Tabs defaultValue="installers">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="installers" className="flex items-center gap-1">
              <Sun className="h-4 w-4" />
              {copy.tabInstallers}
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {copy.tabMap}
            </TabsTrigger>
            <TabsTrigger value="subsidies" className="flex items-center gap-1">
              <Gift className="h-4 w-4" />
              {copy.tabSubsidies}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installers">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-medium shrink-0">{copy.filterLabel}</span>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {districtOptions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {installersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} data-testid="skeleton" className="h-40 rounded-xl" />
                ))}
              </div>
            ) : installers.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">{copy.noInstallers}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {installers.map((listing: Listing) => (
                  <InstallerCard key={listing.id} listing={listing} language={language} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            <div className="space-y-4">
              <InteractiveMap
                locations={installationLocations}
                center={[25.7, 29.5]}
                zoom={7}
                className="h-[500px] w-full rounded-xl"
                showGoogleMapsButton={false}
              />

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow" />
                  <span>{copy.legendInstallation}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subsidies">
            {solarBenefits.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">{copy.noSubsidies}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {solarBenefits.map((benefit: BenefitInfo) => (
                  <SubsidyCard key={benefit.id} benefit={benefit} language={language} />
                ))}
              </div>
            )}
            <div className="mt-6 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground text-center">
                {copy.nreaNote}{' '}
                <a
                  href="https://www.nrea.gov.eg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  nrea.gov.eg
                </a>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
