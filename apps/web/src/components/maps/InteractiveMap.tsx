import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocation {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  type?: string;
}

interface InteractiveMapProps {
  locations: MapLocation[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (location: MapLocation) => void;
}

// Fix default marker icon (bundlers often fail to resolve these assets)
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export function InteractiveMap({
  locations,
  center = [25.45, 30.55],
  zoom = 8,
  className = 'h-[400px] w-full rounded-xl',
  onMarkerClick,
}: InteractiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

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
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  // Update view when center/zoom changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // Render markers when locations changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    locations.forEach((location) => {
      const marker = L.marker([location.lat, location.lng]);

      const popupHtml = `
        <div style="text-align:center; padding:4px;">
          <div style="font-weight:600; font-size:12px;">${escapeHtml(location.name)}</div>
          ${location.type ? `<div style="font-size:11px; opacity:0.75;">${escapeHtml(location.type)}</div>` : ''}
          ${location.description ? `<div style="font-size:11px; margin-top:4px;">${escapeHtml(location.description)}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(location));
      }
      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, onMarkerClick]);

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
