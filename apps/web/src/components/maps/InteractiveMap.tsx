import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { buildGoogleMapsLocationUrl } from '@/lib/maps';

export interface MapLocation {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  type?: string;
  color?: string;
  image?: string;
}

export interface MapPolyline {
  positions: [number, number][];
  color?: string;
  dashArray?: string;
}

export type MapPopupTrigger = 'click' | 'hover' | 'both';

interface InteractiveMapProps {
  locations: MapLocation[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (location: MapLocation) => void;
  fitBounds?: boolean;
  polylines?: MapPolyline[];
  googleMapsUrl?: string;
  showGoogleMapsButton?: boolean;
  popupTrigger?: MapPopupTrigger;
}

// Fix default marker icon (bundlers often fail to resolve these assets)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const coloredIconCache = new Map<string, L.DivIcon>();

function createColoredIcon(color: string): L.DivIcon {
  const cached = coloredIconCache.get(color);
  if (cached) return cached;

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
  coloredIconCache.set(color, icon);
  return icon;
}

export function InteractiveMap({
  locations,
  center = [25.45, 30.55],
  zoom = 8,
  className = 'h-[400px] w-full rounded-xl',
  onMarkerClick,
  fitBounds = false,
  polylines,
  googleMapsUrl,
  showGoogleMapsButton = true,
  popupTrigger = 'click',
}: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapReady, setMapReady] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const lastFitSignatureRef = useRef<string | null>(null);

  const normalizedClassName = useMemo(() => className ?? '', [className]);
  const locationsSignature = useMemo(
    () =>
      locations
        .map((location) =>
          [
            location.id,
            location.lat,
            location.lng,
            location.name,
            location.type ?? '',
            location.description ?? '',
            location.color ?? '',
            location.image ?? '',
          ].join(':'),
        )
        .join('|'),
    [locations],
  );
  const resolvedGoogleMapsUrl = useMemo(() => {
    if (googleMapsUrl) return googleMapsUrl;
    const primaryLocation = locations[0];
    if (primaryLocation) {
      return buildGoogleMapsLocationUrl(primaryLocation.lat, primaryLocation.lng);
    }
    return buildGoogleMapsLocationUrl(center[0], center[1]);
  }, [center, googleMapsUrl, locations]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: true,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    polylinesLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady((value) => value + 1);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      polylinesLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  useEffect(() => {
    if (!mapRef.current || fitBounds) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom, fitBounds]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    locations.forEach((location) => {
      const icon = location.color ? createColoredIcon(location.color) : new L.Icon.Default();
      const marker = L.marker([location.lat, location.lng], { icon });

      const popupHtml = `
        <div style="direction:rtl; text-align:center; padding:4px; width:min(220px, calc(100vw - 48px)); max-width:min(220px, calc(100vw - 48px)); box-sizing:border-box; white-space:normal; overflow-wrap:anywhere; word-break:break-word; line-height:1.45;">
          ${location.image ? `<img src="${escapeHtml(location.image)}" alt="" style="display:block; width:100%; height:80px; object-fit:cover; border-radius:6px; margin-bottom:6px;" />` : ''}
          <div style="font-weight:600; font-size:12px;">${escapeHtml(location.name)}</div>
          ${location.type ? `<div style="font-size:11px; opacity:0.75;">${escapeHtml(location.type)}</div>` : ''}
          ${location.description ? `<div style="font-size:11px; margin-top:4px; white-space:normal; text-align:start;">${escapeHtml(location.description)}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml, {
        autoPan: true,
        keepInView: true,
        maxWidth: 260,
        minWidth: 220,
      });

      if (popupTrigger === 'hover' || popupTrigger === 'both') {
        marker.on('mouseover', () => marker.openPopup());
        marker.on('mouseout', () => marker.closePopup());
      }

      if (popupTrigger === 'hover') {
        marker.off('click');
      }

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(location));
      }

      marker.addTo(markersLayerRef.current!);
    });

    if (!fitBounds || locations.length === 0 || !mapRef.current) {
      if (!fitBounds || locations.length === 0) {
        lastFitSignatureRef.current = null;
      }
      return;
    }

    if (lastFitSignatureRef.current !== locationsSignature) {
      const bounds = L.latLngBounds(locations.map((location) => [location.lat, location.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      lastFitSignatureRef.current = locationsSignature;
    }
  }, [fitBounds, locations, locationsSignature, mapReady, onMarkerClick, popupTrigger]);

  useEffect(() => {
    if (!mapRef.current || !polylinesLayerRef.current) return;

    polylinesLayerRef.current.clearLayers();

    polylines?.forEach((polyline) => {
      const line = L.polyline(polyline.positions, {
        color: polyline.color ?? '#3b82f6',
        weight: 3,
        dashArray: polyline.dashArray ?? '8 8',
        opacity: 0.7,
      });
      line.addTo(polylinesLayerRef.current!);
    });
  }, [polylines, mapReady]);

  const googleMapsButton = (
    <div className="ms-auto flex w-full justify-end">
      <Button variant="outline" size="sm" className="shadow-sm" asChild>
        <a href={resolvedGoogleMapsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          Open in Google Maps
        </a>
      </Button>
    </div>
  );

  if (!isClient) {
    return (
      <div className="space-y-3">
        <div className={`${normalizedClassName} bg-muted/50 flex items-center justify-center`}>
          <span className="text-muted-foreground">جارٍ تحميل الخريطة...</span>
        </div>
        {showGoogleMapsButton ? googleMapsButton : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="isolate">
        <div ref={mapContainerRef} className={normalizedClassName} dir="ltr" />
      </div>
      {showGoogleMapsButton ? googleMapsButton : null}
    </div>
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
