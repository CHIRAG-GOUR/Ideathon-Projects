'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { hasNative, invoke } from '@/lib/native';
import { Button, Card, Field, cn, inputCls } from '@/components/ui';

/** Escape tool: a pretend incoming call. It is NOT an emergency feature and contacts no one. */
export function FakeCall() {
  const [caller, setCaller] = useState('Mom');
  const [delay, setDelay] = useState(10);
  const [phase, setPhase] = useState<'setup' | 'waiting' | 'ringing' | 'talking'>('setup');
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => {
    clearTimeout(timer.current);
    invoke('ringtone', { play: false });
  }, []);
  useEffect(() => {
    if (phase !== 'talking') return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const ring = () => {
    setPhase('ringing');
    if (hasNative()) invoke('ringtone', { play: true });
    else navigator.vibrate?.([800, 600, 800, 600, 800]);
  };
  const stop = (next: 'setup' | 'talking') => {
    invoke('ringtone', { play: false });
    setSecs(0);
    setPhase(next);
  };

  if (phase === 'ringing' || phase === 'talking') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-[#2d2a32] to-[#111] px-8 py-16 text-white">
        <div className="text-center">
          <p className="text-sm text-white/60">{phase === 'ringing' ? 'Incoming call' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}</p>
          <motion.div className="mx-auto mt-6 grid h-28 w-28 place-items-center rounded-full bg-white/10 text-5xl font-bold" animate={phase === 'ringing' ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2 }}>
            {caller.charAt(0).toUpperCase()}
          </motion.div>
          <h2 className="mt-4 text-3xl font-semibold">{caller}</h2>
          <p className="text-white/60">Mobile</p>
        </div>
        <div className="flex w-full max-w-xs justify-between">
          <button aria-label="Decline" onClick={() => stop('setup')} className="grid h-16 w-16 place-items-center rounded-full bg-[#e5484d] text-2xl">
            ✆
          </button>
          {phase === 'ringing' && (
            <motion.button aria-label="Answer" onClick={() => stop('talking')} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="grid h-16 w-16 place-items-center rounded-full bg-[#30a46c] text-2xl">
              ✆
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-blush-50">
        <p className="text-sm text-ink-soft">
          A pretend incoming call to help you leave an uncomfortable situation. <b>This does not contact anyone.</b> For real danger, use SOS.
        </p>
      </Card>
      <Field label="Caller name">
        <input className={inputCls} value={caller} onChange={(e) => setCaller(e.target.value)} maxLength={30} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-soft">Ring after</p>
        <div className="flex gap-2">
          {[0, 10, 30, 60].map((d) => (
            <button key={d} onClick={() => setDelay(d)} className={cn('flex-1 rounded-2xl py-2.5 font-bold', delay === d ? 'bg-ink text-white' : 'bg-white shadow-soft')}>
              {d === 0 ? 'Now' : d < 60 ? `${d}s` : '1 min'}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        {phase === 'waiting' ? (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button big variant="white" className="w-full" onClick={() => (clearTimeout(timer.current), setPhase('setup'))}>
              Waiting to ring… tap to cancel
            </Button>
          </motion.div>
        ) : (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              big
              variant="dark"
              className="w-full"
              onClick={() => {
                if (!delay) return ring();
                setPhase('waiting');
                timer.current = setTimeout(ring, delay * 1000);
              }}
            >
              Schedule fake call
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-center text-xs text-ink-muted">Uses your phone&apos;s own ringtone.</p>
    </div>
  );
}
