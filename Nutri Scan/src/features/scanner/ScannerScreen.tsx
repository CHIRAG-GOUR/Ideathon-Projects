'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CameraOff, ImagePlus, Keyboard, RefreshCcw, ScanLine, Search, ShieldAlert, SwitchCamera, X } from 'lucide-react';
import type { ScanResult } from '@/types';
import type { CameraErrorKind, Facing } from '@/lib/camera';
import { fileToBitmap, prepareImage, type PreparedImage } from '@/lib/image/prepare';
import { recognizePhoto, recognizeQuery, type PipelineOutcome } from '@/lib/recognition/pipeline';
import { CATEGORY_META } from '@/lib/food/meta';
import { useKitchen } from '@/features/food/store';
import { ResultView } from '@/features/recognition/ResultView';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toast } from '@/components/ui/Toast';
import { FoodForm } from '@/features/food/FoodForm';
import { CameraView, type CameraHandle } from './CameraView';
import { feedback } from '@/lib/feedback';
import { SearchBox } from './SearchBox';
import { Emoji3D } from '@/components/ui/Emoji3D';

type Phase = 'intro' | 'camera' | 'analyzing' | 'searching' | 'result' | 'error';

const CAMERA_ERRORS: Record<CameraErrorKind, string> = {
  denied: 'Camera permission was blocked.',
  insecure: 'The camera only works on a secure (https) page.',
  'no-camera': 'No camera was found on this device.',
  'in-use': 'Another app may be using the camera.',
  unsupported: 'This browser can’t open the camera.',
  unknown: 'The camera didn’t start.',
};

export function ScannerScreen() {
  const router = useRouter();
  const recordScan = useKitchen((s) => s.recordScan);
  const addFood = useKitchen((s) => s.addFood);
  const cam = useRef<CameraHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [facing, setFacing] = useState<Facing>('environment');
  const [camState, setCamState] = useState<{ state: 'starting' | 'live' | 'error'; error?: CameraErrorKind }>({ state: 'starting' });
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [dots, setDots] = useState(0);
  const [camKey, setCamKey] = useState(0);
  const [flash, setFlash] = useState(0);
  const [query, setQuery] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  // Skip the explainer if camera access was already granted before.
  useEffect(() => {
    const perms = navigator.permissions as Permissions | undefined;
    perms
      ?.query({ name: 'camera' as PermissionName })
      .then((p) => {
        if (p.state === 'granted') setPhase((ph) => (ph === 'intro' ? 'camera' : ph));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (phase !== 'analyzing' && phase !== 'searching') return;
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 380);
    return () => clearInterval(t);
  }, [phase]);

  const handleOutcome = useCallback(
    (out: PipelineOutcome, source: 'photo' | 'text') => {
      if (!out.ok) {
        feedback.unsure();
        setError(out.message);
        setPhase('error');
        return;
      }
      setResult(out.result);
      setPhase('result');
      const r = out.result;
      recordScan({
        type: r.type,
        name: r.type === 'food' ? r.product.name : r.type === 'non_food' ? r.object : 'Not sure',
        emoji: r.type === 'unknown' ? '🤔' : r.emoji,
        detail: r.type === 'food' ? (r.score ? `Nutri score ${r.score.grade}` : CATEGORY_META[r.product.category].label) : r.type === 'non_food' ? 'Not food' : 'Couldn’t identify',
        confidence: r.confidence,
        food: r.type === 'food' ? { product: r.product, grade: r.score?.grade ?? null, source } : null,
      });
      if (r.type === 'food') feedback.food();
      else if (r.type === 'non_food') feedback.notFood();
      else feedback.unsure();
    },
    [recordScan]
  );

  const analyze = useCallback(
    async (prepared: PreparedImage) => {
      setImage(prepared);
      setQuery(null);
      setPhase('analyzing');
      setError(null);
      handleOutcome(await recognizePhoto(prepared), 'photo');
    },
    [handleOutcome]
  );

  /** Typed search: "2 aloo parathas with curd", "veg thali", "pasta". */
  const search = useCallback(
    async (q: string) => {
      setTyping(false);
      setImage(null);
      setQuery(q);
      setPhase('searching');
      setError(null);
      handleOutcome(await recognizeQuery(q), 'text');
    },
    [handleOutcome]
  );

  // /scan?q=… runs a search straight away (e.g. from the home page).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q && q.trim().length >= 2) search(q.trim().slice(0, 200));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const frame = cam.current?.capture();
    if (!frame) {
      toast('Camera isn’t ready yet', 'info');
      return;
    }
    feedback.shutter();
    setFlash((n) => n + 1);
    analyze(prepareImage(frame));
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const bmp = await fileToBitmap(file);
      analyze(prepareImage(bmp));
    } catch (err) {
      setError((err as Error).message || 'That image couldn’t be opened.');
      setPhase('error');
    }
  };

  const scanAgain = () => {
    const wasSearch = query !== null;
    setResult(null);
    setImage(null);
    setError(null);
    setQuery(null);
    // After a typed search, go back to the search box rather than forcing the camera open.
    setPhase(wasSearch ? 'intro' : 'camera');
  };

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const upload = () => fileInput.current?.click();

  return (
    <div className="min-h-[100dvh] bg-cloud-100">
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="upload-input" />

      {/* ---------- Explainer (camera is never requested before this) ---------- */}
      {phase === 'intro' && (
        <div className="page flex min-h-[100dvh] flex-col justify-center py-10" data-testid="scan-intro">
          <button onClick={close} className="btn btn-ghost absolute right-3 top-[max(12px,env(safe-area-inset-top))] h-11 w-11 min-h-0 p-0" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card mx-auto w-full max-w-md p-7 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-aqua-50">
              <Camera className="h-9 w-9 text-aqua-600" />
            </div>
            <h1 className="h-display mt-5 text-3xl">Scan Your Food</h1>
            <p className="mt-2 text-ink-soft">We use your camera to recognize food and read labels. Photos are analyzed and then discarded.</p>
            <button onClick={() => setPhase('camera')} className="btn btn-primary btn-lg mt-6 w-full" data-testid="open-camera">
              <Camera className="h-5 w-5" /> Open Camera
            </button>
            <button onClick={upload} className="btn btn-secondary btn-lg mt-2 w-full">
              <ImagePlus className="h-5 w-5" /> Upload Photo
            </button>
            <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              <span className="h-px flex-1 bg-cloud-300" /> or type it <span className="h-px flex-1 bg-cloud-300" />
            </div>
            <SearchBox onSearch={search} />
          </motion.div>
        </div>
      )}

      {/* ---------- Live camera ---------- */}
      {(phase === 'camera' || phase === 'analyzing') && (
        <div className="fixed inset-0 z-30 flex flex-col bg-gradient-to-b from-[#EAF6FF] via-cloud-100 to-lilac-100" data-testid="scanner">
          <div className="relative z-10 flex items-start justify-between gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">Scan Anything</h1>
              <p className="text-sm font-semibold text-ink-soft">Food, products, objects — let’s see what you’ve got.</p>
            </div>
            <div className="flex flex-none gap-2">
              <button onClick={() => setTyping(true)} disabled={phase === 'analyzing'} className="btn h-11 min-h-0 bg-white/90 px-3.5 text-sm text-ink shadow-soft" aria-label="Type a food or meal instead" data-testid="type-instead">
                <Search className="h-4 w-4" /> Type
              </button>
              <button onClick={close} className="btn h-11 w-11 min-h-0 bg-white/90 p-0 text-ink shadow-soft" aria-label="Close scanner" data-testid="close-scanner">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative mx-3 flex-1 overflow-hidden rounded-[32px] bg-cloud-300">
            {phase === 'camera' && <CameraView key={camKey} ref={cam} facing={facing} onStatus={setCamState} />}
            {phase === 'analyzing' && image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.dataUrl} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" data-testid="frozen-frame" />
            )}

            {/* Scanning frame */}
            {(camState.state === 'live' || phase === 'analyzing') && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[62%] w-[82%] max-w-md rounded-[36px] transition-shadow duration-300" style={{ boxShadow: '0 0 0 9999px rgba(245, 248, 254, 0.3)' }}>
                  {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                    <span
                      key={c}
                      className={`absolute h-12 w-12 border-[5px] border-white ${c === 'tl' ? '-left-1 -top-1 rounded-tl-[36px] border-b-0 border-r-0' : c === 'tr' ? '-right-1 -top-1 rounded-tr-[36px] border-b-0 border-l-0' : c === 'bl' ? '-bottom-1 -left-1 rounded-bl-[36px] border-r-0 border-t-0' : '-bottom-1 -right-1 rounded-br-[36px] border-l-0 border-t-0'}`}
                      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
                    />
                  ))}
                  <span className="absolute left-5 right-5 h-[3px] animate-sweep rounded-full bg-aqua-300 shadow-[0_0_16px_3px_rgba(126,228,211,0.9)]" />
                </div>
              </div>
            )}

            {phase === 'camera' && camState.state === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <Camera className="h-8 w-8 animate-pulse text-aqua-600" />
                <p className="font-bold text-ink-soft">Opening camera…</p>
                <p className="text-sm text-ink-muted">If asked, tap Allow.</p>
              </div>
            )}

            {phase === 'camera' && camState.state === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center p-5" data-testid="camera-error">
                <div className="w-full max-w-sm rounded-4xl bg-white p-6 text-center shadow-lift" role="alert">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50">
                    {camState.error === 'insecure' ? <ShieldAlert className="h-7 w-7 text-coral-500" /> : <CameraOff className="h-7 w-7 text-coral-500" />}
                  </div>
                  <h2 className="mt-3 text-xl font-extrabold text-ink">Camera isn’t available</h2>
                  <p className="mt-1 text-sm text-ink-soft">{CAMERA_ERRORS[camState.error ?? 'unknown']}</p>
                  <ul className="mt-3 space-y-1 text-left text-sm text-ink-soft">
                    <li>• Check camera permissions for this site</li>
                    <li>• Try another browser (Chrome or Safari)</li>
                    <li>• Or use Upload Photo</li>
                  </ul>
                  <div className="mt-4 grid gap-2">
                    <button onClick={upload} className="btn btn-primary">
                      <ImagePlus className="h-4 w-4" /> Upload Photo
                    </button>
                    <button onClick={() => setCamKey((k) => k + 1)} className="btn btn-secondary" data-testid="camera-retry">
                      <RefreshCcw className="h-4 w-4" /> Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {flash > 0 && (
              <motion.div key={flash} className="pointer-events-none absolute inset-0 z-20 bg-white" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} aria-hidden />
            )}

            <AnimatePresence>
              {phase === 'analyzing' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-6 flex justify-center px-4" aria-live="polite">
                  <div className="flex items-center gap-3 rounded-full bg-white/95 px-5 py-3 font-bold text-ink shadow-lift" data-testid="analyzing">
                    <span className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="h-2 w-2 rounded-full bg-aqua-500" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                      ))}
                    </span>
                    Looking at your food{'.'.repeat(dots)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="relative z-10 grid grid-cols-3 items-center px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5">
            <button onClick={upload} disabled={phase === 'analyzing'} className="btn mx-auto h-14 w-14 min-h-0 flex-col gap-0.5 bg-white/90 p-0 text-ink shadow-soft" aria-label="Upload photo" data-testid="upload-button">
              <ImagePlus className="h-6 w-6" />
            </button>
            <button
              onClick={capture}
              disabled={phase !== 'camera' || camState.state !== 'live'}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white p-1.5 shadow-lift transition active:scale-95 disabled:opacity-60"
              aria-label="Capture photo"
              data-testid="capture"
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-aqua-300 to-[#9CD8FF] text-aqua-900">
                <ScanLine className="h-8 w-8" />
              </span>
            </button>
            <button
              onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
              disabled={phase !== 'camera'}
              className="btn mx-auto h-14 w-14 min-h-0 bg-white/90 p-0 text-ink shadow-soft"
              aria-label={facing === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
              data-testid="switch-camera"
            >
              <SwitchCamera className="h-6 w-6" />
            </button>
            <span className="text-center text-[11px] font-bold text-ink-muted">Upload</span>
            <span className="text-center text-[11px] font-bold text-ink-muted">Capture</span>
            <span className="text-center text-[11px] font-bold text-ink-muted">{facing === 'environment' ? 'Back cam' : 'Front cam'}</span>
          </div>
        </div>
      )}

      {/* ---------- Typed search in progress ---------- */}
      {phase === 'searching' && (
        <div className="page flex min-h-[100dvh] flex-col items-center justify-center py-10 text-center" data-testid="searching" aria-live="polite">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[40px] bg-gradient-to-br from-aqua-100 to-lilac-100 shadow-soft">
            <motion.span animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <Emoji3D emoji="🍛" size={84} eager />
            </motion.span>
            <span className="absolute inset-x-6 h-0.5 animate-sweep rounded-full bg-aqua-400 shadow-[0_0_12px_2px_rgba(79,211,191,0.6)]" />
          </div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-lilac-500">Looking it up</p>
          <p className="mt-1 max-w-sm text-2xl font-extrabold text-ink">“{query}”</p>
          <p className="mt-2 text-ink-muted">Working out what’s on the plate{'.'.repeat(dots)}</p>
        </div>
      )}

      {/* ---------- Result ---------- */}
      {phase === 'result' && result && (
        <div className="pb-10">
          <div className="fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-30">
            <button onClick={close} className="btn h-11 w-11 min-h-0 bg-white/95 p-0 text-ink shadow-soft" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto max-w-xl">
            <ResultView key={image?.dataUrl.slice(-24) ?? query ?? 'r'} result={result} image={image?.dataUrl ?? null} thumb={image?.thumb ?? null} onScanAgain={scanAgain} />
          </div>
        </div>
      )}

      {/* ---------- Errors ---------- */}
      {phase === 'error' && (
        <div className="page flex min-h-[100dvh] flex-col items-center justify-center py-10" data-testid="scan-error">
          <motion.div initial={{ x: 0 }} animate={{ x: [0, -8, 8, -5, 5, 0] }} transition={{ duration: 0.45 }} className="card w-full max-w-md p-7 text-center">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.dataUrl} alt="" className="mx-auto mb-4 h-28 w-28 rounded-3xl object-cover" />
            )}
            <p className="text-4xl">😕</p>
            <h1 className="mt-2 text-xl font-extrabold text-ink">{error}</h1>
            <div className="mt-6 grid gap-2">
              <button onClick={scanAgain} className="btn btn-primary btn-lg">
                <RefreshCcw className="h-5 w-5" /> Try Again
              </button>
              <button onClick={upload} className="btn btn-secondary">
                <ImagePlus className="h-4 w-4" /> Upload Photo
              </button>
              <button onClick={() => setManual(true)} className="btn btn-ghost">
                <Keyboard className="h-4 w-4" /> Enter Manually
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomSheet open={typing} onClose={() => setTyping(false)} title="Type a food or meal">
        <SearchBox onSearch={search} autoFocus />
      </BottomSheet>

      <BottomSheet open={manual} onClose={() => setManual(false)} title="Add food manually">
        <FoodForm
          initial={{ name: '', brand: null, category: 'other', quantity: 1, unit: 'pcs', storage: 'pantry', expiryDate: null, expirySource: null, price: null, keepPhoto: false }}
          submitLabel="Save to My Food"
          onSubmit={(v) => {
            addFood({ ...v, photo: null, nutrition: null, allergens: null, expirySource: v.expiryDate ? 'user' : null });
            setManual(false);
            toast('Added to My Food');
            router.push('/food');
          }}
        />
      </BottomSheet>
    </div>
  );
}
