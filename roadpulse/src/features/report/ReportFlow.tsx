'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Camera, Check, CheckCircle2, ExternalLink, ImagePlus, Loader2, LocateFixed, MapPin, RefreshCw, RotateCcw, Send, ShieldQuestion, X } from 'lucide-react';
import type { Address, DetectionSummary, GeoFix, RoadHazard, Severity } from '@/types';
import { CameraCapture } from './CameraCapture';
import { detect } from '@/lib/detection/yolo';
import { confidenceBand, estimateSeverity, type ConfidenceBand } from '@/lib/detection/decode';
import { annotate, fileToBitmap, preparePhoto, type PreparedPhoto } from '@/lib/image';
import { accuracyBand, formatCoords, geoErrorMessage, getFix, type GeoError } from '@/lib/geo';
import { api, ensureUser, firebase, firebaseConfigured } from '@/lib/firebase';
import { SeverityChip, StatusChip } from '@/components/Chips';
import { placeName } from '@/lib/meta';
import { cn } from '@/lib/cn';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-3xl bg-paper-200" /> });

type Step = 'photo' | 'location' | 'review' | 'submit';
type PhotoPhase = 'choose' | 'camera' | 'analyzing' | 'quality' | 'result';
interface Routing {
  address: Address | null;
  authority: { id: string; name: string; jurisdiction: string; method: string; portal: string | null } | null;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'location', label: 'Location' },
  { key: 'review', label: 'Review' },
  { key: 'submit', label: 'Report' },
];

export function ReportFlow() {
  const [step, setStep] = useState<Step>('photo');
  const [phase, setPhase] = useState<PhotoPhase>('choose');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [det, setDet] = useState<DetectionSummary | null>(null);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [routing, setRouting] = useState<Routing | null>(null);
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const band: ConfidenceBand = confidenceBand(det?.best?.confidence);
  const severity: Severity = !manual && det?.best ? estimateSeverity(det.best.box, det.imageWidth, det.imageHeight, det.best.confidence) : 'unknown';

  async function analyze(source: ImageBitmap | HTMLCanvasElement) {
    setError(null);
    setPhase('analyzing');
    setManual(false);
    setDet(null);
    try {
      const p = await preparePhoto(source);
      setPhoto(p);
      if (!p.quality.ok) return setPhase('quality');
      const [d] = await Promise.all([detect(p.bitmap, p.width, p.height, 0.2), new Promise((r) => setTimeout(r, 600))]);
      setDet(d);
      setPhase('result');
    } catch (err) {
      setError((err as Error).message || 'That photo couldn’t be checked. Please try again.');
      setPhase('choose');
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      analyze(await fileToBitmap(f));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function restart() {
    setStep('photo');
    setPhase('choose');
    setPhoto(null);
    setDet(null);
    setManual(false);
    setFix(null);
    setRouting(null);
    setStreet('');
    setNotes('');
    setError(null);
  }

  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="page max-w-2xl py-6 sm:py-10" data-testid="report-flow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Report a pothole</p>
          <h1 className="display mt-1 text-3xl sm:text-4xl">{['Take a photo', 'Add your location', 'Check your report', 'Sending your report'][idx]}</h1>
        </div>
        {step !== 'submit' && step !== 'photo' && (
          <button onClick={() => setStep(STEPS[idx - 1].key)} className="btn btn-ghost">
            Back
          </button>
        )}
      </div>

      {/* PHOTO → LOCATION → REVIEW → REPORT */}
      <ol className="mt-5 flex items-center gap-2" aria-label="Progress" data-testid="stepper">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span className={cn('flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition', i < idx ? 'bg-road-500 text-white' : i === idx ? 'bg-graphite text-white' : 'bg-paper-200 text-graphite-muted')} aria-current={i === idx ? 'step' : undefined}>
              {i < idx ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn('hidden text-xs font-bold uppercase tracking-wider sm:inline', i === idx ? 'text-graphite' : 'text-graphite-muted')}>{s.label}</span>
            {i < STEPS.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', i < idx ? 'bg-road-400' : 'bg-paper-300')} />}
          </li>
        ))}
      </ol>

      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={onFile} data-testid="upload-input" />

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {step === 'photo' && (
            <motion.div key={`photo-${phase}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              {phase === 'choose' && (
                <div className="card p-6 text-center sm:p-8" data-testid="photo-choose">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-pothole-50 text-4xl">📷</div>
                  <p className="mt-4 text-lg font-semibold text-graphite">Step 1 — Take or upload a photo</p>
                  <p className="mt-1 text-sm text-graphite-muted">Photos are checked on your phone and only uploaded when you submit.</p>
                  {error && (
                    <p className="mt-4 rounded-2xl bg-pothole-50 p-3 text-sm font-semibold text-pothole-700" role="alert" data-testid="photo-error">
                      {error}
                    </p>
                  )}
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <button onClick={() => { setError(null); setPhase('camera'); }} className="btn btn-danger btn-lg" data-testid="take-photo">
                      <Camera className="h-5 w-5" /> Take Photo
                    </button>
                    <button onClick={() => fileInput.current?.click()} className="btn btn-secondary btn-lg" data-testid="upload-photo">
                      <ImagePlus className="h-5 w-5" /> Upload Image
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-graphite-muted">JPG, PNG or WebP · HEIC where your browser supports it</p>
                </div>
              )}
              {phase === 'camera' && <CameraCapture onCapture={(c) => analyze(c)} onClose={() => setPhase('choose')} onError={(m) => { setError(m); setPhase('choose'); }} />}
              {phase === 'analyzing' && (
                <div className="card overflow-hidden" data-testid="analyzing">
                  <div className="relative aspect-video bg-paper-200">
                    {photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="Your photo" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-x-6 h-0.5 animate-sweep rounded-full bg-amber-300 shadow-[0_0_14px_3px_rgba(246,176,42,0.7)]" />
                  </div>
                  <p className="flex items-center justify-center gap-2 p-5 font-semibold text-graphite">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" /> Checking the road…
                  </p>
                </div>
              )}
              {phase === 'quality' && photo && (
                <div className="card p-6 text-center" data-testid="quality-fail">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="mx-auto h-40 rounded-2xl object-cover" />
                  <p className="display mt-4 text-2xl">We need a clearer photo.</p>
                  <p className="mt-1 text-sm text-graphite-muted">{photo.quality.problem === 'dark' ? 'The photo is too dark.' : photo.quality.problem === 'bright' ? 'The photo is overexposed.' : 'The photo looks blurry.'}</p>
                  <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm text-graphite-soft">
                    <li>• Move closer.</li>
                    <li>• Point the camera directly at the pothole.</li>
                    <li>• Make sure the road surface is visible.</li>
                  </ul>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button onClick={() => setPhase('camera')} className="btn btn-primary" data-testid="retake">
                      <Camera className="h-4 w-4" /> Retake Photo
                    </button>
                    <button onClick={() => fileInput.current?.click()} className="btn btn-secondary">
                      <ImagePlus className="h-4 w-4" /> Choose another
                    </button>
                  </div>
                </div>
              )}
              {phase === 'result' && photo && det && (
                <div className="card overflow-hidden" data-testid="detection-result" data-band={band}>
                  <DetectionImage photo={photo} det={band === 'low' ? null : det} />
                  <div className="p-5 sm:p-6">
                    {band === 'low' ? (
                      <>
                        <p className="flex items-center gap-2 text-xl font-bold text-graphite">
                          <ShieldQuestion className="h-6 w-6 text-graphite-muted" /> We couldn’t confidently detect a pothole.
                        </p>
                        <p className="mt-1 text-sm text-graphite-muted">No report is created automatically. Try a clearer, closer photo — or report it as your own observation.</p>
                        <div className="mt-5 grid gap-2 sm:grid-cols-2">
                          <button onClick={() => setPhase('choose')} className="btn btn-primary" data-testid="try-another">
                            <RotateCcw className="h-4 w-4" /> Try Another Photo
                          </button>
                          <button onClick={() => { setManual(true); setStep('location'); }} className="btn btn-secondary" data-testid="report-manually">
                            Report Manually
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-graphite-muted">Manual reports are clearly marked as your observation, not an AI-confirmed detection.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-graphite" data-testid="detection-title">
                          {band === 'high' ? 'Pothole detected' : 'Possible pothole detected'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="chip bg-paper-100 text-graphite">Confidence {Math.round(det.best!.confidence * 100)}%</span>
                          <SeverityChip severity={severity} estimated />
                        </div>
                        <p className="mt-3 font-semibold text-graphite">Does this look correct?</p>
                        {band === 'medium' && <p className="text-sm text-graphite-muted">The AI isn’t fully sure — please confirm it’s a pothole.</p>}
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <button onClick={() => setStep('location')} className="btn btn-danger btn-lg" data-testid="confirm-yes">
                            <Check className="h-5 w-5" /> Yes, Report It
                          </button>
                          <button onClick={() => setPhase('choose')} className="btn btn-secondary btn-lg" data-testid="confirm-retake">
                            <RotateCcw className="h-5 w-5" /> Retake Photo
                          </button>
                        </div>
                        <p className="mt-3 text-xs text-graphite-muted">Severity is AI-estimated from the pothole’s size in the photo — depth isn’t measured.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'location' && (
            <motion.div key="location" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LocationStep fix={fix} setFix={setFix} routing={routing} setRouting={setRouting} onNext={() => setStep('review')} />
            </motion.div>
          )}

          {step === 'review' && photo && fix && (
            <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="card overflow-hidden" data-testid="review">
                <DetectionImage photo={photo} det={manual ? null : det} />
                <div className="space-y-4 p-5 sm:p-6">
                  <p className="font-display text-xl font-bold">Pothole Report</p>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Fact label="Detection" value={manual ? 'Your observation (not AI-confirmed)' : band === 'high' ? 'Pothole detected' : 'Possible pothole (you confirmed)'} />
                    <Fact label="Confidence" value={manual || !det?.best ? '—' : `${Math.round(det.best.confidence * 100)}%`} />
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Estimated severity</dt>
                      <dd className="mt-1">
                        <SeverityChip severity={severity} estimated />
                      </dd>
                    </div>
                    <Fact label="Location accuracy" value={fix.accuracy != null && !fix.adjusted ? `±${Math.round(fix.accuracy)} m` : fix.adjusted ? 'Set on the map by you' : 'Unknown'} />
                    <Fact label="Coordinates" value={formatCoords(fix.latitude, fix.longitude)} mono />
                    <Fact label="Address" value={routing?.address?.displayName ?? 'Address unavailable — coordinates will be sent'} />
                  </dl>
                  <MapView center={[fix.latitude, fix.longitude]} zoom={17} pin={{ lat: fix.latitude, lon: fix.longitude }} className="h-48 w-full overflow-hidden rounded-2xl" />
                  <AuthorityBox routing={routing} />
                  <div className="grid gap-3">
                    <label>
                      <span className="label">Road / street name (optional)</span>
                      <input className="field" value={street} maxLength={120} onChange={(e) => setStreet(e.target.value)} placeholder={routing?.address?.road ?? 'e.g. Delhi Road'} data-testid="street" />
                    </label>
                    <label>
                      <span className="label">Additional notes (optional)</span>
                      <textarea className="field min-h-[80px]" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Large pothole near the intersection." data-testid="notes" />
                    </label>
                  </div>
                  <button onClick={() => setStep('submit')} className="btn btn-danger btn-lg w-full" data-testid="submit-report">
                    <Send className="h-5 w-5" /> Submit Report
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'submit' && photo && fix && (
            <motion.div key="submit" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <SubmitStep photo={photo} det={manual ? null : det} fix={fix} street={street} notes={notes} onAnother={restart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">{label}</dt>
      <dd className={cn('mt-1 break-words font-semibold text-graphite', mono && 'num')}>{value}</dd>
    </div>
  );
}

/** The photo with the actual detection box drawn over it (the stored original is never altered). */
function DetectionImage({ photo, det }: { photo: PreparedPhoto; det: DetectionSummary | null }) {
  const b = det?.best;
  return (
    <div className="relative bg-paper-200" data-testid="detection-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="Your photo of the road" className="block w-full" />
      {b && (
        <motion.div
          initial={{ opacity: 0, scale: 1.25 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="absolute rounded-lg border-[3px] border-pothole-500 bg-pothole-500/10"
          style={{ left: `${(b.box.x / photo.width) * 100}%`, top: `${(b.box.y / photo.height) * 100}%`, width: `${(b.box.w / photo.width) * 100}%`, height: `${(b.box.h / photo.height) * 100}%` }}
          data-testid="detection-box"
        >
          <span className="absolute -top-7 left-[-3px] whitespace-nowrap rounded-md bg-pothole-500 px-2 py-0.5 text-xs font-bold text-white">POTHOLE {Math.round(b.confidence * 100)}%</span>
        </motion.div>
      )}
    </div>
  );
}

function LocationStep({ fix, setFix, routing, setRouting, onNext }: { fix: GeoFix | null; setFix: (f: GeoFix) => void; routing: Routing | null; setRouting: (r: Routing | null) => void; onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<GeoError | null>(null);
  const [placing, setPlacing] = useState(false);
  const [routingBusy, setRoutingBusy] = useState(false);

  async function locate() {
    setBusy(true);
    setErr(null);
    try {
      setFix(await getFix());
      setPlacing(false);
    } catch (e) {
      setErr(e as GeoError);
    } finally {
      setBusy(false);
    }
  }

  // Look up the address + authority for the pin (debounced; also after dragging).
  useEffect(() => {
    if (!fix || !firebaseConfigured) return;
    setRoutingBusy(true);
    const t = setTimeout(() => {
      api<Routing>('/api/route', { body: { latitude: fix.latitude, longitude: fix.longitude } })
        .then(setRouting)
        .catch(() => setRouting({ address: null, authority: null }))
        .finally(() => setRoutingBusy(false));
    }, 500);
    return () => clearTimeout(t);
  }, [fix?.latitude, fix?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (lat: number, lon: number) => setFix({ latitude: lat, longitude: lon, accuracy: fix?.accuracy ?? null, timestamp: new Date().toISOString(), adjusted: true });
  const band = fix && !fix.adjusted ? accuracyBand(fix.accuracy) : null;

  if (!fix && !placing)
    return (
      <div className="card p-6 sm:p-8" data-testid="location-intro">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gps-50">
          <MapPin className="h-7 w-7 text-gps-500" />
        </div>
        <p className="mt-4 text-xl font-bold text-graphite">Add your location</p>
        <p className="mt-1 text-graphite-soft">We use your location to tell the relevant road authority where the pothole is. It’s only taken now, when you tap the button — never in the background.</p>
        {err && (
          <div className="mt-4 rounded-2xl bg-pothole-50 p-4" role="alert" data-testid="location-error">
            <p className="font-bold text-pothole-700">We couldn’t access your location.</p>
            <p className="text-sm text-pothole-700">{geoErrorMessage(err)}</p>
          </div>
        )}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={locate} disabled={busy} className="btn btn-primary btn-lg" data-testid="use-location">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />} {err ? 'Try Again' : 'Use My Current Location'}
          </button>
          <button onClick={() => setPlacing(true)} className="btn btn-secondary btn-lg" data-testid="choose-on-map">
            <MapPin className="h-5 w-5" /> Choose Location on Map
          </button>
        </div>
      </div>
    );

  return (
    <div className="card overflow-hidden" data-testid="location-map">
      {placing && !fix && <p className="bg-gps-50 px-5 py-3 text-sm font-semibold text-gps-600">Tap the map exactly where the pothole is.</p>}
      <MapView center={fix ? [fix.latitude, fix.longitude] : undefined} zoom={fix ? 18 : 5} pin={fix ? { lat: fix.latitude, lon: fix.longitude } : null} onPinMove={move} placeOnClick user={fix && !fix.adjusted ? { lat: fix.latitude, lon: fix.longitude, accuracy: fix.accuracy } : null} className="h-80 w-full" />
      {fix && (
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-graphite">📍 Pothole location</p>
            <p className="num text-sm text-graphite-soft" data-testid="coords">{formatCoords(fix.latitude, fix.longitude)}</p>
          </div>
          <p className="text-sm font-semibold text-graphite-soft" data-testid="accuracy">
            {fix.adjusted ? 'Position adjusted by you on the map.' : fix.accuracy != null ? `Location accuracy: ±${Math.round(fix.accuracy)} m` : 'Location accuracy: unknown'}
          </p>
          {band === 'low' && (
            <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700" data-testid="accuracy-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              <p>
                <b>Location accuracy is low.</b> Move outdoors or adjust the marker before submitting.
              </p>
            </div>
          )}
          <p className="text-xs text-graphite-muted">GPS can be a few metres off — drag the pin (or tap the map) to the exact spot. That’s “Adjust Location”.</p>
          <div className="rounded-2xl bg-paper-50 p-3 text-sm" data-testid="address">
            {routingBusy ? (
              <span className="flex items-center gap-2 text-graphite-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Finding the address…
              </span>
            ) : routing?.address ? (
              <span className="text-graphite-soft">{routing.address.displayName}</span>
            ) : (
              <span className="text-graphite-muted">Address unavailable — the coordinates will be used.</span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={onNext} className="btn btn-primary btn-lg" data-testid="location-continue">
              This is correct <ArrowRight className="h-5 w-5" />
            </button>
            <button onClick={locate} className="btn btn-secondary btn-lg">
              <LocateFixed className="h-5 w-5" /> Use GPS again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthorityBox({ routing }: { routing: Routing | null }) {
  if (routing?.authority)
    return (
      <div className="rounded-2xl bg-road-50 p-4 ring-1 ring-inset ring-road-200" data-testid="authority">
        <p className="text-xs font-bold uppercase tracking-wider text-road-700">Your report will be routed to</p>
        <p className="mt-1 text-lg font-bold text-graphite">{routing.authority.name}</p>
        <p className="text-sm text-graphite-soft">Area: {routing.authority.jurisdiction}</p>
      </div>
    );
  return (
    <div className="rounded-2xl bg-paper-100 p-4" data-testid="authority-unavailable">
      <p className="font-bold text-graphite">Authority routing unavailable</p>
      <p className="text-sm text-graphite-soft">Your report can still be saved, but automated submission is not configured for this area.</p>
    </div>
  );
}

type Row = { key: string; label: string; state: 'wait' | 'busy' | 'done' | 'fail' };

function SubmitStep({ photo, det, fix, street, notes, onAnother }: { photo: PreparedPhoto; det: DetectionSummary | null; fix: GeoFix; street: string; notes: string; onAnother: () => void }) {
  const [rows, setRows] = useState<Row[]>([{ key: 'upload', label: 'Uploading image', state: 'busy' }]);
  const [report, setReport] = useState<RoadHazard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    (async () => {
      setError(null);
      setRows([{ key: 'upload', label: 'Uploading image', state: 'busy' }]);
      try {
        if (!firebaseConfigured) throw new Error('RoadPulse isn’t connected to its database yet, so reports can’t be sent from this site.');
        const user = await ensureUser();
        const { storage } = await firebase();
        const { ref, uploadBytes } = await import('firebase/storage');
        const base = crypto.randomUUID().replace(/-/g, '');
        const imagePath = `citizen/${user.uid}/${base}.jpg`;
        await uploadBytes(ref(storage, imagePath), photo.blob, { contentType: 'image/jpeg' });
        let annotatedPath: string | null = null;
        if (det?.best) {
          annotatedPath = `citizen/${user.uid}/${base}-ann.jpg`;
          await uploadBytes(ref(storage, annotatedPath), await annotate(photo, det.best.box, `POTHOLE ${Math.round(det.best.confidence * 100)}%`), { contentType: 'image/jpeg' });
        }
        setRows([{ key: 'upload', label: 'Image uploaded', state: 'done' }, { key: 'create', label: 'Creating report…', state: 'busy' }]);
        const r = await api<RoadHazard>('/api/reports', {
          user,
          body: {
            imagePath,
            annotatedPath,
            detection: { confidence: det?.best?.confidence ?? null, box: det?.best?.box ?? null, imageWidth: photo.width, imageHeight: photo.height, userConfirmed: true },
            location: fix,
            street: street.trim() || null,
            notes: notes.trim() || null,
          },
        });
        setReport(r);
        setRows(rowsFor(r));
      } catch (err) {
        setError((err as Error).message || 'The report couldn’t be sent.');
        setRows((rs) => rs.map((x) => (x.state === 'busy' ? { ...x, state: 'fail' } : x)));
      }
    })();
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function retry() {
    if (!report) return;
    setRetrying(true);
    try {
      const r = await api<RoadHazard>(`/api/reports/${report.id}/retry`, { body: {} });
      setReport(r);
      setRows(rowsFor(r));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-6" data-testid="submit-progress">
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li key={r.key + r.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3" data-state={r.state}>
                <span className={cn('flex h-7 w-7 flex-none items-center justify-center rounded-full', r.state === 'done' ? 'bg-road-500 text-white' : r.state === 'fail' ? 'bg-pothole-500 text-white' : 'bg-paper-200 text-graphite-muted')}>
                  {r.state === 'done' ? <Check className="h-4 w-4" /> : r.state === 'fail' ? <X className="h-4 w-4" /> : r.state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                </span>
                <span className={cn('font-semibold', r.state === 'fail' ? 'text-pothole-600' : 'text-graphite')}>{r.label}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {error && !report && (
          <div className="mt-4 rounded-2xl bg-pothole-50 p-4" role="alert" data-testid="submit-error">
            <p className="font-bold text-pothole-700">{error}</p>
            <p className="text-sm text-pothole-700">Nothing was lost — your photo and location are still here.</p>
            <button onClick={() => setAttempt((a) => a + 1)} className="btn btn-danger mt-3">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}
      </div>
      {report && <Outcome report={report} onRetry={retry} retrying={retrying} onAnother={onAnother} error={error} />}
    </div>
  );
}

/** Build the progress list from what actually happened on the server. */
function rowsFor(r: RoadHazard): Row[] {
  const rows: Row[] = [
    { key: 'upload', label: 'Image uploaded', state: 'done' },
    { key: 'loc', label: 'Location verified', state: 'done' },
    { key: 'created', label: `Report created · ${r.id}`, state: 'done' },
  ];
  if (r.authorityName) rows.push({ key: 'auth', label: `Authority identified · ${r.authorityName}`, state: 'done' });
  if (r.reportStatus === 'submitted') rows.push({ key: 'sent', label: 'Report submitted', state: 'done' });
  if (r.reportStatus === 'submission_failed') rows.push({ key: 'sent', label: 'Couldn’t send to the authority', state: 'fail' });
  return rows;
}

function Outcome({ report: r, onRetry, retrying, onAnother, error }: { report: RoadHazard; onRetry: () => void; retrying: boolean; onAnother: () => void; error: string | null }) {
  const area = placeName(r.address, r.latitude, r.longitude);
  const [confirmed, setConfirmed] = useState(r.timeline.some((t) => t.key === 'manual_confirmed'));
  const title =
    r.reportStatus === 'submitted' ? 'Pothole reported.' : r.reportStatus === 'submission_failed' ? 'We couldn’t send the report automatically.' : r.reportStatus === 'pending_manual_submission' ? 'Report saved — one more step.' : 'Report Created';
  const text =
    r.reportStatus === 'submitted'
      ? `Your report has been sent to ${r.authorityName}.`
      : r.reportStatus === 'submission_failed'
        ? 'But your report is safely saved.'
        : r.reportStatus === 'pending_manual_submission'
          ? `${r.authorityName} takes reports on its official channel. RoadPulse hasn’t submitted it for you.`
          : 'Your pothole report has been recorded. Authority submission is not currently connected for this area.';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 text-center sm:p-8" data-testid="outcome" data-status={r.reportStatus}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }} className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-full', r.reportStatus === 'submitted' ? 'bg-road-500 text-white' : r.reportStatus === 'submission_failed' ? 'bg-amber-100 text-amber-700' : 'bg-gps-50 text-gps-600')}>
        {r.reportStatus === 'submission_failed' ? <AlertTriangle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
      </motion.div>
      <h2 className="display mt-4 text-2xl" data-testid="outcome-title">
        {title}
      </h2>
      <p className="mt-1 text-graphite-soft">{text}</p>
      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 rounded-2xl bg-paper-50 p-4 text-left text-sm">
        <div className="col-span-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Your report</dt>
          <dd className="num text-xl font-bold text-graphite" data-testid="report-id">
            {r.id}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Status</dt>
          <dd className="mt-1">
            <StatusChip status={r.reportStatus} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Location</dt>
          <dd className="mt-1 font-semibold text-graphite">{area}</dd>
        </div>
        {r.authorityName && (
          <div className="col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-graphite-muted">Authority</dt>
            <dd className="mt-1 font-semibold text-graphite">{r.authorityName}</dd>
          </div>
        )}
        {r.groupSize > 1 && <p className="col-span-2 text-xs font-semibold text-amber-700">{r.groupSize} reports for the same road hazard.</p>}
      </dl>
      {r.reportStatus === 'submission_failed' && (
        <div className="mt-4 space-y-2">
          {r.statusNote && <p className="text-sm text-graphite-muted">{r.statusNote}</p>}
          <button onClick={onRetry} disabled={retrying} className="btn btn-danger w-full sm:w-auto" data-testid="retry">
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Retry sending
          </button>
          {error && <p className="text-sm font-semibold text-pothole-600">{error}</p>}
        </div>
      )}
      {r.reportStatus === 'pending_manual_submission' && r.authorityPortal && (
        <div className="mt-4 space-y-2">
          <a href={r.authorityPortal} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full sm:w-auto" data-testid="official-portal">
            Continue to Official Reporting Portal <ExternalLink className="h-4 w-4" />
          </a>
          {!confirmed ? (
            <button onClick={() => api(`/api/reports/${r.id}/manual-confirm`, { body: {} }).then(() => setConfirmed(true)).catch(() => undefined)} className="btn btn-ghost w-full text-sm sm:w-auto" data-testid="manual-confirm">
              I’ve submitted it there
            </button>
          ) : (
            <p className="text-sm font-semibold text-road-600">Noted — thanks for completing it on the official portal.</p>
          )}
        </div>
      )}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link href={`/reports/${r.id}`} className="btn btn-primary" data-testid="track">
          Track My Report
        </Link>
        <button onClick={onAnother} className="btn btn-secondary">
          Report Another Pothole
        </button>
      </div>
    </motion.div>
  );
}
