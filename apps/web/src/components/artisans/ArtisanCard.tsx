import { MapPin, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import type { ArtisanProfile } from '@/services/api';
import { resolveMediaUrl } from '@/lib/media';
import { areaLabels, craftTypeLabels } from '@/lib/artisan-labels';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface ArtisanCardProps {
  artisan: ArtisanProfile;
}

export function ArtisanCard({ artisan }: ArtisanCardProps) {
  const { language } = useAuth();
  const resolvedImage = resolveMediaUrl(artisan.profileImageKey);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasLoadError = resolvedImage != null && failedSrc === resolvedImage;
  const localizedBioCandidates =
    language === 'en' ? [artisan.bioEn, artisan.bioAr] : [artisan.bioAr, artisan.bioEn];
  const localizedBio = localizedBioCandidates.find(
    (bio) => typeof bio === 'string' && bio.trim().length > 0,
  );

  return (
    <Link to={`/artisans/${artisan.id}`} className="block">
      <Card className="overflow-hidden rounded-2xl border-border/50 hover:border-primary/40 hover-lift cursor-pointer">
        <div className="aspect-[4/3] overflow-hidden bg-muted/40">
          {resolvedImage && !hasLoadError ? (
            <img
              src={resolvedImage}
              alt={artisan.nameAr}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setFailedSrc(resolvedImage)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <User className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? (artisan.nameEn ?? artisan.nameAr) : artisan.nameAr}
            </h2>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{areaLabels[artisan.area] ?? artisan.area}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {artisan.craftTypes.map((type) => (
              <Badge key={type} variant="secondary">
                {craftTypeLabels[type] ?? type}
              </Badge>
            ))}
          </div>

          {localizedBio && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{localizedBio}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
