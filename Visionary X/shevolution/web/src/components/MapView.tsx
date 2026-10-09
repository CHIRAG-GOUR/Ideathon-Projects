'use client';
import { useEffect, useRef, useState } from 'react';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EmergencyLocation } from '@shared/types';

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  kind: 'responder' | 'police' | 'hospital' | 'pharmacy' | 'fire' | 'army' | 'destination' | 'pickup' | 'contact';
}

interface Props {
  me?: EmergencyLocation | null;
  meLabel?: string;
  trail?: { latitude: number; longitude: number }[];
  points?: MapPoint[];
  route?: [number, number][];
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  follow?: boolean;
  urgent?: boolean;
  showRecenter?: boolean;
}

const ICON: Record<MapPoint['kind'], string> = {
  responder: '🏃‍♀️',
  contact: '💗',
  police: '👮‍♀️',
  hospital: '🏥',
  pharmacy: '💊',
  fire: '🚒',
  army: '🪖',
  destination: '🏁',
  pickup: '🟢',
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Modern ride-sharing style map powered by high-speed CartoDB Voyager tiles.
 * Completely free of OpenStreetMap tile usage blocks and Leaflet watermarks.
 */
export default function MapView({
  me,
  meLabel = 'You',
  trail = [],
  points = [],
  route,
  onPick,
  className,
  follow = true,
  urgent,
  showRecenter = true,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>();
  const layer = useRef<L.LayerGroup>();
  const lib = useRef<typeof L>();
  const fitted = useRef(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let dead = false;
    import('leaflet').then((mod) => {
      if (dead || !el.current || map.current) return;
      const Lf = (mod.default ?? mod) as typeof L;
      lib.current = Lf;

      // Attribution control explicitly disabled to remove all leaflet text and watermark
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: false }).setView([20.59, 78.96], 5);

      // Google Maps Street Tiles: Authentic Google Maps styling, high resolution, zero watermarks, zero rate limits
      const tileUrl = process.env.NEXT_PUBLIC_MAP_TILES || 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      const tiles = Lf.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: '0123',
        attribution: '',
      }).addTo(m);

      tiles.on('tileerror', () => {
        // Fallback to Esri World Street Map if Google ever fails
        try {
          Lf.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '',
          }).addTo(m);
        } catch (_) {}
      });
      tiles.on('load', () => setOffline(false));

      Lf.control.zoom({ position: 'bottomright' }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);

      if (onPick) {
        m.on('click', (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng));
      }

      map.current = m;
      setTimeout(() => m.invalidateSize(), 60);
      draw();
    });

    return () => {
      dead = true;
      map.current?.remove();
      map.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recenter = () => {
    const m = map.current;
    if (!m) return;
    if (me) {
      m.flyTo([me.latitude, me.longitude], Math.max(m.getZoom(), 16), { duration: 0.8 });
    } else if (route && route.length > 1) {
      m.fitBounds(route, { padding: [50, 50], maxZoom: 17 });
    }
  };

  const draw = () => {
    const Lf = lib.current;
    const m = map.current;
    const g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const bounds: [number, number][] = [];

    // Prior trail (dots)
    if (trail.length > 1) {
      Lf.polyline(
        trail.map((p) => [p.latitude, p.longitude] as [number, number]),
        { color: '#F02452', weight: 4, opacity: 0.4, dashArray: '2 8', lineCap: 'round' }
      ).addTo(g);
    }

    // Active trip route (Uber / Rapido bold road polyline)
    if (route && route.length > 1) {
      // Outer subtle shadow for depth
      Lf.polyline(route, { color: '#0F172A', weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }).addTo(g);
      // Inner vibrant high-visibility route line
      Lf.polyline(route, { color: '#F02452', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(g);
      route.forEach((p) => bounds.push(p));
    }

    // Markers (Pickup, Destination, Police, Hospital, etc.)
    for (const p of points) {
      const isPickup = p.kind === 'pickup';
      const isDest = p.kind === 'destination';

      let iconHtml = `<div class="shev-pin shev-${p.kind}" title="${esc(p.label)}">${ICON[p.kind] ?? '📍'}</div>`;
      let anchor: [number, number] = [17, 17];
      let size: [number, number] = [34, 34];

      if (isPickup) {
        iconHtml = `<div class="shev-pin shev-pickup flex items-center justify-center font-bold" title="${esc(p.label)}">
          <span class="h-3 w-3 rounded-full bg-white ring-2 ring-emerald-700"></span>
        </div>`;
        size = [36, 36];
        anchor = [18, 18];
      } else if (isDest) {
        iconHtml = `<div class="shev-pin shev-destination flex items-center justify-center text-base" title="${esc(p.label)}">🏁</div>`;
        size = [36, 36];
        anchor = [18, 18];
      }

      Lf.marker([p.latitude, p.longitude], {
        icon: Lf.divIcon({ className: '', html: iconHtml, iconSize: size, iconAnchor: anchor }),
      })
        .bindTooltip(esc(p.label), { direction: 'top', offset: [0, -16] })
        .addTo(g);
      bounds.push([p.latitude, p.longitude]);
    }

    // User's live location marker: Lady Driver on Scooty with live movement & heading
    if (me) {
      const ll: [number, number] = [me.latitude, me.longitude];
      if (me.accuracy) {
        Lf.circle(ll, { radius: me.accuracy, color: '#F02452', weight: 1, fillColor: '#F02452', fillOpacity: 0.08 }).addTo(g);
      }

      const isMoving = (me.speed != null && me.speed > 0.5) || (trail.length > 2);
      const headingDeg = me.heading != null ? me.heading : 0;
      const speedKmh = me.speed ? Math.round(me.speed * 3.6) : null;
      const badgeText = isMoving && speedKmh ? `🛵 ${speedKmh} km/h` : '🛵 You';

      const scootyHtml = `
        <div class="shev-scooty-marker ${isMoving ? 'shev-moving' : ''}">
          <div class="shev-scooty-aura ${urgent ? 'shev-urgent' : ''}"></div>
          <div class="shev-scooty-rotator" style="transform:rotate(${headingDeg}deg)">
            ${isMoving ? '<div class="shev-scooty-beam"></div>' : ''}
            <div class="shev-scooty-icon">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Ground Shadow -->
                <ellipse cx="24" cy="42" rx="15" ry="3.5" fill="rgba(240, 36, 82, 0.3)" />
                
                <!-- Rear & Front Tires -->
                <circle cx="11" cy="37" r="6" fill="#0F172A" stroke="#64748B" stroke-width="2"/>
                <circle cx="11" cy="37" r="2.5" fill="#E2E8F0"/>
                <circle cx="37" cy="37" r="6" fill="#0F172A" stroke="#64748B" stroke-width="2"/>
                <circle cx="37" cy="37" r="2.5" fill="#E2E8F0"/>
                
                <!-- Scooty Chassis (Vibrant Hot Pink) -->
                <path d="M11 37H20L25 31H34L37 37" stroke="#F02452" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 34C14 28 18 26 23 27L28 31H19Z" fill="#F02452"/>
                <path d="M28 31L34 18H38" stroke="#F02452" stroke-width="3.5" stroke-linecap="round"/>
                
                <!-- Handlebar & Headlight -->
                <path d="M33 18H39" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
                <circle cx="37" cy="18" r="2" fill="#FEF08A"/>
                
                <!-- Lady Rider Torso & Arms (Teal Safety Jacket) -->
                <path d="M22 27L25 18L34 18" stroke="#0284C7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
                
                <!-- Ponytail / Hair blowing backward -->
                <path d="M15 13C13 16 16 19 19 17" stroke="#7C2D12" stroke-width="2.5" stroke-linecap="round"/>
                
                <!-- Lady Helmet & Visor -->
                <circle cx="23" cy="13" r="5.5" fill="#E11D48" stroke="#FFFFFF" stroke-width="1.5"/>
                <path d="M25 11C27 12 28 14 27 16H24" fill="#0F172A" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <div class="shev-scooty-badge">${badgeText}</div>
        </div>
      `;

      Lf.marker(ll, {
        icon: Lf.divIcon({ className: '', html: scootyHtml, iconSize: [52, 52], iconAnchor: [26, 26] }),
        zIndexOffset: 1000,
      })
        .bindTooltip(esc(meLabel), { direction: 'top', offset: [0, -22] })
        .addTo(g);
      bounds.push(ll);
    }

    if (!fitted.current || follow) {
      if (bounds.length > 1) {
        m.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
      } else if (bounds.length === 1) {
        m.setView(bounds[0], Math.max(m.getZoom(), 16));
      }
      if (bounds.length) fitted.current = true;
    }
  };

  useEffect(draw, [me, trail, points, route, follow, urgent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={el} className="h-full w-full" />
      {showRecenter && (me || (route && route.length > 0)) && (
        <button
          type="button"
          onClick={recenter}
          title="Recenter Map"
          className="absolute bottom-4 left-4 z-[400] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-ink shadow-md backdrop-blur-sm transition-all hover:bg-white active:scale-95 border border-line"
        >
          <span>🎯</span>
          <span>Recenter</span>
        </button>
      )}
      {offline && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink-soft shadow-soft">
          Map tiles loading. Coordinates below remain accurate.
        </div>
      )}
    </div>
  );
}

