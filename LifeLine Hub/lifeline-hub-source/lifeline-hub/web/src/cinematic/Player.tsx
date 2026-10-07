'use client';
/**
 * EXPERIENCE LIFELINE — the player. Owns the film clock, waits at the SOS hold-point for the viewer to activate
 * LifeLine SOS for real (the same 3-second SOSControl the app uses — it triggers nothing outside this film),
 * layers the product UI over the 3D film, and mixes the synthesised score, ambience, effects and voices.
 * Everything shown is a dramatization: people, places, vehicles, services and ETAs are fictional / simulated.
 */
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SOSControl } from '@/components/lifeline/SOSControl';
import { RadarView } from '@/components/lifeline/RadarView';
import { DEMO_FIX, demoRadar } from '@/services/georadar/radar';
import { LAYER_IDS, sound, speak, stopSpeaking } from '@/services/sound';
import { Icon, type IconName } from '@/ui/icons';
import { Mark } from '@/ui/brand';
import { cx } from '@/ui/kit';
import { CUES, DURATION, SHOTS, T_SOS, clamp, shotAt, type Shot } from './timeline';
import type { Quality } from './Film';

const Film = dynamic(() => import('./Film'), { ssr: false, loading: () => <div className="absolute inset-0 grid place-items-center bg-midnight-950"><span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" /></div> });

const CHAPTERS = SHOTS.reduce<{ name: string; at: number }[]>((a, s) => (a.length && a[a.length - 1].name === s.chapter ? a : [...a, { name: s.chapter, at: s.start }]), []);
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const SOS_WAIT_HINT = 12; // seconds before "continue without activating" appears

export default function Player({ onTrySos }: { onTrySos?: () => void }) {
  const clock = useRef({ t: 0 }).current;
  const box = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [waitedFor, setWaitedFor] = useState(0);
  const [sosDone, setSosDone] = useState<null | 'you' | 'auto'>(null);
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [volume, setVolume] = useState(0.85);
  const [quality, setQuality] = useState<Quality>('high');
  const [fs, setFs] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [fps, setFps] = useState(0);
  const st = useRef({ playing, waiting, sosDone, sfx });
  st.current = { playing, waiting, sosDone, sfx };
  const spoken = useRef(new Set<string>());

  // ---- device-appropriate quality (and a fallback if the GPU can't keep up)
  useEffect(() => {
    const small = window.matchMedia('(max-width: 760px)').matches;
    const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
    if (small || weak) setQuality('low');
  }, []);
  const lowFrames = useRef(0);
  const onFps = useCallback((f: number) => {
    setFps(f);
    if (f < 22 && st.current.playing) { lowFrames.current++; if (lowFrames.current >= 4) setQuality('low'); } else lowFrames.current = 0;
  }, []);

  // ---- the clock
  useEffect(() => {
    let raf = 0, last = performance.now(), ui = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = st.current;
      if (s.playing && !s.waiting) {
        const prev = clock.t;
        let next = prev + dt;
        if (!s.sosDone && prev < T_SOS && next >= T_SOS) { next = T_SOS; setWaiting(true); setWaitedFor(0); }
        if (next >= DURATION) { next = DURATION; setPlaying(false); }
        clock.t = next;
        if (s.sfx) for (const c of CUES) if (prev < c.at && next >= c.at) (sound[c.play] as (at?: number) => void)();
      }
      if (s.waiting) setWaitedFor((w) => w + dt);
      ui += dt;
      if (ui > 0.08) { ui = 0; setT(clock.t); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clock]);

  const shot = shotAt(t);
  const local = t - shot.start;

  // ---- audio: per-shot mix, voices, pause = silence
  useEffect(() => {
    if (!started) return;
    if (!playing) { sound.silenceAll(0.4); stopSpeaking(); return; }
    const mix = waiting ? SHOTS.find((s) => s.id === 'interactive')!.mix : shot.mix;
    LAYER_IDS.forEach((id) => sound.level(id, (mix[id] ?? 0) * 0.9, 1.4));
  }, [started, playing, waiting, shot.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing || !sfx) return;
    shot.captions?.forEach((c, i) => {
      const k = `${shot.id}-${i}`;
      if (c.voice && local >= c.at && local < c.to && !spoken.current.has(k)) { spoken.current.add(k); speak(c.text, { rate: 1.08, pitch: i % 2 ? 1.15 : 0.9 }); }
    });
  }, [t, playing, sfx, shot, local]);
  useEffect(() => { sound.setSfx(sfx); }, [sfx]);
  useEffect(() => { sound.setMusic(music); }, [music]);
  useEffect(() => { sound.setVolume(volume); }, [volume]);
  useEffect(() => () => { sound.silenceAll(0.2); stopSpeaking(); setTimeout(() => sound.stopAll(), 400); }, []);

  // ---- controls
  const seek = useCallback((to: number) => {
    clock.t = clamp(to, 0, DURATION);
    spoken.current.clear();
    stopSpeaking();
    setWaiting(false);
    if (to < T_SOS) setSosDone(null);
    else if (!st.current.sosDone) setSosDone('auto');
    setT(clock.t);
  }, [clock]);
  const start = () => { sound.unlock(); setStarted(true); setPlaying(true); };
  const toggle = () => { sound.unlock(); if (clock.t >= DURATION) { seek(0); setPlaying(true); return; } setPlaying((p) => !p); };
  const restart = () => { sound.unlock(); seek(0); setSosDone(null); setPlaying(true); setStarted(true); };
  const skipToSos = () => { sound.unlock(); seek(T_SOS - 4.2); setSosDone(null); setPlaying(true); setStarted(true); };
  const activated = (who: 'you' | 'auto') => { setSosDone(who); setTimeout(() => setWaiting(false), who === 'you' ? 1400 : 200); };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await box.current?.requestFullscreen(); } catch { /* not allowed */ }
  };
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!started || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ') { e.preventDefault(); toggle(); } else if (e.key === 'm') setSfx((v) => !v); else if (e.key === 'f') void fullscreen();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  // controls fade while playing; any pointer movement brings them back
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const poke = () => { setChrome(true); clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setChrome(false), 2600); };
  useEffect(() => { if (!playing) setChrome(true); else poke(); }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const ended = t >= DURATION - 0.01;
  return (
    <div ref={box} onPointerMove={poke} onPointerDown={poke} className={cx('relative isolate overflow-hidden bg-black text-white', fs ? 'h-screen w-screen' : 'aspect-[4/5] w-full rounded-[28px] shadow-lift ring-1 ring-white/10 sm:aspect-video')}>
      {/* film */}
      <div className="absolute inset-0" style={shot.id === 'mirror' ? { transform: 'scaleX(-1)' } : undefined}>
        {started && <Film clock={clock} quality={quality} onFps={onFps} className="!absolute inset-0" />}
      </div>
      {started && <ShotDressing shot={shot} local={local} />}
      {started && <Transition shot={shot} local={local} />}

      {/* product overlays, tied to the film clock */}
      {started && <Overlays shot={shot} local={local} sosDone={sosDone} />}

      {/* captions */}
      {started && <Captions shot={shot} local={local} />}

      {/* HUD: camera + honesty */}
      {started && !waiting && shot.id !== 'final' && (
        <div className={cx('pointer-events-none absolute left-3 top-3 flex items-center gap-2 transition-opacity sm:left-5 sm:top-5', chrome || !playing ? 'opacity-100' : 'opacity-60')}>
          {shot.cam && <span className="rounded-md bg-black/45 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] text-white/80 backdrop-blur">{shot.cam}</span>}
          <span className="hidden rounded-md bg-black/45 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-white/60 backdrop-blur sm:inline">{fmt(t)}</span>
        </div>
      )}
      {started && !waiting && (
        <div className="pointer-events-none absolute right-3 top-3 sm:right-5 sm:top-5">
          <span className="rounded-md bg-violet-500/25 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-violet-100 ring-1 ring-inset ring-violet-300/30 backdrop-blur">Dramatization · fictional people &amp; services</span>
        </div>
      )}

      {/* the interactive SOS */}
      <AnimatePresence>{waiting && <YourTurn key="yt" waitedFor={waitedFor} onActivated={() => activated('you')} onSkip={() => activated('auto')} done={sosDone === 'you'} />}</AnimatePresence>

      {/* poster */}
      <AnimatePresence>{!started && <Poster key="poster" onPlay={start} />}</AnimatePresence>

      {/* end */}
      <AnimatePresence>{ended && <EndActions key="end" onReplay={restart} onTrySos={onTrySos} you={sosDone === 'you'} />}</AnimatePresence>

      {/* controls */}
      {started && (
        <motion.div initial={false} animate={{ opacity: chrome || !playing || waiting ? 1 : 0, y: chrome || !playing || waiting ? 0 : 8 }} className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10 sm:px-5 sm:pb-4">
          <Scrubber t={t} onSeek={(v) => { sound.unlock(); seek(v); }} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Ctl icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onClick={toggle} primary />
            <Ctl icon="restart" label="Restart" onClick={restart} />
            <Ctl icon="skip" label="Skip to SOS" onClick={skipToSos} text="Skip to SOS" />
            <span className="mx-1 hidden font-mono text-[11px] text-white/60 sm:inline">{fmt(t)} / {fmt(DURATION)}</span>
            <span className="flex-1" />
            <Ctl icon={sfx ? 'volume' : 'mute'} label={sfx ? 'Sound on' : 'Sound off'} onClick={() => setSfx((v) => !v)} active={sfx} />
            <Ctl icon="music" label={music ? 'Music on' : 'Music off'} onClick={() => setMusic((v) => !v)} active={music} />
            <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="hidden w-20 accent-cyan-400 sm:block" />
            <button onClick={() => setQuality((q) => (q === 'high' ? 'low' : 'high'))} className="h-9 rounded-xl px-2.5 font-mono text-[10.5px] font-bold tracking-[0.12em] text-white/80 ring-1 ring-inset ring-white/15 hover:bg-white/10" title={`Rendering ${quality === 'high' ? 'high' : 'lite'} · ${fps.toFixed(0)} fps`}>{quality === 'high' ? 'HD' : 'LITE'}</button>
            <Ctl icon="expand" label={fs ? 'Exit fullscreen' : 'Fullscreen'} onClick={fullscreen} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- controls
function Ctl({ icon, label, onClick, primary, active, text }: { icon: IconName; label: string; onClick: () => void; primary?: boolean; active?: boolean; text?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.92 }} onClick={onClick} aria-label={label} title={label} aria-pressed={active}
      className={cx('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold transition', primary ? 'bg-white text-midnight-950 hover:bg-cyan-50' : 'text-white/90 ring-1 ring-inset ring-white/15 hover:bg-white/10', active === false && 'text-white/45')}>
      <Icon name={icon} size={17} />{text && <span className="hidden sm:inline">{text}</span>}
    </motion.button>
  );
}
function Scrubber({ t, onSeek }: { t: number; onSeek: (t: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const at = (x: number) => { const r = ref.current!.getBoundingClientRect(); return clamp((x - r.left) / r.width) * DURATION; };
  const drag = useRef(false);
  return (
    <div ref={ref} role="slider" aria-label="Film position" aria-valuemin={0} aria-valuemax={DURATION} aria-valuenow={Math.round(t)} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') onSeek(t + 5); if (e.key === 'ArrowLeft') onSeek(t - 5); }}
      onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); onSeek(at(e.clientX)); }}
      onPointerMove={(e) => drag.current && onSeek(at(e.clientX))}
      onPointerUp={() => { drag.current = false; }}
      className="group relative h-5 cursor-pointer touch-none">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20" />
      <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400" style={{ width: `${(t / DURATION) * 100}%` }} />
      {CHAPTERS.map((c) => <span key={c.name} title={c.name} className={cx('absolute top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded', c.at === T_SOS ? 'bg-coral-400' : 'bg-white/40')} style={{ left: `${(c.at / DURATION) * 100}%` }} />)}
      <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition group-hover:scale-110" style={{ left: `${(t / DURATION) * 100}%` }} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- poster / end
function Poster({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }} className="absolute inset-0 z-40 grid place-items-center overflow-hidden bg-midnight-950">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(60% 50% at 70% 30%, rgba(34,211,238,.18), transparent 70%), radial-gradient(50% 50% at 20% 80%, rgba(240,56,74,.16), transparent 70%)' }} />
      <div className="absolute inset-0 grid-lines opacity-30" />
      <div className="relative px-6 text-center">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">A LifeLine Hub film · 2 min · interactive</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-3 font-display text-[34px] font-semibold leading-[1.02] tracking-tight sm:text-[56px]">Experience LifeLine</motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mx-auto mt-3 max-w-md text-[14px] text-midnight-200 sm:text-[15px]">An evening ride home. A hit-and-run. And the moment you hold the SOS yourself.</motion.p>
        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 20 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onPlay}
          className="relative mx-auto mt-7 grid h-20 w-20 place-items-center rounded-full bg-white text-midnight-950 shadow-[0_0_0_10px_rgba(255,255,255,.08),0_20px_50px_-10px_rgba(34,211,238,.6)]" aria-label="Play the film">
          <Icon name="play" size={30} className="translate-x-0.5" />
        </motion.button>
        <p className="mt-6 text-[11.5px] text-midnight-300">Sound recommended · contains a depiction of a road accident (no graphic injury)</p>
      </div>
    </motion.div>
  );
}
function EndActions({ onReplay, onTrySos, you }: { onReplay: () => void; onTrySos?: () => void; you: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-24 z-30 flex flex-wrap items-center justify-center gap-2 px-4 sm:bottom-28">
      {onTrySos && <button onClick={onTrySos} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-coral-500 px-5 text-[14px] font-semibold text-white shadow-coral hover:bg-coral-600"><Icon name="sos" size={18} />Practise SOS in the app</button>}
      <button onClick={onReplay} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/10 px-5 text-[14px] font-semibold text-white ring-1 ring-inset ring-white/20 hover:bg-white/15"><Icon name="restart" size={18} />Watch again</button>
      {you && <span className="hidden w-full text-center text-[12px] text-white/60 sm:block">You activated SOS in this film. In the app, the same hold starts a real alert to your contacts.</span>}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------- transitions & per-shot dressing
function Transition({ shot, local }: { shot: Shot; local: number }) {
  let o = 0, bg = '#000';
  if (shot.enter === 'black') o = 1 - clamp(local / 0.9);
  else if (shot.enter === 'fade') o = 1 - clamp(local / 0.55);
  else if (shot.enter === 'flash') { o = 0.85 * (1 - clamp(local / 0.5)); bg = '#ff3b4f'; }
  // fade out to black at the very end of the parents/hospital shots for rhythm
  if (o <= 0.001) return null;
  return <div className="pointer-events-none absolute inset-0 z-10" style={{ background: bg, opacity: o }} />;
}
function ShotDressing({ shot, local }: { shot: Shot; local: number }) {
  if (shot.id === 'mirror') {
    // the frame is seen *in* the right mirror: everything outside the glass is dark, the glass has a rim and a sheen
    return (
      <div className="pointer-events-none absolute inset-0 z-[5]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 34% 40% at 50% 48%, transparent 98%, #07090d 100%)' }} />
        <div className="absolute left-1/2 top-[48%] h-[80%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] ring-[10px] ring-[#15181e]" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,.7)' }} />
        <div className="absolute left-1/2 top-[48%] h-[80%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.10), transparent 40%)' }} />
      </div>
    );
  }
  if (shot.id === 'pov') return <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 45%, transparent 60%, rgba(0,0,0,.75) 100%)' }} />;
  if (shot.id === 'accident' && local > 2.1 && local < 2.6) return <div className="pointer-events-none absolute inset-0 z-[5] bg-white/25" />;
  return null;
}

function Captions({ shot, local }: { shot: Shot; local: number }) {
  // keyed, enter-only animation: a caption never waits on an exit animation (the film clock drives what's shown)
  const cur = shot.captions?.find((c) => local >= c.at && local < c.to);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[86px] z-20 flex justify-center px-5 sm:bottom-[100px]">
      {cur && (
        <motion.p key={cur.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="max-w-[640px] rounded-xl bg-black/55 px-3.5 py-2 text-center text-[14px] font-medium leading-snug text-white backdrop-blur-md sm:text-[17px]">
          {cur.who && <span className="mr-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-amber-300">{cur.who}</span>}{cur.text}
        </motion.p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- YOUR TURN
function YourTurn({ waitedFor, onActivated, onSkip, done }: { waitedFor: number; onActivated: () => void; onSkip: () => void; done: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4 py-3 backdrop-blur-[3px]">
      <div className="flex h-full w-full max-w-[760px] items-center justify-center gap-10">
        <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="hidden text-left sm:block">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-coral-300">Your turn</p>
          <h3 className="mt-2 font-display text-[26px] font-semibold leading-tight sm:text-[36px]">Activate<br className="hidden sm:block" /> LifeLine SOS</h3>
          <p className="mt-2 max-w-[260px] text-[13.5px] text-white/70">Arjun can barely move. Press and hold the button for 3 seconds — the same hold as in the app.</p>
          <p className="mt-3 text-[11.5px] text-white/45">Inside this film only — nothing is sent anywhere.</p>
        </motion.div>
        {/* phone */}
        <motion.div initial={{ opacity: 0, y: 30, rotate: -3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 20, delay: 0.1 }}
          style={{ aspectRatio: '230 / 430' }}
          className="relative h-[92%] max-h-[430px] rounded-[38px] bg-[#0b0f17] p-2.5 shadow-[0_30px_80px_-20px_rgba(240,56,74,.55)] ring-1 ring-white/15">
          <div className="absolute left-1/2 top-3 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />
          <div className={cx('relative flex h-full flex-col items-center overflow-hidden rounded-[30px] px-3 pb-4 pt-9 transition-colors duration-700', done ? 'surface-emergency' : 'bg-gradient-to-b from-midnight-900 to-midnight-950')}>
            <div className="flex items-center gap-1.5"><Mark size={18} /><span className="font-display text-[12px] font-semibold tracking-wide">LifeLine Hub</span></div>
            <p className={cx('mt-1 font-mono text-[9px] uppercase tracking-[0.2em]', done ? 'text-white/80' : 'text-cyan-300/80')}>{done ? 'SOS active · demo' : 'Emergency ready'}</p>
            <p className="mt-2 text-center font-display text-[13px] font-semibold leading-tight text-coral-200 sm:hidden">Your turn — hold 3 s<br />to activate SOS</p>
            <div className="grid flex-1 place-items-center">
              <SOSControl dark size={116} onActivated={onActivated} label="Press and hold for 3 seconds to activate LifeLine SOS" showCaption />
            </div>
            <p className="hidden text-center text-[10px] text-white/55 sm:block">Location · Health Vault · Family · Guidance</p>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {waitedFor > SOS_WAIT_HINT && !done && (
          <motion.button initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={onSkip} className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-[12.5px] font-semibold text-white/85 ring-1 ring-inset ring-white/20 hover:bg-white/15">
            Continue without activating
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------- product overlays
const STATUSES: { icon: IconName; title: string; sub: string; tone: string }[] = [
  { icon: 'location', title: 'Location locked', sub: 'Demo location · ±9 m', tone: '#22D3EE' },
  { icon: 'vault', title: 'Health Vault ready', sub: 'Responder view prepared', tone: '#3DBB7E' },
  { icon: 'ambulance', title: 'Response identified', sub: 'Nearest ambulance service · 108', tone: '#F0384A' },
  { icon: 'family', title: 'Family alerted', sub: 'Demo Mom · Demo Dad', tone: '#F5B544' },
  { icon: 'ai', title: 'AI guidance ready', sub: 'On-device prototype', tone: '#A78BFA' },
  { icon: 'broadcast', title: 'Emergency broadcast active', sub: 'WhatsApp · SMS · live link', tone: '#22D3EE' },
];

function Overlays({ shot, local, sosDone }: { shot: Shot; local: number; sosDone: null | 'you' | 'auto' }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <AnimatePresence>
        {shot.id === 'emergencyUi' && <EmergencyPanel key="eui" local={local} you={sosDone === 'you'} />}
        {shot.id === 'map' && <RadarPanel key="map" local={local} />}
        {shot.id === 'parents' && local > 1.2 && local < 6.4 && <AlertNotification key="alert" />}
        {(shot.id === 'ambulance' || shot.id === 'rescue') && <SimChip key="sim" text="Simulated response · fictional ambulance service" />}
        {shot.id === 'final' && <EndCard key="end" local={local} />}
      </AnimatePresence>
    </div>
  );
}
function SimChip({ text }: { text: string }) {
  return <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute left-3 top-12 rounded-md bg-black/45 px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-amber-200 backdrop-blur sm:left-5 sm:top-14">{text}</motion.span>;
}
function Glass({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl bg-[#071223]/78 p-4 shadow-[0_30px_70px_-30px_rgba(0,0,0,.9)] ring-1 ring-inset ring-white/12 backdrop-blur-xl', className)}>{children}</div>;
}
function EmergencyPanel({ local, you }: { local: number; you: boolean }) {
  const shown = Math.min(STATUSES.length, Math.floor(local / 0.75) + 1);
  const vault = local > 4.4;
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}
      className="absolute inset-x-3 bottom-[92px] top-14 flex flex-col justify-end gap-3 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-16 sm:w-[340px]">
      <Glass className="!p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="relative grid h-3 w-3 place-items-center"><span className="absolute h-3 w-3 animate-ping rounded-full bg-coral-500/60" /><span className="h-2 w-2 rounded-full bg-coral-500" /></span><span className="font-display text-[15px] font-semibold tracking-wide">SOS ACTIVE</span></div>
          <span className="rounded bg-violet-500/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-violet-100">Simulated</span>
        </div>
        <p className="mt-0.5 text-[11px] text-white/55">{you ? 'Activated by you' : 'Activated for the story'} · 00:{String(Math.min(59, Math.floor(local) + 1)).padStart(2, '0')}</p>
        <ul className="mt-2.5 space-y-1.5">
          {STATUSES.slice(0, shown).map((s) => (
            <motion.li key={s.title} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 ring-1 ring-inset ring-white/8">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${s.tone}26`, color: s.tone }}><Icon name={s.icon} size={15} /></span>
              <span className="min-w-0 flex-1"><b className="block truncate font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]">{s.title}</b><span className="block truncate text-[11px] text-white/55">{s.sub}</span></span>
              <Icon name="check" size={14} className="text-vital-400" />
            </motion.li>
          ))}
        </ul>
      </Glass>
      <AnimatePresence>
        {vault && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="hidden sm:block">
            <Glass className="!p-3.5">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-vital-300">Health Vault · responder view</span><span className="rounded bg-violet-500/25 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-violet-100">Demonstration data</span></div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px]">
                {[['Blood group', 'B+'], ['Allergies', 'None recorded'], ['Medication', 'Salbutamol inhaler'], ['Emergency contact', 'Father · Demo Dad']].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.05] px-2.5 py-1.5 ring-1 ring-inset ring-white/8"><p className="text-[10px] text-white/50">{k}</p><p className={cx('font-semibold', k === 'Blood group' && 'font-display text-[18px] text-coral-300')}>{v}</p></div>
                ))}
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
function RadarPanel({ local }: { local: number }) {
  // the simulated network around the demo location; time is compressed so the simulated ambulance visibly closes in
  const pts = useMemo(() => demoRadar(DEMO_FIX, new Date(0).toISOString(), 1000 * (40 + local * 18)), [Math.floor(local * 4)]); // eslint-disable-line react-hooks/exhaustive-deps
  const eta = Math.max(0, 272 - Math.floor(local));
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-[#040a14]/55 px-3 pb-24 pt-12">
      <div className="flex w-full max-w-[820px] flex-col items-center gap-3 sm:flex-row sm:gap-6">
        <div className="w-[min(78vw,46vh)] sm:w-[min(40vw,52vh)]"><RadarView points={pts} emergency compact label="Geo-Radar" /></div>
        <Glass className="w-full max-w-[300px]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Geo-Radar · response</p>
          <p className="mt-2 text-[11px] text-white/55">Nearest ambulance (simulated)</p>
          <p className="font-display text-[40px] font-semibold leading-none tabular">{`${String(Math.floor(eta / 60)).padStart(2, '0')}:${String(eta % 60).padStart(2, '0')}`}</p>
          <span className="mt-1.5 inline-block rounded bg-violet-500/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-violet-100">Simulated ETA</span>
          <ul className="mt-3 space-y-1 text-[12px] text-white/75">
            <li className="flex items-center gap-2"><Icon name="hospital" size={14} className="text-vital-300" />City General Hospital · emergency</li>
            <li className="flex items-center gap-2"><Icon name="helper" size={14} className="text-amber-300" />LifeLine Helper nearby (demo)</li>
            <li className="flex items-center gap-2"><Icon name="family" size={14} className="text-cyan-300" />Family has the live location</li>
          </ul>
        </Glass>
      </div>
    </motion.div>
  );
}
function AlertNotification() {
  return (
    <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} className="absolute inset-x-3 top-12 mx-auto max-w-[420px] sm:top-14">
      <div className="rounded-[22px] bg-white/92 p-3.5 text-midnight-950 shadow-[0_24px_60px_-20px_rgba(0,0,0,.7)] ring-1 ring-black/5 backdrop-blur-xl">
        <div className="flex items-center gap-2"><Mark size={20} /><span className="text-[11.5px] font-semibold text-ink-muted">LifeLine Hub · now</span><span className="ml-auto rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-violet-600">Demo</span></div>
        <p className="mt-1.5 font-display text-[16px] font-bold tracking-wide text-coral-600">LIFE LINE ALERT</p>
        <p className="text-[13.5px] font-semibold">Arjun needs help — SOS active</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">Live location shared · road accident reported · Health Vault ready for responders</p>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[12px] font-semibold">
          <span className="rounded-xl bg-coral-500 py-1.5 text-center text-white">Call 108</span>
          <span className="rounded-xl bg-clinic-100 py-1.5 text-center">Live location</span>
          <span className="rounded-xl bg-clinic-100 py-1.5 text-center">Call Arjun</span>
        </div>
      </div>
    </motion.div>
  );
}
const CHAIN = ['SOS', 'HEALTH', 'LOCATION', 'GUIDANCE', 'RESPONSE', 'CARE'];
function EndCard({ local }: { local: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center bg-[#030710]/70 px-4 pb-44 text-center sm:pb-24">
      <AnimatePresence mode="wait">
        {local < 3.2 ? (
          <motion.h3 key="a" initial={{ opacity: 0, letterSpacing: '0.5em' }} animate={{ opacity: 1, letterSpacing: '0.22em' }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }} className="font-display text-[22px] font-semibold sm:text-[38px]">FROM INCIDENT TO CARE</motion.h3>
        ) : local < 6.4 ? (
          <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            {CHAIN.map((c, i) => (
              <motion.span key={c} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.3 }} className="flex items-center gap-2 font-mono text-[13px] font-bold tracking-[0.2em] sm:text-[19px]">
                <span className={i === 0 ? 'text-coral-400' : i === CHAIN.length - 1 ? 'text-vital-300' : 'text-cyan-200'}>{c}</span>{i < CHAIN.length - 1 && <span className="text-white/30">·</span>}
              </motion.span>
            ))}
          </motion.div>
        ) : (
          <motion.div key="c" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} className="flex flex-col items-center">
            <Mark size={64} />
            <p className="mt-4 font-display text-[30px] font-semibold tracking-[0.18em] sm:text-[46px]">LIFE LINE HUB</p>
            <p className="mt-2 max-w-md text-[14px] text-white/70 sm:text-[16px]">Futuristic emergency care — instant, intelligent, everywhere.</p>
            <p className="mt-4 hidden max-w-md text-[10.5px] text-white/40 sm:block">A dramatization. LifeLine Hub does not dispatch ambulances or police; it helps you reach your family and the official emergency numbers faster, with your location and medical information ready.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
