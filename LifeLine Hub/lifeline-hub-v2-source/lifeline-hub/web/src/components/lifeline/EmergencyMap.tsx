'use client';
/** EmergencyMap — OpenStreetMap with LifeLine's own markers (glowing SVG glyphs, pulsing "you", route line). */
import { useEffect, useRef, useState } from 'react';
import type * as L from 'leaflet';
import { KIND_COLOR, KIND_LABEL, fmtEta, fmtKm, type Fix, type RadarPoint } from '@/services/georadar/radar';

const GLYPH: Record<string, string> = {
  hospital: 'M4 21V7l8-4 8 4v14M12 8.5v5M9.5 11h5',
  police: 'M12 3l7 3v5.5c0 4.2-3 7.7-7 9.5-4-1.8-7-5.3-7-9.5V6z',
  fire: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.4 3.6-8.3.5 2 1.6 3.1 2.6 3.6C12 7.3 13.5 5 15.6 3c.2 3.1 2.9 5.6 2.9 10 0 4.2-2.6 8-6.5 8z',
  pharmacy: 'M10.5 20.5a5 5 0 01-7-7l6-6a5 5 0 017 7zM7 10l7 7',
  ambulance: 'M2.5 16V8h10v8M12.5 10h4.2l2.8 3v3h-7M7.5 10v4M5.5 12h4',
  helper: 'M12 21s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 8a4.3 4.3 0 017.5 2.8C19.5 16.4 12 21 12 21z',
  safe: 'M12 3l7.5 3v6c0 4.4-3.1 7.7-7.5 9-4.4-1.3-7.5-4.6-7.5-9V6z',
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function EmergencyMap({ me, points, selected, onSelect, className }: { me: Fix; points: RadarPoint[]; selected?: string | null; onSelect?: (id: string) => void; className?: string }) {
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
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: true }).setView([me.latitude, me.longitude], 14);
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
    return () => { dead = true; map.current?.remove(); map.current = undefined; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draw = () => {
    const Lf = lib.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const me_: [number, number] = [me.latitude, me.longitude];
    const sel = points.find((p) => p.id === selected);
    if (sel) Lf.polyline([me_, [sel.latitude, sel.longitude]], { color: KIND_COLOR[sel.kind], weight: 3, opacity: 0.9, dashArray: '6 8', lineCap: 'round' }).addTo(g);
    for (const p of points) {
      const c = KIND_COLOR[p.kind];
      const html = `<div style="width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:${c}33;border:1.5px solid ${c};box-shadow:0 0 16px ${c}88;${p.id === selected ? 'transform:scale(1.2);' : ''}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${GLYPH[p.kind]}"/></svg></div>`;
      Lf.marker([p.latitude, p.longitude], { icon: Lf.divIcon({ className: '', html, iconSize: [30, 30], iconAnchor: [15, 15] }) })
        .bindTooltip(esc(`${p.name} · ${KIND_LABEL[p.kind]} · ${fmtKm(p.distance)} · ~${fmtEta(p.etaMin)}`), { direction: 'top', offset: [0, -14] })
        .on('click', () => onSelect?.(p.id))
        .addTo(g);
    }
    if (me.accuracy) Lf.circle(me_, { radius: me.accuracy, color: '#0B8A57', weight: 1, fillColor: '#0B8A57', fillOpacity: 0.12 }).addTo(g);
    Lf.marker(me_, { icon: Lf.divIcon({ className: '', html: '<div style="position:relative;width:22px;height:22px"><span style="position:absolute;inset:-10px;border-radius:999px;background:rgba(34,211,238,.25);animation:llp 2s ease-out infinite"></span><span style="position:absolute;inset:0;border-radius:999px;background:#0B8A57;border:3px solid #fff;box-shadow:0 0 18px #0B8A57"></span></div><style>@keyframes llp{from{transform:scale(.4);opacity:1}to{transform:scale(1.6);opacity:0}}</style>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000 })
      .bindTooltip('You', { direction: 'top', offset: [0, -12] }).addTo(g);
    if (!fitted.current && points.length) {
      m.fitBounds([me_, ...points.slice(0, 8).map((p) => [p.latitude, p.longitude] as [number, number])], { padding: [40, 40], maxZoom: 16 });
      fitted.current = true;
    }
  };
  useEffect(draw, [me, points, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div ref={el} className="h-full w-full" role="region" aria-label="Emergency map" />
      {tilesFailed && <div style={{ position: 'absolute', left: 10, right: 10, top: 10, zIndex: 500 }} className="rounded-xl bg-white px-3 py-1.5 text-[12px] font-semibold text-ink">Map tiles need internet. Distances and ETAs are still shown.</div>}
    </div>
  );
}
