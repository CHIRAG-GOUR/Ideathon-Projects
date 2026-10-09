'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CameraOff, CheckCircle2, Keyboard, Loader2, RefreshCcw, ShieldAlert, SwitchCamera, Zap, ZapOff } from 'lucide-react';
import {
  BarcodeEngine,
  CameraErrorKind,
  EngineName,
  classifyCameraError,
  createBarcodeEngine,
  openCamera,
  setTorch,
  trackSupportsTorch,
  tuneCameraTrack,
} from '@/lib/barcodeEngine';
import { cn } from '@/lib/utils';

export type ScannerStatus = 'idle' | 'requesting' | 'scanning' | 'found' | 'error';


interface Props {
  /** Return true if the code matched a product (scanning pauses), false to keep scanning. */
  onCode: (code: string) => boolean;
  onManualEntry: () => void;
  /** Bumped by the parent to resume scanning after a result ("Scan Another"). */
  resumeSignal: number;
  className?: string;
}

const ERROR_COPY: Record<CameraErrorKind, { title: string; body: string }> = {
  denied: {
    title: 'Camera access is needed',
    body: 'Allow camera access to scan products. Look for the camera icon in your browser’s address bar, choose “Allow”, then try again.',
  },
  insecure: {
    title: 'Camera needs a secure connection',
    body: 'Browsers only open the camera on https:// pages or on localhost. Open the site with https (for example the deployed link), or enter the barcode manually.',
  },
  'no-camera': {
    title: 'No camera found',
    body: 'We couldn’t find a camera on this device. Plug one in, or enter the barcode manually.',
  },
  'in-use': {
    title: 'The camera is busy',
    body: 'Another app or browser tab may be using the camera. Close it and try again.',
  },
  unsupported: {
    title: 'This browser can’t open the camera',
    body: 'Try the latest Chrome, Safari or Edge — or enter the barcode manually.',
  },
  unknown: {
    title: 'The camera didn’t start',
    body: 'Something went wrong while opening the camera. Try again, or enter the barcode manually.',
  },
};

export function LiveScanner({ onCode, onManualEntry, resumeSignal, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<BarcodeEngine | null>(null);
  const loopRef = useRef<{ running: boolean; id: number; timer?: ReturnType<typeof setTimeout> }>({ running: false, id: 0 });
  // Each start() gets a generation number so a slow, superseded camera request can't take over.
  const genRef = useRef(0);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [engineName, setEngineName] = useState<EngineName | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hint, setHint] = useState(false);

  const stopLoop = useCallback(() => {
    loopRef.current.running = false;
    if (loopRef.current.timer) clearTimeout(loopRef.current.timer);
  }, []);

  const stopCamera = useCallback(() => {
    genRef.current += 1;
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopLoop]);

  const startLoop = useCallback(() => {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video) return;
    stopLoop();
    loopRef.current.running = true;
    const loopId = ++loopRef.current.id;
    const alive = () => loopRef.current.running && loopRef.current.id === loopId;
    const interval = engine.name === 'native' ? 90 : 40;

    const tick = async () => {
      if (!alive()) return;
      const started = performance.now();
      let code: string | null = null;
      try {
        code = await engine.detect(video);
      } catch {
        code = null;
      }
      if (!alive()) return;
      if (code && onCodeRef.current(code)) {
        loopRef.current.running = false;
        video.pause(); // freeze the frame that was recognised
        setStatus('found');
        return;
      }
      const elapsed = performance.now() - started;
      loopRef.current.timer = setTimeout(tick, Math.max(0, interval - elapsed));
    };
    tick();
  }, [stopLoop]);

  const start = useCallback(
    async (requestedDeviceId?: string) => {
      stopCamera();
      const gen = genRef.current;
      setErrorKind(null);
      setStatus('requesting');
      try {
        const [stream, engine] = await Promise.all([
          openCamera(requestedDeviceId),
          engineRef.current ? Promise.resolve(engineRef.current) : createBarcodeEngine(),
        ]);
        engineRef.current = engine;
        if (gen !== genRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setEngineName(engine.name);
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play().catch(() => undefined);

        const track = stream.getVideoTracks()[0];
        if (track) {
          await tuneCameraTrack(track);
          setTorchAvailable(trackSupportsTorch(track));
          setTorchOn(false);
          setDeviceId(track.getSettings().deviceId ?? requestedDeviceId);
          track.addEventListener('ended', () => {
            setErrorKind('in-use');
            setStatus('error');
          });
        }

        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          setDevices(all.filter((d) => d.kind === 'videoinput'));
        } catch {
          setDevices([]);
        }

        if (gen !== genRef.current) return;
        setStatus('scanning');
        startLoop();
      } catch (err) {
        if (gen !== genRef.current) return;
        const name = (err as Error)?.name;
        const kind: CameraErrorKind =
          name === 'InsecureContext' ? 'insecure' : name === 'Unsupported' ? 'unsupported' : classifyCameraError(err);
        setErrorKind(kind);
        setStatus('error');
      }
    },
    [startLoop, stopCamera]
  );

  // Open the camera as soon as the page loads.
  useEffect(() => {
    start();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parent asks to scan again.
  useEffect(() => {
    if (resumeSignal === 0) return;
    const video = videoRef.current;
    if (streamRef.current && streamRef.current.getVideoTracks().some((t) => t.readyState === 'live') && video) {
      video.play().catch(() => undefined);
      setStatus('scanning');
      startLoop();
    } else {
      start(deviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSignal]);

  // Show the "move closer" nudge only after a few seconds of searching.
  useEffect(() => {
    if (status !== 'scanning') {
      setHint(false);
      return;
    }
    const t = setTimeout(() => setHint(true), 6000);
    return () => clearTimeout(t);
  }, [status]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    start(next.deviceId);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await setTorch(track, !torchOn);
      setTorchOn(!torchOn);
    } catch {
      setTorchAvailable(false);
    }
  };

  const found = status === 'found';
  const errorCopy = errorKind ? ERROR_COPY[errorKind] : null;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative h-[58vh] min-h-[340px] overflow-hidden rounded-4xl bg-cream-200 ring-1 ring-inset ring-cream-300 sm:h-auto sm:min-h-0 sm:aspect-[4/3]',
          found && 'ring-4 ring-leaf-400'
        )}
      >
        <video
          ref={videoRef}
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-300', status === 'scanning' || found ? 'opacity-100' : 'opacity-0')}
          playsInline
          muted
          autoPlay
          data-testid="scanner-video"
        />

        {/* Scanning frame: soft cream veil outside, clear window inside */}
        {(status === 'scanning' || found) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="relative h-[42%] w-[82%] rounded-[28px] transition-all duration-300"
              style={{ boxShadow: '0 0 0 9999px rgba(255, 251, 243, 0.42)' }}
            >
              {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                <span
                  key={c}
                  className={cn(
                    'absolute h-10 w-10 border-[5px] transition-colors',
                    found ? 'border-leaf-400' : 'border-white',
                    c === 'tl' && '-left-1 -top-1 rounded-tl-[28px] border-b-0 border-r-0',
                    c === 'tr' && '-right-1 -top-1 rounded-tr-[28px] border-b-0 border-l-0',
                    c === 'bl' && '-bottom-1 -left-1 rounded-bl-[28px] border-r-0 border-t-0',
                    c === 'br' && '-bottom-1 -right-1 rounded-br-[28px] border-l-0 border-t-0'
                  )}
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
                />
              ))}
              {!found && (
                <span className="absolute left-4 right-4 h-[3px] animate-scan-sweep rounded-full bg-leaf-400 shadow-[0_0_14px_2px_rgba(93,178,119,0.8)]" />
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {found && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-leaf-700 shadow-lift"
            >
              <CheckCircle2 className="h-5 w-5 text-leaf-500" /> Barcode detected
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting for permission */}
        {(status === 'idle' || status === 'requesting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft">
              <Camera className="h-7 w-7 text-leaf-600" />
            </div>
            <p className="font-display text-xl font-semibold text-ink">Opening your camera…</p>
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> If your browser asks, tap <strong>Allow</strong>.
            </p>
          </div>
        )}

        {/* Errors (permission denied etc.) */}
        {status === 'error' && errorCopy && (
          <div className="absolute inset-0 flex items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-lift" role="alert">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato-50">
                {errorKind === 'insecure' ? <ShieldAlert className="h-7 w-7 text-tomato-500" /> : <CameraOff className="h-7 w-7 text-tomato-500" />}
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink">{errorCopy.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{errorCopy.body}</p>
              <div className="mt-5 grid gap-2">
                {errorKind !== 'insecure' && errorKind !== 'unsupported' && (
                  <button onClick={() => start(deviceId)} className="btn btn-primary btn-md">
                    <RefreshCcw className="h-4 w-4" /> Try Again
                  </button>
                )}
                <button onClick={onManualEntry} className="btn btn-secondary btn-md">
                  <Keyboard className="h-4 w-4" /> Enter Barcode Manually
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Camera controls */}
        {status === 'scanning' && (devices.length > 1 || torchAvailable) && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {torchAvailable && (
              <button onClick={toggleTorch} className="btn h-11 w-11 bg-white/90 p-0 text-ink shadow-soft" aria-label={torchOn ? 'Turn light off' : 'Turn light on'}>
                {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </button>
            )}
            {devices.length > 1 && (
              <button onClick={switchCamera} className="btn h-11 w-11 bg-white/90 p-0 text-ink shadow-soft" aria-label="Switch camera">
                <SwitchCamera className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status line */}
      <div className="mt-4 flex min-h-[52px] flex-col items-center justify-center text-center" aria-live="polite">
        {status === 'scanning' && (
          <>
            <p className="flex items-center gap-2 font-bold text-ink">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf-500" />
              </span>
              Looking for a barcode…
            </p>
            <p className={cn('mt-1 text-sm transition-colors', hint ? 'font-semibold text-mango-700' : 'text-ink-muted')}>
              Move closer if the barcode isn’t detected.
            </p>
          </>
        )}
        {found && <p className="font-bold text-leaf-700">✓ Product found — scanning paused</p>}
        {engineName && status === 'scanning' && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint" data-testid="scanner-engine">
            {engineName === 'native' ? 'Built-in barcode detector' : 'ZXing barcode reader'}
          </p>
        )}
      </div>
    </div>
  );
}
