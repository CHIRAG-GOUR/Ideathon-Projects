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
  emoji: string;
}

interface Props {
  me?: EmergencyLocation | null;
  meLabel?: string;
  trail?: { latitude: number; longitude: number }[];
  points?: MapPoint[];
  /** Brand colours: marker/accuracy and trail. */
  color?: string;
  className?: string;
  follow?: boolean;
  pulse?: boolean;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** OpenStreetMap map (tiles need internet; coordinates are always shown alongside). */
export default function MapView({ me, meLabel = 'You', trail = [], points = [], color = '#6D28D9', className, follow = true, pulse }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>();
  const layer = useRef<L.LayerGroup>();
  const lib = useRef<typeof L>();
  const fitted = useRef(false);
  const [tilesFailed, setTilesFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    import('leaflet').then((mod) => {
      if (dead || !el.current || map.current) return;
      const Lf = (mod.default ?? mod) as typeof L;
      lib.current = Lf;
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: true }).setView([22.5, 79], 4);
      m.attributionControl.setPrefix(false);
      const tiles = Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap', referrerPolicy: 'strict-origin-when-cross-origin' } as L.TileLayerOptions).addTo(m);
      tiles.on('tileerror', () => setTilesFailed(true));
      tiles.on('load', () => setTilesFailed(false));
      Lf.control.zoom({ position: 'bottomright' }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
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

  const draw = () => {
    const Lf = lib.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const bounds: [number, number][] = [];
    if (trail.length > 1) Lf.polyline(trail.map((p) => [p.latitude, p.longitude] as [number, number]), { color, weight: 4, opacity: 0.45, dashArray: '2 8', lineCap: 'round' }).addTo(g);
    for (const p of points) {
      Lf.marker([p.latitude, p.longitude], { icon: Lf.divIcon({ className: '', html: `<div class="sc-pin">${p.emoji}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }) })
        .bindTooltip(esc(p.label), { direction: 'top', offset: [0, -14] })
        .addTo(g);
      bounds.push([p.latitude, p.longitude]);
    }
    if (me) {
      const ll: [number, number] = [me.latitude, me.longitude];
      if (me.accuracy) Lf.circle(ll, { radius: me.accuracy, color, weight: 1, fillColor: color, fillOpacity: 0.12 }).addTo(g);
      Lf.marker(ll, { icon: Lf.divIcon({ className: '', html: `<div class="sc-me${pulse ? ' sc-pulse' : ''}" style="--c:${color}"><span></span></div>`, iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 1000 })
        .bindTooltip(esc(meLabel), { direction: 'top', offset: [0, -12] })
        .addTo(g);
      bounds.push(ll);
    }
    if (!fitted.current || follow) {
      if (bounds.length > 1) m.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });
      else if (bounds.length === 1) m.setView(bounds[0], Math.max(m.getZoom(), 16));
      if (bounds.length) fitted.current = true;
    }
  };
  useEffect(draw, [me, trail, points, follow, color, pulse]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={el} className="h-full w-full" role="region" aria-label="Map" />
      {tilesFailed && <div style={{ position: 'absolute', left: 10, right: 10, top: 10, zIndex: 500, borderRadius: 12, background: 'rgba(255,255,255,.92)', padding: '6px 10px', fontSize: 12, fontWeight: 600 }}>Map tiles need internet. The coordinates shown are still accurate.</div>}
    </div>
  );
}
