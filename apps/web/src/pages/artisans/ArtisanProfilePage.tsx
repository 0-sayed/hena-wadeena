import { ArrowRight, MapPin, Package, Palette, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Layout } from '@/components/layout/Layout';
import { ProductGrid, WhatsAppButton } from '@/components/artisans';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/motion/Skeleton';
import { useArtisan } from '@/hooks/use-artisans';
import { areaLabels, craftTypeLabels } from '@/lib/artisan-labels';
import { resolveMediaUrl } from '@/lib/media';

function ArtisanHeroImage({ src, alt }: { src: string | null; alt: string }) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasLoadError = resolvedSrc != null && failedSrc === resolvedSrc;

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl bg-muted/40 md:h-80">
      {resolvedSrc && !hasLoadError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="eager"
          onError={() => setFailedSrc(resolvedSrc)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <User className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function ArtisanAvatar({ src, alt }: { src: string | null; alt: string }) {
  const resolvedSrc = resolveMediaUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasLoadError = resolvedSrc != null && failedSrc === resolvedSrc;

  return (
    <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-primary/10">
      {resolvedSrc && !hasLoadError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="eager"
          onError={() => setFailedSrc(resolvedSrc)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <User className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

const ArtisanProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: artisan, isLoading, isError } = useArtisan(id ?? '');

  if (isLoading) {
    return (
      <Layout title="ملف الحرفية">
        <div className="container py-10 space-y-6 px-4">
          <Skeleton h="h-10" className="w-32 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Skeleton h="h-80" className="rounded-xl" />
              <Skeleton h="h-40" className="rounded-2xl" />
              <Skeleton h="h-64" className="rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton h="h-48" className="rounded-2xl" />
              <Skeleton h="h-32" className="rounded-2xl" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !artisan) {
    return (
      <Layout title="ملف الحرفية">
        <div className="container py-20 px-4 text-center space-y-4">
          <h1 className="mb-2 text-2xl font-bold">لم يتم العثور على الحرفية</h1>
          <p className="text-muted-foreground">قد تكون الصفحة غير متاحة أو تم حذفها</p>
          <Button variant="outline" onClick={() => void navigate('/artisans')}>
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            العودة إلى الحرفيات
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={artisan.nameAr}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            العودة
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ArtisanHeroImage src={artisan.profileImageKey} alt={artisan.nameAr} />

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Palette className="h-3.5 w-3.5" />
                      حرفية
                    </div>
                    {artisan.craftTypes.map((type) => (
                      <Badge key={type} variant="secondary">
                        {craftTypeLabels[type] ?? type}
                      </Badge>
                    ))}
                  </div>

                  <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    {artisan.nameAr}
                  </h1>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{areaLabels[artisan.area] ?? artisan.area}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {artisan.bioAr && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">نبذة عن الحرفية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                      {artisan.bioAr}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    المنتجات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductGrid products={artisan.products} />
                </CardContent>
              </Card>
            </div>

            <aside
              aria-label="معلومات التواصل مع الحرفية"
              className="space-y-6 lg:sticky lg:top-20 lg:self-start"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">تواصل مع الحرفية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 py-4 text-center">
                    <ArtisanAvatar src={artisan.profileImageKey} alt={artisan.nameAr} />
                    <p className="font-bold text-foreground">{artisan.nameAr}</p>
                    <p className="text-sm text-muted-foreground">
                      {areaLabels[artisan.area] ?? artisan.area}
                    </p>
                  </div>

                  <WhatsAppButton
                    whatsappNumber={artisan.whatsapp}
                    productName="منتجاتك"
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">تخصصات الحرفية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {artisan.craftTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-sm">
                        {craftTypeLabels[type] ?? type}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ArtisanProfilePage;
