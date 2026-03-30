import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface InteractiveMapProps {
  locations: MapLocation[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (location: MapLocation) => void;
  fitBounds?: boolean;
  polylines?: MapPolyline[];
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
}: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapReady, setMapReady] = useState(0); // Increments when map is (re)created
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);

  const normalizedClassName = useMemo(() => className ?? '', [className]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create map instance once (client only)
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
    setMapReady((n) => n + 1); // Signal that map is ready for markers

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      polylinesLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Update view when center/zoom changes (only if not fitting bounds)
  useEffect(() => {
    if (!mapRef.current || fitBounds) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom, fitBounds]);

  // Render markers when locations change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    locations.forEach((location) => {
      const icon = location.color ? createColoredIcon(location.color) : new L.Icon.Default();

      const marker = L.marker([location.lat, location.lng], { icon });

      const tooltipHtml = `
        <div style="text-align:center; padding:4px; max-width:220px;">
          ${location.image ? `<img src="${escapeHtml(location.image)}" alt="" style="width:100%; height:80px; object-fit:cover; border-radius:6px; margin-bottom:6px;" />` : ''}
          <div style="font-weight:600; font-size:12px;">${escapeHtml(location.name)}</div>
          ${location.type ? `<div style="font-size:11px; opacity:0.75;">${escapeHtml(location.type)}</div>` : ''}
          ${location.description ? `<div style="font-size:11px; margin-top:4px;">${escapeHtml(location.description)}</div>` : ''}
        </div>
      `;

      marker.bindTooltip(tooltipHtml, {
        direction: 'top',
        offset: [0, -10],
        className: 'leaflet-tooltip-custom',
      });
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(location));
      }
      marker.addTo(markersLayerRef.current!);
    });

    // Auto-fit bounds if enabled and there are locations
    if (fitBounds && locations.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [locations, onMarkerClick, fitBounds, mapReady]);

  // Render polylines
  useEffect(() => {
    if (!mapRef.current || !polylinesLayerRef.current) return;
    polylinesLayerRef.current.clearLayers();

    polylines?.forEach((pl) => {
      const line = L.polyline(pl.positions, {
        color: pl.color ?? '#3b82f6',
        weight: 3,
        dashArray: pl.dashArray ?? '8 8',
        opacity: 0.7,
      });
      line.addTo(polylinesLayerRef.current!);
    });
  }, [polylines, mapReady]);

  if (!isClient) {
    return (
      <div className={`${normalizedClassName} bg-muted/50 flex items-center justify-center`}>
        <span className="text-muted-foreground">جاري تحميل الخريطة...</span>
      </div>
    );
  }

  return <div ref={mapContainerRef} className={normalizedClassName} />;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
