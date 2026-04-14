import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { MapPin, ArrowRight } from 'lucide-react';
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
import { useSuggestPoi } from '@/hooks/use-map';
import { AREA_PRESETS, findArea, getAreaDisplayName } from '@/lib/area-presets';
import { pickLocalizedCopy } from '@/lib/localization';
import type { PoiCategory } from '@/services/api';

const POI_CATEGORIES: { value: PoiCategory; labelAr: string; labelEn: string }[] = [
  { value: 'historical', labelAr: 'تاريخي', labelEn: 'Historical' },
  { value: 'natural', labelAr: 'طبيعي', labelEn: 'Natural' },
  { value: 'religious', labelAr: 'ديني', labelEn: 'Religious' },
  { value: 'recreational', labelAr: 'ترفيهي', labelEn: 'Recreational' },
  { value: 'accommodation', labelAr: 'إقامة', labelEn: 'Accommodation' },
  { value: 'restaurant', labelAr: 'مطعم', labelEn: 'Restaurant' },
  { value: 'service', labelAr: 'خدمات', labelEn: 'Service' },
  { value: 'government', labelAr: 'حكومي', labelEn: 'Government' },
];

const SuggestPoiPage = () => {
  const navigate = useNavigate();
  const { language: appLanguage } = useAuth();
  const suggestPoi = useSuggestPoi();

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<PoiCategory | ''>('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameAr.trim()) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'الاسم بالعربية مطلوب',
          en: 'Arabic name is required',
        }),
      );
      return;
    }

    if (!category) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر تصنيف المكان',
          en: 'Select a category',
        }),
      );
      return;
    }

    const area = findArea(areaId);
    if (!area) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'اختر المنطقة',
          en: 'Select an area',
        }),
      );
      return;
    }

    suggestPoi.mutate(
      {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || undefined,
        category,
        location: { lat: area.lat, lng: area.lng },
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم إرسال الاقتراح بنجاح!',
              en: 'POI suggestion submitted successfully!',
            }),
          );
          void navigate('/logistics');
        },
        onError: (err) => {
          toast.error(
            err.message ||
              pickLocalizedCopy(appLanguage, {
                ar: 'حدث خطأ أثناء إرسال الاقتراح',
                en: 'Something went wrong while submitting the suggestion',
              }),
          );
        },
      },
    );
  };

  return (
    <Layout
      title={pickLocalizedCopy(appLanguage, { ar: 'اقتراح مكان جديد', en: 'Suggest a New Place' })}
    >
      <section className="py-8 md:py-12">
        <div className="container px-4 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => void navigate('/logistics')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {pickLocalizedCopy(appLanguage, {
              ar: 'العودة للخريطة والتنقل',
              en: 'Back to maps & transport',
            })}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'اقتراح مكان جديد',
                  en: 'Suggest a new place',
                })}
              </CardTitle>
              <p className="text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'ساعدنا في إضافة أماكن مميزة في الوادي الجديد',
                  en: 'Help us add remarkable places in the New Valley',
                })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nameAr">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'الاسم بالعربية *',
                        en: 'Arabic Name *',
                      })}
                    </Label>
                    <Input
                      id="nameAr"
                      type="text"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'الاسم بالإنجليزية',
                        en: 'English Name',
                      })}
                    </Label>
                    <Input
                      id="nameEn"
                      type="text"
                      style={{ direction: 'ltr', textAlign: 'left' }}
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {pickLocalizedCopy(appLanguage, { ar: 'التصنيف *', en: 'Category *' })}
                    </Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as PoiCategory)}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={pickLocalizedCopy(appLanguage, {
                            ar: 'اختر التصنيف',
                            en: 'Select a category',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {POI_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {appLanguage === 'en' ? c.labelEn : c.labelAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {pickLocalizedCopy(appLanguage, { ar: 'المنطقة *', en: 'Area *' })}
                    </Label>
                    <Select value={areaId} onValueChange={setAreaId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={pickLocalizedCopy(appLanguage, {
                            ar: 'اختر المنطقة',
                            en: 'Select an area',
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    {pickLocalizedCopy(appLanguage, { ar: 'العنوان', en: 'Address' })}
                  </Label>
                  <Input
                    id="address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {pickLocalizedCopy(appLanguage, { ar: 'رقم الهاتف', en: 'Phone' })}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      style={{ direction: 'ltr', textAlign: 'left' }}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      placeholder="01012345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      {pickLocalizedCopy(appLanguage, { ar: 'الموقع الإلكتروني', en: 'Website' })}
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      style={{ direction: 'ltr', textAlign: 'left' }}
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://www.kharga-city.gov.eg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {pickLocalizedCopy(appLanguage, { ar: 'وصف المكان', en: 'Description' })}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={pickLocalizedCopy(appLanguage, {
                      ar: 'اكتب وصفاً مختصراً عن المكان...',
                      en: 'Write a brief description of the place...',
                    })}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={suggestPoi.isPending}>
                  {suggestPoi.isPending
                    ? pickLocalizedCopy(appLanguage, {
                        ar: 'جارٍ الإرسال...',
                        en: 'Submitting...',
                      })
                    : pickLocalizedCopy(appLanguage, {
                        ar: 'إرسال الاقتراح',
                        en: 'Submit suggestion',
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

export default SuggestPoiPage;
