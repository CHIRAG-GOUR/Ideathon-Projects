'use client';

import { useEffect, useRef } from 'react';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { SEVERITY } from '@/lib/meta';
import type { Severity } from '@/types';

export interface HazardMarker {
  id: string;
  lat: number;
  lon: number;
  severity: Severity;
  source: 'vehicle' | 'citizen';
  popup?: string; // trusted HTML built by us (values escaped)
}

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  hazards?: HazardMarker[];
  cluster?: boolean;
  user?: { lat: number; lon: number; accuracy: number | null } | null;
  pin?: { lat: number; lon: number } | null;
  onPinMove?: (lat: number, lon: number) => void;
  /** Tap on the map to place the pin (manual placement). */
  placeOnClick?: boolean;
  vehicles?: { id: string; lat: number; lon: number; name: string }[];
  onHazardClick?: (id: string) => void;
  className?: string;
  fitToHazards?: boolean;
}

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Leaflet map (client only). One component for the report pin, the public map and the dashboard. */
export default function MapView(props: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layers = useRef<{ hazards?: Leaflet.LayerGroup; user?: Leaflet.LayerGroup; pin?: Leaflet.Marker; vehicles?: Leaflet.LayerGroup }>({});
  const propsRef = useRef(props);
  propsRef.current = props;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lf = (await import('leaflet')).default;
      (window as unknown as { L: typeof Leaflet }).L = lf;
      await import('leaflet.markercluster');
      if (cancelled || !el.current) return;
      const m = lf.map(el.current, { zoomControl: true, attributionControl: false }).setView(props.center ?? [22.5, 79], props.zoom ?? (props.center ? 16 : 5));
      lf.tileLayer(TILE, { maxZoom: 19, attribution: '' }).addTo(m);
      if (m.attributionControl) {
        m.removeControl(m.attributionControl);
      }
      m.on('click', (e: Leaflet.LeafletMouseEvent) => {
        if (propsRef.current.placeOnClick) propsRef.current.onPinMove?.(e.latlng.lat, e.latlng.lng);
      });
      map.current = m;
      sync();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep layers in sync with props.
  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.hazards, props.user, props.pin?.lat, props.pin?.lon, props.vehicles, props.cluster]);

  useEffect(() => {
    if (map.current && props.center) map.current.setView(props.center, props.zoom ?? map.current.getZoom(), { animate: true });
  }, [props.center?.[0], props.center?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  function sync() {
    const lf = L.current, m = map.current;
    if (!lf || !m) return;
    const p = propsRef.current;

    layers.current.hazards?.remove();
    if (p.hazards) {
      const group: Leaflet.LayerGroup = p.cluster !== false ? (lf as unknown as { markerClusterGroup: (o: object) => Leaflet.LayerGroup }).markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 }) : lf.layerGroup();
      for (const h of p.hazards) {
        const s = SEVERITY[h.severity];
        const mk = lf.circleMarker([h.lat, h.lon], { radius: 9, color: '#fff', weight: 2.5, fillColor: s.color, fillOpacity: 0.95 });
        if (h.popup) mk.bindPopup(h.popup);
        mk.on('click', () => p.onHazardClick?.(h.id));
        (mk as unknown as { options: { hazardId: string } }).options.hazardId = h.id;
        group.addLayer(mk);
      }
      group.addTo(m);
      layers.current.hazards = group;
      if (p.fitToHazards && p.hazards.length) m.fitBounds(lf.latLngBounds(p.hazards.map((h) => [h.lat, h.lon] as [number, number])).pad(0.2), { maxZoom: 16 });
    }

    layers.current.user?.remove();
    if (p.user) {
      const g = lf.layerGroup();
      if (p.user.accuracy) lf.circle([p.user.lat, p.user.lon], { radius: p.user.accuracy, color: '#4C8DF6', weight: 1, fillColor: '#4C8DF6', fillOpacity: 0.12 }).addTo(g);
      lf.circleMarker([p.user.lat, p.user.lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#4C8DF6', fillOpacity: 1 }).bindTooltip('You').addTo(g);
      g.addTo(m);
      layers.current.user = g;
    }

    layers.current.vehicles?.remove();
    if (p.vehicles?.length) {
      const g = lf.layerGroup();
      for (const v of p.vehicles)
        lf.marker([v.lat, v.lon], { icon: lf.divIcon({ className: '', html: '<div style="width:26px;height:26px;border-radius:9px;background:#2F9A5E;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:13px">🚗</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) })
          .bindTooltip(esc(v.name))
          .addTo(g);
      g.addTo(m);
      layers.current.vehicles = g;
    }

    if (p.pin) {
      if (!layers.current.pin) {
        const icon = lf.divIcon({
          className: '',
          html: '<div class="rp-pin" style="width:34px;height:44px"><svg viewBox="0 0 34 44" width="34" height="44"><path d="M17 43C17 43 32 27 32 16A15 15 0 0 0 2 16c0 11 15 27 15 27z" fill="#E5484D" stroke="#fff" stroke-width="3"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg></div>',
          iconSize: [34, 44],
          iconAnchor: [17, 43],
        });
        const mk = lf.marker([p.pin.lat, p.pin.lon], { icon, draggable: Boolean(p.onPinMove), autoPan: true, keyboard: true, title: 'Pothole location' });
        mk.on('dragend', () => {
          const ll = mk.getLatLng();
          propsRef.current.onPinMove?.(ll.lat, ll.lng);
        });
        mk.bindTooltip('Pothole location', { direction: 'top', offset: [0, -40] });
        mk.addTo(m);
        layers.current.pin = mk;
      } else {
        layers.current.pin.setLatLng([p.pin.lat, p.pin.lon]);
      }
    } else if (layers.current.pin) {
      layers.current.pin.remove();
      layers.current.pin = undefined;
    }
  }

  return <div ref={el} className={props.className ?? 'h-72 w-full overflow-hidden rounded-3xl'} data-testid="map" role="application" aria-label="Map" />;
}
