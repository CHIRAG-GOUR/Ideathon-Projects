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
  kind: 'responder' | 'police' | 'hospital' | 'pharmacy' | 'fire' | 'destination' | 'contact';
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
}

const ICON: Record<MapPoint['kind'], string> = { responder: '🏃‍♀️', contact: '💗', police: '👮‍♀️', hospital: '🏥', pharmacy: '💊', fire: '🚒', destination: '🏠' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** OpenStreetMap map. Without a connection the tiles cannot load; coordinates are always shown next to it. */
export default function MapView({ me, meLabel = 'You', trail = [], points = [], route, onPick, className, follow = true, urgent }: Props) {
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
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: true }).setView([20.59, 78.96], 4);
      const tiles = Lf.tileLayer(process.env.NEXT_PUBLIC_MAP_TILES ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(m);
      tiles.on('tileerror', () => setOffline(true));
      tiles.on('load', () => setOffline(false));
      Lf.control.zoom({ position: 'bottomright' }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      if (onPick) m.on('click', (e: L.LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setTimeout(() => m.invalidateSize(), 50);
      draw();
    });
    return () => {
      dead = true;
      map.current?.remove();
      map.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const Lf = lib.current;
    const m = map.current;
    const g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const bounds: [number, number][] = [];
    if (trail.length > 1) Lf.polyline(trail.map((p) => [p.latitude, p.longitude] as [number, number]), { color: '#F02452', weight: 4, opacity: 0.45, dashArray: '2 8', lineCap: 'round' }).addTo(g);
    if (route && route.length > 1) {
      Lf.polyline(route, { color: '#5B2A4A', weight: 5, opacity: 0.7 }).addTo(g);
      route.forEach((p) => bounds.push(p));
    }
    for (const p of points) {
      Lf.marker([p.latitude, p.longitude], {
        icon: Lf.divIcon({ className: '', html: `<div class="shev-pin shev-${p.kind}" title="${esc(p.label)}">${ICON[p.kind]}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }),
      })
        .bindTooltip(esc(p.label), { direction: 'top', offset: [0, -14] })
        .addTo(g);
      bounds.push([p.latitude, p.longitude]);
    }
    if (me) {
      const ll: [number, number] = [me.latitude, me.longitude];
      if (me.accuracy) Lf.circle(ll, { radius: me.accuracy, color: '#F02452', weight: 1, fillColor: '#F02452', fillOpacity: 0.1 }).addTo(g);
      const arrow = me.heading != null && (me.speed ?? 0) > 0.5 ? `<div class="shev-heading" style="transform:rotate(${me.heading}deg)"></div>` : '';
      Lf.marker(ll, {
        icon: Lf.divIcon({ className: '', html: `<div class="shev-me ${urgent ? 'shev-urgent' : ''}">${arrow}<span></span></div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        zIndexOffset: 1000,
      })
        .bindTooltip(esc(meLabel), { direction: 'top', offset: [0, -12] })
        .addTo(g);
      bounds.push(ll);
    }
    if (!fitted.current || follow) {
      if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      else if (bounds.length === 1) m.setView(bounds[0], Math.max(m.getZoom(), 16));
      if (bounds.length) fitted.current = true;
    }
  };

  useEffect(draw, [me, trail, points, route, follow, urgent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={el} className="h-full w-full" />
      {offline && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-ink-soft shadow-soft">
          Map tiles need internet. Coordinates below are still accurate.
        </div>
      )}
    </div>
  );
}
