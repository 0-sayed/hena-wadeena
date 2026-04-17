import { Image, Package } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import type { ArtisanProduct } from '@/services/api';
import { resolveMediaUrl } from '@/lib/media';
import { craftTypeLabels } from '@/lib/artisan-labels';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface ProductCardProps {
  product: ArtisanProduct;
}

function formatPrice(piasters: number | null): string {
  if (piasters === null) return 'سعر تفاوضي';
  return (piasters / 100).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

function ProductImage({ src, alt }: { src: string | undefined; alt: string }) {
  const resolvedSrc = resolveMediaUrl(src ?? null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasLoadError = resolvedSrc != null && failedSrc === resolvedSrc;

  return (
    <div className="aspect-[4/3] overflow-hidden bg-muted">
      {resolvedSrc && !hasLoadError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedSrc(resolvedSrc)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Image className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/artisans/products/${product.id}`} className="block">
      <Card className="overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift cursor-pointer">
        <ProductImage src={product.imageKeys[0]} alt={product.nameAr} />
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-foreground">{product.nameAr}</h2>
              {product.nameEn && (
                <p className="truncate text-sm text-muted-foreground">{product.nameEn}</p>
              )}
            </div>
            <Badge variant="secondary" className="shrink-0">
              {craftTypeLabels[product.craftType] ?? product.craftType}
            </Badge>
          </div>

          {product.descriptionAr && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{product.descriptionAr}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <span
              className={
                product.price !== null
                  ? 'text-lg font-semibold text-primary'
                  : 'text-sm text-muted-foreground'
              }
            >
              {formatPrice(product.price)}
            </span>

            {product.minOrderQty > 1 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                الحد الأدنى: {product.minOrderQty}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
