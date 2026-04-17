import { useState } from 'react';
import { ArrowRight, Image, MapPin, Package, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';

import { Layout } from '@/components/layout/Layout';
import { InquiryForm, WhatsAppButton } from '@/components/artisans';
import { resolveMediaUrl } from '@/lib/media';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useArtisanProduct } from '@/hooks/use-artisans';
import { areaLabels, craftTypeLabels } from '@/lib/artisan-labels';

function formatPrice(piasters: number): string {
  return (piasters / 100).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

function ProductImageGallery({ imageKeys, alt }: { imageKeys: string[]; alt: string }) {
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());

  if (imageKeys.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-muted/40">
        <Image className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const resolved = imageKeys.map((k) => resolveMediaUrl(k));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        {resolved[0] && !failedSrcs.has(resolved[0]) ? (
          <img
            src={resolved[0]}
            alt={alt}
            className="h-64 w-full rounded-xl object-cover md:h-80"
            loading="eager"
            onError={() => setFailedSrcs((prev) => new Set(prev).add(resolved[0]!))}
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl bg-muted/40 md:h-80">
            <Image className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      {resolved.slice(1).map((src, index) =>
        src && !failedSrcs.has(src) ? (
          <img
            key={`${src}-${index}`}
            src={src}
            alt={`${alt} ${index + 2}`}
            className="h-40 w-full rounded-xl object-cover"
            loading="lazy"
            onError={() => setFailedSrcs((prev) => new Set(prev).add(src))}
          />
        ) : (
          <div
            key={`placeholder-${index}`}
            className="flex h-40 items-center justify-center rounded-xl bg-muted/40"
          >
            <Image className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          </div>
        ),
      )}
    </div>
  );
}

const ArtisanProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useArtisanProduct(id ?? '');
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <Layout title="تفاصيل المنتج">
        <div className="container space-y-6 py-10">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout title="تفاصيل المنتج">
        <section className="py-12">
          <div className="container px-4 text-center">
            <h1 className="mb-2 text-2xl font-bold">لم يتم العثور على المنتج</h1>
            <p className="text-muted-foreground">قد تكون الصفحة غير متاحة أو تم حذفها</p>
          </div>
        </section>
      </Layout>
    );
  }

  const { artisan, ...product } = data;
  const resolvedArtisanImage = resolveMediaUrl(artisan.profileImageKey);

  return (
    <Layout title={product.nameAr}>
      <section className="py-8 md:py-12">
        <div className="container px-4">
          <Button variant="ghost" onClick={() => void navigate(-1)} className="mb-6">
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            العودة
          </Button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ProductImageGallery imageKeys={product.imageKeys} alt={product.nameAr} />

              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {craftTypeLabels[product.craftType] ?? product.craftType}
                    </Badge>
                    {!product.available && <Badge variant="destructive">غير متاح</Badge>}
                  </div>
                  <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">
                    {product.nameAr}
                  </h1>
                  {product.nameEn && (
                    <p className="text-lg text-muted-foreground">{product.nameEn}</p>
                  )}
                </CardContent>
              </Card>

              {product.descriptionAr && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">وصف المنتج</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                      {product.descriptionAr}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <aside
              aria-label="ملخص وتواصل المنتج"
              className="space-y-6 lg:sticky lg:top-20 lg:self-start"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 py-4 text-center">
                    <p className="text-sm text-muted-foreground">السعر</p>
                    {product.price !== null ? (
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                    ) : (
                      <p className="text-xl font-semibold text-muted-foreground">سعر تفاوضي</p>
                    )}
                  </div>

                  {product.minOrderQty > 1 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4 text-primary" />
                      <span>الحد الأدنى للطلب: {product.minOrderQty} قطعة</span>
                    </div>
                  )}

                  <WhatsAppButton
                    whatsappNumber={artisan.whatsapp}
                    productName={product.nameAr}
                    className="w-full"
                  />

                  {product.available && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setDialogOpen(true)}
                    >
                      طلب شراء
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">عن الحرفية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link
                    to={`/artisans/${artisan.id}`}
                    className="flex items-center gap-3 transition-opacity hover:opacity-80"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted/40">
                      {resolvedArtisanImage ? (
                        <img
                          src={resolvedArtisanImage}
                          alt={artisan.nameAr}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{artisan.nameAr}</p>
                      {artisan.nameEn && (
                        <p className="text-xs text-muted-foreground">{artisan.nameEn}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{areaLabels[artisan.area] ?? artisan.area}</span>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب شراء — {product.nameAr}</DialogTitle>
          </DialogHeader>
          <InquiryForm
            productId={product.id}
            productName={product.nameAr}
            minOrderQty={product.minOrderQty}
            onSuccess={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ArtisanProductPage;
