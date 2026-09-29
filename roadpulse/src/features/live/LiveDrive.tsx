'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bluetooth, Camera, Car, CheckCircle2, CloudOff, Cpu, Link2, Loader2, LogOut, MapPin, Power, Satellite, ShieldCheck, Signal, Sparkles, TriangleAlert, Wifi } from 'lucide-react';
import type { Detection, Severity } from '@/types';
import { detect, loadModel, modelBackend, onModelState, type ModelState } from '@/lib/detection/yolo';
import { estimateSeverity } from '@/lib/detection/decode';
import { IouTracker, distanceM, type Track } from '@/lib/tracker';
import { blobToBase64, cropEvent } from '@/lib/image';
import { fromPosition } from '@/lib/geo';
import { DeviceError, deviceFetch, enqueue, getPairing, pending, setPairing, uploadEvent, type Pairing, type QueuedEvent } from '@/lib/vehicleQueue';
import { ModeBadge } from '@/components/Chips';
import { SEVERITY } from '@/lib/meta';
import { cn } from '@/lib/cn';
import type { GeoFix } from '@/types';

type CamState = 'off' | 'connecting' | 'connected' | 'error';
type GpsState = 'off' | 'searching' | 'locked' | 'weak' | 'denied';
type EventState = 'uploading' | 'recorded' | 'queued' | 'local' | 'failed' | 'no_gps';

interface LiveEvent {
  localId: string;
  confidence: number;
  severity: Severity;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  at: string;
  thumb: string | null;
  state: EventState;
  serverId?: string;
  message?: string;
}

const BOX_COLOR: Record<Severity, string> = { low: '#2F9A5E', medium: '#F6B02A', high: '#E5484D', unknown: '#A7ADB3' };
const GPS_MAX_AGE_MS = 15_000;
const GPS_MAX_ACCURACY_M = 100;

export function LiveDrive() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const detsRef = useRef<Detection[]>([]);
  const tracker = useRef(new IouTracker());
  const fixRef = useRef<GeoFix | null>(null);
  const watchRef = useRef<number | null>(null);
  const pairingRef = useRef<Pairing | null>(null);
  const recentRef = useRef<{ lat: number; lon: number; t: number }[]>([]);

  const [running, setRunning] = useState(false);
  const [cam, setCam] = useState<CamState>('off');
  const [camError, setCamError] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsState>('off');
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [ai, setAi] = useState<ModelState>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [inferMs, setInferMs] = useState(0);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pairing, setPairingState] = useState<Pairing | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => onModelState(setAi), []);
  useEffect(() => {
    getPairing().then((p) => {
      pairingRef.current = p ?? null;
      setPairingState(p ?? null);
    });
    pending().then((q) => setQueued(q.length));
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', up);
    };
  }, []);

  const patchEvent = (id: string, p: Partial<LiveEvent>) => setEvents((ev) => ev.map((e) => (e.localId === id ? { ...e, ...p } : e)));

  /** Upload queued events oldest-first. An event is "recorded" only when the server confirms it. */
  const flushing = useRef(false);
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      const list = await pending();
      setQueued(list.length);
      const p = pairingRef.current;
      for (const e of list) {
        if (!p) {
          patchEvent(e.localId, { state: 'local', message: 'Saved on this device — pair this device to upload.' });
          continue;
        }
        if (!navigator.onLine) {
          patchEvent(e.localId, { state: 'queued', message: 'Offline — will upload automatically.' });
          continue;
        }
        patchEvent(e.localId, { state: 'uploading' });
        try {
          const out = await uploadEvent(p, e);
          patchEvent(e.localId, { state: 'recorded', serverId: out.id, message: undefined });
        } catch (err) {
          const status = err instanceof DeviceError ? err.status : 0;
          if (status === 401 || status === 403 || status === 400) {
            patchEvent(e.localId, { state: 'failed', message: (err as Error).message });
          } else {
            patchEvent(e.localId, { state: 'queued', message: 'Upload failed — will retry.' });
            break;
          }
        }
      }
      setQueued((await pending()).length);
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    if (online) flush();
  }, [online, flush]);
  useEffect(() => {
    const t = setInterval(() => flush(), 15_000);
    return () => clearInterval(t);
  }, [flush]);

  // Heartbeat so the dashboard knows this vehicle is active (position only, no images).
  useEffect(() => {
    if (!running || !pairing) return;
    const beat = () => {
      const f = fixRef.current;
      if (navigator.onLine) deviceFetch(pairing, '/api/vehicle/heartbeat', { latitude: f?.latitude ?? null, longitude: f?.longitude ?? null }).catch(() => undefined);
    };
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [running, pairing]);

  async function onConfirmed(t: Track, video: HTMLVideoElement) {
    const vw = video.videoWidth, vh = video.videoHeight;
    const now = new Date();
    const f = fixRef.current;
    const severity = estimateSeverity(t.box, vw, vh, t.bestConfidence);
    const localId = `ev_${now.getTime()}_${t.id}`;
    const gpsOk = f && now.getTime() - Date.parse(f.timestamp) < GPS_MAX_AGE_MS && (f.accuracy ?? Infinity) <= GPS_MAX_ACCURACY_M;
    let thumbBlob: Blob | null = null;
    try {
      thumbBlob = await cropEvent(video, vw, vh, t.box);
    } catch {
      thumbBlob = null;
    }
    const thumb = thumbBlob ? URL.createObjectURL(thumbBlob) : null;
    if (!gpsOk) {
      // Never invent coordinates: without a GPS lock the pothole is shown but no event is created.
      setEvents((ev) => [{ localId, confidence: t.bestConfidence, severity, latitude: null, longitude: null, accuracy: null, at: now.toISOString(), thumb, state: 'no_gps' as const, message: 'No GPS lock — not recorded.' }, ...ev].slice(0, 30));
      return;
    }
    // Same spot within the last minute (e.g. the car stopped next to it) → don't create a second event.
    recentRef.current = recentRef.current.filter((r) => now.getTime() - r.t < 60_000);
    if (recentRef.current.some((r) => distanceM(r.lat, r.lon, f.latitude, f.longitude) < 15)) return;
    recentRef.current.push({ lat: f.latitude, lon: f.longitude, t: now.getTime() });
    const q: QueuedEvent = {
      localId,
      trackId: t.id,
      confidence: Math.round(t.bestConfidence * 1000) / 1000,
      box: { x: Math.round(t.box.x), y: Math.round(t.box.y), w: Math.round(t.box.w), h: Math.round(t.box.h) },
      imageWidth: vw,
      imageHeight: vh,
      latitude: f.latitude,
      longitude: f.longitude,
      accuracy: f.accuracy,
      detectedAt: now.toISOString(),
      imageJpegBase64: thumbBlob ? await blobToBase64(thumbBlob) : null,
      attempts: 0,
    };
    await enqueue(q);
    setEvents((ev) => [{ localId, confidence: q.confidence, severity, latitude: f.latitude, longitude: f.longitude, accuracy: f.accuracy, at: q.detectedAt, thumb, state: 'uploading' as const }, ...ev].slice(0, 30));
    flush();
  }

  async function start() {
    setCamError(null);
    setAiError(null);
    tracker.current = new IouTracker();
    // 1. Camera (rear, HD).
    setCam('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      setCam('connected');
    } catch (err) {
      setCam('error');
      setCamError((err as Error).name === 'NotAllowedError' ? 'Camera permission was blocked.' : 'The camera couldn’t be started.');
      return;
    }
    // 2. GPS (continuous while driving).
    if ('geolocation' in navigator) {
      setGps('searching');
      watchRef.current = navigator.geolocation.watchPosition(
        (p) => {
          const f = fromPosition(p);
          fixRef.current = f;
          setFix(f);
          setGps((f.accuracy ?? Infinity) <= GPS_MAX_ACCURACY_M ? 'locked' : 'weak');
        },
        (e) => setGps(e.code === 1 ? 'denied' : 'searching'),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
      );
    } else setGps('denied');
    // 3. Keep the screen awake while monitoring.
    try {
      await (navigator as unknown as { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen');
    } catch {
      /* not supported */
    }
    runningRef.current = true;
    setRunning(true);
    loop();
  }

  function stop() {
    runningRef.current = false;
    setRunning(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    detsRef.current = [];
    setCam('off');
    setGps('off');
    setLiveCount(0);
  }

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Detection loop: as fast as the device allows (the worker is the throttle). */
  async function loop() {
    try {
      await loadModel();
    } catch (err) {
      setAiError('The pothole model couldn’t be loaded. Check your connection and try again.');
      console.error(err);
      stop();
      return;
    }
    let frames = 0, windowStart = performance.now();
    while (runningRef.current) {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      try {
        const res = await detect(v, v.videoWidth, v.videoHeight, 0.3);
        detsRef.current = res.all;
        setLiveCount(res.all.length);
        setInferMs(res.ms);
        const confirmed = tracker.current.update(res.all, performance.now());
        for (const t of confirmed) void onConfirmed(t, v);
      } catch (err) {
        console.error(err);
        await new Promise((r) => setTimeout(r, 300));
      }
      frames++;
      const el = performance.now() - windowStart;
      if (el > 1000) {
        setFps(Math.round((frames * 10000) / el) / 10);
        frames = 0;
        windowStart = performance.now();
      }
    }
  }

  // Draw boxes every display frame from the latest detections (object-contain mapping).
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = videoRef.current, c = overlayRef.current;
      if (v && c) {
        const rect = c.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (c.width !== Math.round(rect.width * dpr) || c.height !== Math.round(rect.height * dpr)) {
          c.width = Math.round(rect.width * dpr);
          c.height = Math.round(rect.height * dpr);
        }
        const ctx = c.getContext('2d')!;
        ctx.clearRect(0, 0, c.width, c.height);
        if (runningRef.current && v.videoWidth) {
          const s = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
          const ox = (c.width - v.videoWidth * s) / 2, oy = (c.height - v.videoHeight * s) / 2;
          for (const d of detsRef.current) {
            const sev = estimateSeverity(d.box, v.videoWidth, v.videoHeight, d.confidence);
            const color = BOX_COLOR[sev];
            const x = ox + d.box.x * s, y = oy + d.box.y * s, w = d.box.w * s, h = d.box.h * s;
            ctx.lineWidth = 3 * dpr;
            ctx.strokeStyle = color;
            ctx.fillStyle = color + '22';
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 8 * dpr);
            ctx.fill();
            ctx.stroke();
            const label = `POTHOLE ${Math.round(d.confidence * 100)}% · ${SEVERITY[sev].label.toUpperCase()}`;
            ctx.font = `700 ${12 * dpr}px Inter, sans-serif`;
            const tw = ctx.measureText(label).width + 12 * dpr;
            const ly = y > 22 * dpr ? y - 22 * dpr : y + 2 * dpr;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(x, ly, tw, 20 * dpr, 6 * dpr);
            ctx.fill();
            ctx.fillStyle = sev === 'medium' ? '#2B2F33' : '#fff';
            ctx.fillText(label, x + 6 * dpr, ly + 14 * dpr);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const systemActive = running && cam === 'connected' && ai === 'ready';

  return (
    <div className="min-h-[100dvh] bg-paper" data-testid="live">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-paper-200 bg-paper/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/" className="btn btn-ghost h-10 min-h-0 w-10 p-0" aria-label="Exit Live Drive">
              <LogOut className="h-5 w-5 rotate-180" />
            </a>
            <div>
              <p className="font-display text-lg font-bold tracking-tight">ROADPULSE LIVE</p>
              <p className={cn('flex items-center gap-1.5 text-sm font-semibold', systemActive ? 'text-road-600' : 'text-graphite-muted')} data-testid="system-status">
                <span className={cn('h-2.5 w-2.5 rounded-full', systemActive ? 'animate-pulse bg-road-500' : 'bg-graphite-faint')} />
                {systemActive ? 'SYSTEM ACTIVE' : running ? 'STARTING…' : 'STANDBY'}
              </p>
            </div>
            <ModeBadge mode="live" />
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold" data-testid="status-pills">
            <Pill icon={Camera} label="Camera" value={cam === 'connected' ? 'CONNECTED' : cam === 'connecting' ? 'STARTING' : cam === 'error' ? 'ERROR' : 'OFF'} tone={cam === 'connected' ? 'ok' : cam === 'error' ? 'bad' : 'idle'} testId="st-camera" />
            <Pill icon={Satellite} label="GPS" value={gps === 'locked' ? `LOCKED ±${Math.round(fix?.accuracy ?? 0)}m` : gps === 'weak' ? `WEAK ±${Math.round(fix?.accuracy ?? 0)}m` : gps === 'searching' ? 'SEARCHING' : gps === 'denied' ? 'BLOCKED' : 'OFF'} tone={gps === 'locked' ? 'ok' : gps === 'denied' ? 'bad' : gps === 'off' ? 'idle' : 'warn'} testId="st-gps" />
            <Pill icon={Cpu} label="AI" value={ai === 'ready' && running ? `RUNNING ${fps || '…'} fps` : ai === 'loading' ? 'LOADING MODEL' : ai === 'error' ? 'ERROR' : 'READY'} tone={ai === 'ready' ? 'ok' : ai === 'error' ? 'bad' : 'idle'} testId="st-ai" />
            <Pill icon={online ? Wifi : CloudOff} label="Network" value={online ? 'CONNECTED' : 'OFFLINE'} tone={online ? 'ok' : 'warn'} testId="st-net" />
            {queued > 0 && <Pill icon={Signal} label="Queue" value={String(queued)} tone="warn" testId="st-queue" />}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_340px]">
        {/* Camera */}
        <div className="relative overflow-hidden rounded-3xl bg-black ring-1 ring-paper-300 shadow-xl">
          <div className="relative aspect-[9/16] sm:aspect-video w-full min-h-[62vh] h-[66vh] sm:min-h-0 sm:h-[520px]">
            <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" data-testid="live-video" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" data-testid="live-overlay" data-count={liveCount} />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <p className="display text-2xl">Let RoadPulse watch the road</p>
                  <p className="mt-2 text-sm text-graphite-soft">
                    Mount the phone facing the road. Detection runs on this device in real time — video never leaves it. Only confirmed pothole events (location, time, confidence and a small cropped photo) are uploaded.
                  </p>
                  {(camError || aiError) && (
                    <p className="mt-3 rounded-2xl bg-pothole-50 p-3 text-sm font-semibold text-pothole-700" role="alert">
                      {camError ?? aiError}
                    </p>
                  )}
                  <button onClick={start} className="btn btn-primary btn-lg mt-5" data-testid="live-start">
                    <Power className="h-5 w-5" /> Start Live Drive
                  </button>
                  <p className="mt-2 text-xs text-graphite-muted">We’ll ask for the camera and your location.</p>
                </div>
              </div>
            )}
          </div>
          {running && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-paper-300 bg-white px-4 py-2.5 text-xs font-semibold text-graphite-soft">
              <span data-testid="live-perf">
                On-device {modelBackend()?.toUpperCase()} · {inferMs} ms per frame · {liveCount} in view
              </span>
              <span className="flex items-center gap-3">
                {(['low', 'medium', 'high'] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <i className="h-2.5 w-2.5 rounded-sm" style={{ background: BOX_COLOR[s] }} /> {SEVERITY[s].label}
                  </span>
                ))}
                <span className="text-graphite-muted">AI-estimated from apparent size</span>
              </span>
              <button onClick={stop} className="btn btn-secondary h-9 min-h-0 px-3 text-sm" data-testid="live-stop">
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Side: pairing + events */}
        <div className="space-y-3">
          <PairingCard pairing={pairing} onChange={(p) => { pairingRef.current = p; setPairingState(p); setPairing(p); if (p) flush(); }} />
          <div className="card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">Detections this drive</p>
            {events.length === 0 && <p className="mt-2 text-sm text-graphite-muted">Confirmed potholes appear here with GPS and time.</p>}
            <div className="mt-2 space-y-2" data-testid="live-events">
              <AnimatePresence initial={false}>
                {events.map((e) => (
                  <motion.div key={e.localId} layout initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="rounded-2xl bg-paper-50 p-3 ring-1 ring-paper-200" data-testid="live-event" data-state={e.state}>
                    <div className="flex gap-3">
                      {e.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.thumb} alt="" className="h-16 w-20 flex-none rounded-xl object-cover" />
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-graphite">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BOX_COLOR[e.severity] }} /> Pothole detected
                        </p>
                        <p className="text-graphite-soft">
                          {Math.round(e.confidence * 100)}% · {SEVERITY[e.severity].label} severity <span className="text-graphite-muted">(AI-estimated)</span>
                        </p>
                        <p className="num text-graphite-soft">{e.latitude != null ? `${e.latitude.toFixed(5)}, ${e.longitude!.toFixed(5)} ±${Math.round(e.accuracy ?? 0)}m` : 'No GPS position'}</p>
                        <p className="num text-graphite-muted">{new Date(e.at).toLocaleTimeString()}</p>
                        <EventStatus e={e} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-graphite-muted">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            Sent per confirmed pothole: location, time, device ID, confidence, AI-estimated severity and a cropped photo. Continuous video is never uploaded.
          </p>
        </div>
      </div>
    </div>
  );
}

function EventStatus({ e }: { e: LiveEvent }) {
  const map: Record<EventState, { text: string; cls: string; icon: React.ReactNode }> = {
    uploading: { text: 'Uploading…', cls: 'text-gps-600', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    recorded: { text: `Report recorded · ${e.serverId}`, cls: 'text-road-600', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    queued: { text: e.message ?? 'Queued', cls: 'text-amber-700', icon: <CloudOff className="h-3.5 w-3.5" /> },
    local: { text: e.message ?? 'Saved on this device', cls: 'text-amber-700', icon: <Link2 className="h-3.5 w-3.5" /> },
    failed: { text: e.message ?? 'Upload failed', cls: 'text-pothole-600', icon: <TriangleAlert className="h-3.5 w-3.5" /> },
    no_gps: { text: e.message ?? 'No GPS lock — not recorded', cls: 'text-graphite-muted', icon: <MapPin className="h-3.5 w-3.5" /> },
  };
  const m = map[e.state];
  return (
    <p className={cn('mt-1 flex items-center gap-1 font-bold', m.cls)} data-testid="event-status">
      {m.icon} {m.text}
    </p>
  );
}

function Pill({ icon: Icon, label, value, tone, testId }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: 'ok' | 'warn' | 'bad' | 'idle'; testId: string }) {
  const cls = { ok: 'bg-road-50 text-road-700 ring-road-200', warn: 'bg-amber-50 text-amber-700 ring-amber-300', bad: 'bg-pothole-50 text-pothole-700 ring-pothole-300', idle: 'bg-white text-graphite-muted ring-paper-300' }[tone];
  return (
    <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1.5 ring-1 ring-inset', cls)} data-testid={testId} data-tone={tone}>
      <Icon className="h-3.5 w-3.5" /> <span className="opacity-70">{label}:</span> {value}
    </span>
  );
}

function PairingCard({ pairing, onChange }: { pairing: Pairing | null; onChange: (p: Pairing | null) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'register' | 'bluetooth' | 'manual'>('register');
  
  // Registration by details
  const [vehNumber, setVehNumber] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehCompany, setVehCompany] = useState('');
  
  // Manual key
  const [id, setId] = useState('');
  const [key, setKey] = useState('');
  
  // Bluetooth state
  const [btStatus, setBtStatus] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registerVehicle(customBtName?: string) {
    if (!vehNumber.trim() && !customBtName) {
      setError('Please enter your vehicle number (e.g. RJ 14 EA 1234)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/vehicle/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: vehNumber.trim() || customBtName || 'VEHICLE',
          modelName: vehModel.trim() || undefined,
          companyName: vehCompany.trim() || undefined,
          bluetoothName: customBtName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Registration failed');
      onChange({ deviceId: data.data.id, deviceKey: data.data.key, name: data.data.name });
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function connectBluetooth() {
    setError(null);
    setBtStatus('Scanning for in-car Bluetooth devices…');
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const nav = navigator as unknown as { bluetooth: { requestDevice: (o: object) => Promise<{ name?: string }> } };
        const device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['generic_access', 'battery_service'],
        });
        const deviceName = device.name || 'Car Bluetooth / OBD-II';
        setBtStatus(`Connected to: ${deviceName}`);
        await registerVehicle(deviceName);
      } catch (err) {
        setBtStatus(null);
        setError('Bluetooth pairing cancelled or not supported on this browser.');
      }
    } else {
      setBtStatus(null);
      setError('Web Bluetooth is supported in Chrome/Edge/Android. Use Vehicle Details tab instead.');
    }
  }

  async function pairManual() {
    setBusy(true);
    setError(null);
    try {
      const v = await deviceFetch<{ id: string; name: string }>({ deviceId: id.trim(), deviceKey: key.trim(), name: '' }, '/api/vehicle/verify', {});
      onChange({ deviceId: v.id, deviceKey: key.trim(), name: v.name });
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (pairing)
    return (
      <div className="card flex items-center justify-between gap-3 p-4" data-testid="paired">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">Paired Vehicle</p>
          <p className="font-bold text-graphite">🚗 {pairing.name}</p>
          <p className="text-xs text-road-600 font-semibold">{pairing.deviceId} · Live Cloud Sync Enabled</p>
        </div>
        <button onClick={() => onChange(null)} className="btn btn-ghost h-9 min-h-0 px-3 text-sm">
          Unpair
        </button>
      </div>
    );

  return (
    <div className="card p-4 sm:p-5" data-testid="pairing">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite-muted">Vehicle Setup</p>
          <p className="text-sm font-semibold text-graphite">Pair your vehicle for auto-uploading road hazards</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-paper-200 flex items-center justify-center text-graphite-soft">
          <Car className="h-4 w-4" />
        </div>
      </div>
      
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-primary mt-3 w-full" data-testid="pair-open">
          <Car className="h-4 w-4" /> Register & Pair Vehicle
        </button>
      ) : (
        <div className="mt-3.5 space-y-3">
          <div className="flex rounded-xl bg-paper-100 p-1 text-xs font-bold">
            <button
              onClick={() => setMode('register')}
              className={cn('flex-1 py-1.5 rounded-lg transition', mode === 'register' ? 'bg-white shadow-sm text-graphite' : 'text-graphite-muted hover:text-graphite')}
            >
              🚗 Vehicle Details
            </button>
            <button
              onClick={() => setMode('bluetooth')}
              className={cn('flex-1 py-1.5 rounded-lg transition', mode === 'bluetooth' ? 'bg-white shadow-sm text-graphite' : 'text-graphite-muted hover:text-graphite')}
            >
              📶 Bluetooth / OBD
            </button>
            <button
              onClick={() => setMode('manual')}
              className={cn('flex-1 py-1.5 rounded-lg transition', mode === 'manual' ? 'bg-white shadow-sm text-graphite' : 'text-graphite-muted hover:text-graphite')}
            >
              🔑 Code
            </button>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <input
                className="field text-sm"
                placeholder="Vehicle Number (e.g. RJ 14 EA 1234)"
                value={vehNumber}
                onChange={(e) => setVehNumber(e.target.value)}
                autoCapitalize="characters"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="field text-sm"
                  placeholder="Make/Model (e.g. Bolero, Swift)"
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                />
                <input
                  className="field text-sm"
                  placeholder="Company / Owner Name"
                  value={vehCompany}
                  onChange={(e) => setVehCompany(e.target.value)}
                />
              </div>
              <button onClick={() => registerVehicle()} disabled={busy || !vehNumber.trim()} className="btn btn-primary w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Pair & Start Live Sync
              </button>
            </div>
          )}

          {mode === 'bluetooth' && (
            <div className="space-y-2.5 text-center p-3 rounded-2xl bg-paper-50 border border-paper-200">
              <p className="text-xs text-graphite-soft">Connect to your Car’s Bluetooth Infotainment, Android Auto, or OBD-II scanner to auto-pair.</p>
              {btStatus && <p className="text-xs font-semibold text-gps-600">{btStatus}</p>}
              <button onClick={connectBluetooth} disabled={busy} className="btn btn-secondary w-full">
                <Bluetooth className="h-4 w-4 text-gps-600" /> Connect Car Bluetooth / OBD
              </button>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-2">
              <input className="field text-sm" placeholder="Device ID (veh_…)" value={id} onChange={(e) => setId(e.target.value)} autoCapitalize="off" />
              <input className="field text-sm" placeholder="Device key" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="off" type="password" />
              <button onClick={pairManual} disabled={busy || !id || !key} className="btn btn-secondary w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Pair with Admin Key
              </button>
            </div>
          )}

          {error && <p className="text-xs font-semibold text-pothole-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
