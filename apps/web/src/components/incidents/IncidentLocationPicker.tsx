import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';

import { pickLocalizedCopy } from '@/lib/localization';
import { useAuth } from '@/hooks/use-auth';

// White Desert centre
const DEFAULT_CENTER: [number, number] = [27.3, 28.1];
const DEFAULT_ZOOM = 11;

// Fix bundler icon resolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface IncidentLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

export function IncidentLocationPicker({ lat, lng, onChange }: IncidentLocationPickerProps) {
  const { language } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  function locateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onChange(latitude, longitude);
        mapRef.current?.setView([latitude, longitude], 15);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
      DEFAULT_CENTER,
      DEFAULT_ZOOM,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onChange(clickLat, clickLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Sync marker when lat/lng changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === null || lng === null) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  }, [lat, lng]);

  if (!isClient) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border bg-muted/50">
        <span className="text-sm text-muted-foreground">
          {pickLocalizedCopy(language, { ar: 'جارٍ تحميل الخريطة...', en: 'Loading map...' })}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="isolate overflow-hidden rounded-md border">
        <div className="relative">
          <div ref={containerRef} className="h-56 w-full" dir="ltr" />
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            title={pickLocalizedCopy(language, { ar: 'تحديد موقعي', en: 'Use my location' })}
            className="absolute bottom-10 start-2 z-[1000] flex h-8 w-8 items-center justify-center rounded bg-white shadow-md hover:bg-gray-50 disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            ) : (
              <Crosshair className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {lat !== null && lng !== null
          ? pickLocalizedCopy(language, {
              ar: `الموقع المحدد: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
              en: `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            })
          : pickLocalizedCopy(language, {
              ar: 'اضغط على الخريطة لتحديد الموقع',
              en: 'Tap the map to mark the incident location',
            })}
      </p>
    </div>
  );
}
