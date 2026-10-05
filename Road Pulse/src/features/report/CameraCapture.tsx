'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SwitchCamera, X } from 'lucide-react';

/** Real device camera (getUserMedia), rear camera first, switchable where the device has more than one. */
export function CameraCapture({ onCapture, onClose, onError }: { onCapture: (c: HTMLCanvasElement) => void; onClose: () => void; onError: (msg: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [canSwitch, setCanSwitch] = useState(false);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      stream.current?.getTracks().forEach((t) => t.stop());
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('insecure'), { name: 'NotSupportedError' });
        const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: isPortrait ? 1080 : 1920 },
            height: { ideal: isPortrait ? 1920 : 1080 },
            aspectRatio: isPortrait ? { ideal: 9 / 16 } : { ideal: 16 / 9 },
            frameRate: { ideal: 60, min: 30 },
          },
          audio: false,
        });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        video.current!.srcObject = s;
        await video.current!.play();
        setReady(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1);
      } catch (err) {
        const name = (err as Error).name;
        onError(name === 'NotAllowedError' ? 'Camera permission was blocked. You can upload a photo instead.' : name === 'NotFoundError' ? 'No camera was found. You can upload a photo instead.' : 'The camera couldn’t be started. You can upload a photo instead.');
      }
    })();
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    setFlash((n) => n + 1);
    stream.current?.getTracks().forEach((t) => t.stop());
    onCapture(c);
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-3xl sm:rounded-4xl bg-black ring-1 ring-paper-300 shadow-2xl" data-testid="camera">
      <div className="relative h-[68vh] sm:h-[520px] aspect-[9/16] sm:aspect-[4/3] w-full flex items-center justify-center bg-black overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {ready && (
          <div className="pointer-events-none absolute inset-[8%] rounded-3xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
            <span className="absolute inset-x-4 h-0.5 animate-sweep rounded-full bg-amber-300 shadow-[0_0_14px_3px_rgba(246,176,42,0.8)]" />
          </div>
        )}
        {!ready && <p className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white/70">Opening camera…</p>}
        {flash > 0 && <motion.div key={flash} className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />}
        <p className="absolute left-4 top-4 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-soft">📸 Point at road pothole · keep surface in view</p>
      </div>
      <div className="grid grid-cols-3 items-center bg-white px-6 py-4">
        <button onClick={onClose} className="btn btn-ghost mx-auto h-12 w-12 min-h-0 p-0" aria-label="Close camera">
          <X className="h-6 w-6" />
        </button>
        <button onClick={capture} disabled={!ready} className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-graphite/15 bg-white shadow-lift transition active:scale-95 disabled:opacity-50" aria-label="Take photo" data-testid="shutter">
          <span className="h-14 w-14 rounded-full bg-pothole-500" />
        </button>
        <button onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} disabled={!canSwitch} className="btn btn-ghost mx-auto h-12 w-12 min-h-0 p-0 disabled:opacity-30" aria-label="Switch camera">
          <SwitchCamera className="h-6 w-6" />
        </button>
      </div>
    </motion.div>
  );
}
