import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowRight, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { IncidentLocationPicker } from '@/components/incidents/IncidentLocationPicker';
import { useAuth } from '@/hooks/use-auth';
import { useReportIncident } from '@/hooks/use-incidents';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, compressImage } from '@/lib/upload';
import { pickLocalizedCopy } from '@/lib/localization';
import { incidentsAPI } from '@/services/api';
import type { IncidentType } from '@/services/api';

const INCIDENT_TYPES: { value: IncidentType; labelAr: string; labelEn: string }[] = [
  { value: 'litter', labelAr: 'نفايات', labelEn: 'Litter' },
  { value: 'illegal_dumping', labelAr: 'إلقاء غير مشروع', labelEn: 'Illegal Dumping' },
  { value: 'vehicle_damage', labelAr: 'أضرار مركبات', labelEn: 'Vehicle Damage' },
  { value: 'fire_remains', labelAr: 'بقايا حرائق', labelEn: 'Fire Remains' },
  { value: 'vandalism', labelAr: 'تخريب', labelEn: 'Vandalism' },
];

export default function ReportIncidentPage() {
  const navigate = useNavigate();
  const { language: appLanguage } = useAuth();
  const reportIncident = useReportIncident();

  const [incidentType, setIncidentType] = useState<IncidentType | ''>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = reportIncident.isPending || uploadingPhotos;

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) {
      toast.error(
        pickLocalizedCopy(appLanguage, { ar: 'الحد الأقصى 5 صور', en: 'Maximum 5 photos' }),
      );
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    for (const file of selected) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error(
          pickLocalizedCopy(appLanguage, { ar: 'نوع ملف غير مدعوم', en: 'Unsupported file type' }),
        );
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(
          pickLocalizedCopy(appLanguage, { ar: 'حجم الصورة كبير جداً', en: 'Image too large' }),
        );
        return;
      }
    }
    setUploadingPhotos(true);
    try {
      const s3Urls = await Promise.all(
        selected.map(async (file) => {
          const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1200 });
          const { uploadUrl } = await incidentsAPI.getUploadUrl({
            filename: compressed.name,
            contentType: compressed.type,
          });
          const res = await fetch(uploadUrl, {
            method: 'PUT',
            body: compressed,
            headers: { 'Content-Type': compressed.type },
            signal: AbortSignal.timeout(30_000),
          });
          if (!res.ok) throw new Error(`S3 ${res.status}`);
          return uploadUrl.split('?')[0];
        }),
      );
      setPhotos((prev) => [...prev, ...s3Urls]);
    } catch {
      toast.error(
        pickLocalizedCopy(appLanguage, { ar: 'تعذر رفع الصور', en: 'Failed to upload images' }),
      );
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      if (uploadingPhotos) {
        toast.error(
          pickLocalizedCopy(appLanguage, {
            ar: 'انتظر حتى يكتمل رفع الصور',
            en: 'Please wait for photos to finish uploading',
          }),
        );
      }
      return;
    }

    if (!incidentType) {
      toast.error(
        pickLocalizedCopy(appLanguage, { ar: 'اختر نوع الحادثة', en: 'Select incident type' }),
      );
      return;
    }

    if (latitude === null || longitude === null) {
      toast.error(
        pickLocalizedCopy(appLanguage, {
          ar: 'حدد الموقع على الخريطة',
          en: 'Mark the location on the map',
        }),
      );
      return;
    }

    const trimmedDescription = description.trim();

    reportIncident.mutate(
      {
        incidentType,
        latitude,
        longitude,
        descriptionAr: appLanguage === 'ar' ? trimmedDescription || undefined : undefined,
        descriptionEn: appLanguage === 'en' ? trimmedDescription || undefined : undefined,
        photos: photos.length > 0 ? photos : undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            pickLocalizedCopy(appLanguage, {
              ar: 'تم إرسال البلاغ بنجاح',
              en: 'Incident reported successfully',
            }),
          );
          void navigate('/incidents/mine');
        },
        onError: (err) => {
          const fallbackMessage = pickLocalizedCopy(appLanguage, {
            ar: 'حدث خطأ أثناء إرسال البلاغ',
            en: 'Something went wrong',
          });

          toast.error(
            err instanceof Error && err.message.length > 0 ? err.message : fallbackMessage,
          );
        },
      },
    );
  };

  return (
    <Layout
      title={pickLocalizedCopy(appLanguage, {
        ar: 'الإبلاغ عن حادثة بيئية',
        en: 'Report an Environmental Incident',
      })}
    >
      <section className="py-8 md:py-12">
        <div className="container max-w-2xl px-4">
          <Button
            variant="ghost"
            onClick={() => void navigate('/incidents/mine')}
            className="mb-6 gap-2"
          >
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {pickLocalizedCopy(appLanguage, { ar: 'بلاغاتي', en: 'My Incidents' })}
          </Button>

          <Card className="border-border/50">
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'الإبلاغ عن حادثة بيئية',
                  en: 'Report an Environmental Incident',
                })}
              </CardTitle>
              <p className="text-muted-foreground">
                {pickLocalizedCopy(appLanguage, {
                  ar: 'ساعدنا في حماية الصحراء البيضاء من خلال الإبلاغ عن الحوادث البيئية',
                  en: 'Help protect the White Desert by reporting environmental incidents',
                })}
              </p>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>
                    {pickLocalizedCopy(appLanguage, { ar: 'نوع الحادثة *', en: 'Incident Type *' })}
                  </Label>
                  <Select
                    value={incidentType}
                    onValueChange={(v) => setIncidentType(v as IncidentType)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={pickLocalizedCopy(appLanguage, {
                          ar: 'اختر نوع الحادثة',
                          en: 'Select incident type',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {appLanguage === 'en' ? t.labelEn : t.labelAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {pickLocalizedCopy(appLanguage, {
                      ar: 'الموقع على الخريطة *',
                      en: 'Location *',
                    })}
                  </Label>
                  <IncidentLocationPicker
                    lat={latitude}
                    lng={longitude}
                    onChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {pickLocalizedCopy(appLanguage, { ar: 'الوصف', en: 'Description' })}
                  </Label>
                  <Textarea
                    id="description"
                    dir={appLanguage === 'en' ? 'ltr' : 'rtl'}
                    rows={3}
                    maxLength={2000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={pickLocalizedCopy(appLanguage, {
                      ar: 'صف الحادثة بالتفصيل...',
                      en: 'Describe the incident...',
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label>
                      {pickLocalizedCopy(appLanguage, { ar: 'صور الحادثة', en: 'Incident Photos' })}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pickLocalizedCopy(appLanguage, {
                        ar: 'حتى 5 صور. JPG أو PNG أو WebP، حتى 5 ميجابايت لكل صورة.',
                        en: 'Up to 5 photos. JPG, PNG or WebP, max 5 MB each.',
                      })}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => void handleImageFiles(e.target.files)}
                  />

                  <div className="rounded-md border border-dashed bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {photos.map((src, i) => (
                        <div
                          key={i}
                          className="relative aspect-square overflow-hidden rounded-md border bg-background"
                        >
                          <img
                            src={src}
                            alt={pickLocalizedCopy(appLanguage, {
                              ar: `معاينة الصورة ${i + 1}`,
                              en: `Photo preview ${i + 1}`,
                            })}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="absolute start-2 top-2 h-7 w-7 bg-background/90 hover:bg-background"
                            aria-label={pickLocalizedCopy(appLanguage, {
                              ar: `إزالة الصورة ${i + 1}`,
                              en: `Remove photo ${i + 1}`,
                            })}
                            onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      {photos.length < 5 && (
                        <button
                          type="button"
                          disabled={uploadingPhotos}
                          className="flex aspect-square min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/70 p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus className="h-7 w-7" />
                          {uploadingPhotos
                            ? pickLocalizedCopy(appLanguage, {
                                ar: 'جارٍ المعالجة...',
                                en: 'Processing...',
                              })
                            : pickLocalizedCopy(appLanguage, {
                                ar: photos.length > 0 ? 'إضافة صور' : 'اختيار صور',
                                en: photos.length > 0 ? 'Add Photos' : 'Select Photos',
                              })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {reportIncident.isPending
                    ? pickLocalizedCopy(appLanguage, { ar: 'جارٍ الإرسال...', en: 'Submitting...' })
                    : uploadingPhotos
                      ? pickLocalizedCopy(appLanguage, {
                          ar: 'جارٍ رفع الصور...',
                          en: 'Uploading photos...',
                        })
                    : pickLocalizedCopy(appLanguage, {
                        ar: 'إرسال البلاغ',
                        en: 'Submit Report',
                      })}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
