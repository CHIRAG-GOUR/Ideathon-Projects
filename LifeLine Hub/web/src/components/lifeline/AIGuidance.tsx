'use client';
/**
 * AIGuidance — an emergency assistant, not a chatbot. "What happened?" → a calming line → (call emergency
 * services first, when high-risk) → one quick check → short numbered steps, with a CPR metronome, timers and
 * optional voice. Prototype guidance engine (on-device, deterministic); it does not diagnose.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { dial } from '@core/native';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Btn, Honest, TypeText, cx } from '@/ui/kit';
import { DISCLAIMER, PROTOCOLS, type Branch, type Protocol, type Step } from '@/services/guidance/protocols';
import { sound, speak, stopSpeaking } from '@/services/sound';

export function AIOrb({ size = 44, busy }: { size?: number; busy?: boolean }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      <motion.span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 via-violet-500 to-cyan-400" animate={{ scale: busy ? [1, 1.08, 1] : [1, 1.03, 1], rotate: [0, 180, 360] }} transition={{ duration: busy ? 1.2 : 6, repeat: Infinity, ease: 'linear' }} style={{ filter: 'blur(0.5px)' }} />
      <span className="absolute inset-[3px] rounded-full bg-white" />
      <Icon name="ai" size={size * 0.48} className="relative text-violet-600" />
    </span>
  );
}

export function AIGuidance({ initial, compact, dark = true }: { initial?: string | null; compact?: boolean; dark?: boolean }) {
  const { lines, prefs, savePrefs, demo, toast, emergency } = useApp();
  const [p, setP] = useState<Protocol | null>(() => PROTOCOLS.find((x) => x.id === initial) ?? null);
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  const [step, setStep] = useState(0);
  const [cpr, setCpr] = useState(false);
  const [voice, setVoice] = useState(prefs.voiceGuidance);
  const emergencyNo = lines[0]?.number ?? '112';
  const branch: Branch | null = p ? (p.branch ?? (answer ? (answer === 'yes' ? p.question!.yes : p.question!.no) : null)) : null;
  const call = () => (demo ? toast(`Demo mode — would call ${emergencyNo}.`) : dial(emergencyNo));

  useEffect(() => {
    if (!voice || !p) return;
    stopSpeaking();
    const s = branch?.steps[step];
    speak(s ? `${s.title}. ${s.detail ?? ''}` : p.question && !answer ? `${p.calm} ${p.question.text}` : p.calm, { rate: 0.95 });
  }, [voice, p, branch, step, answer]);
  useEffect(() => () => stopSpeaking(), []);

  const reset = () => { setP(null); setAnswer(null); setStep(0); setCpr(false); stopSpeaking(); };
  const pick = (x: Protocol) => { sound.unlock(); sound.click(); setP(x); setAnswer(null); setStep(0); };

  const muted = dark ? 'text-ink-muted' : 'text-ink-muted';
  const card = dark ? 'bg-clinic-50 ring-1 ring-inset ring-line' : 'bg-white ring-1 ring-inset ring-line';

  return (
    <div className={cx(dark ? 'text-ink' : 'text-ink')}>
      {/* header */}
      <div className="flex items-center gap-3">
        <AIOrb busy={!!p} />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-violet-600">AI Guidance</p>
          <p className="font-display text-[19px] font-semibold leading-tight">{p ? p.label : 'Stay calm. Know what to do next.'}</p>
        </div>
        <button onClick={() => { const v = !voice; setVoice(v); void savePrefs({ voiceGuidance: v }); if (!v) stopSpeaking(); }} aria-pressed={voice} className={cx('grid h-10 w-10 place-items-center rounded-full', voice ? 'bg-violet-500 text-white' : dark ? 'bg-clinic-100 text-ink-muted' : 'bg-clinic-100 text-ink-muted')} aria-label={voice ? 'Voice guidance on' : 'Voice guidance off'}>
          <Icon name={voice ? 'volume' : 'mute'} size={18} />
        </button>
        {p && <button onClick={reset} className={cx('rounded-full px-3 py-2 text-[12.5px] font-semibold', dark ? 'bg-clinic-100' : 'bg-clinic-100')}>Change</button>}
      </div>

      <AnimatePresence mode="wait">
        {!p ? (
          <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-5">
            <p className="font-display text-[26px] font-semibold tracking-tight">What happened?</p>
            <div className={cx('mt-3 grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
              {PROTOCOLS.map((x, i) => (
                <motion.button key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.97 }} onClick={() => pick(x)}
                  className={cx('flex min-h-[76px] flex-col items-start justify-between rounded-2xl p-3 text-left transition', card, 'hover:ring-violet-200')}>
                  <Icon name={x.icon} size={20} className={x.callFirst ? 'text-coral-400' : 'text-violet-600'} />
                  <span className="text-[14px] font-semibold">{x.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
            {/* calm */}
            <div className={cx('flex gap-3 rounded-3xl p-4', dark ? 'bg-violet-500/10 ring-1 ring-inset ring-violet-200' : 'bg-violet-50')}>
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
              <p className="text-[15px] leading-snug"><TypeText text={`${p.calm} I'm here. Let's do this step by step.`} /></p>
            </div>
            {/* call first */}
            {(p.callFirst || branch?.urgent) && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="flex items-center gap-3 rounded-3xl bg-coral-500 p-4 text-white shadow-coral">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clinic-200"><span className="absolute inset-0 animate-ping rounded-full bg-clinic-200" /><Icon name="phone" size={20} /></span>
                <span className="min-w-0 flex-1"><b className="block font-display text-[16px]">Call emergency services first</b><span className="block text-[12.5px] text-coral-600">{branch?.note ?? 'Then follow the steps below while you wait.'}</span></span>
                <button onClick={call} className="h-11 rounded-2xl bg-white px-4 font-display text-[17px] font-bold text-coral-600">{emergencyNo}</button>
              </motion.div>
            )}
            {/* check */}
            {p.question && !answer && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className={cx('rounded-3xl p-4', card)}>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-violet-600">Quick check</p>
                <p className="mt-1 text-[16px] font-semibold leading-snug">{p.question.text}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Btn tone={dark ? 'outline' : 'white'} size="lg" onClick={() => setAnswer('yes')}>{p.question.yesLabel ?? 'Yes'}</Btn>
                  <Btn tone={dark ? 'outline' : 'white'} size="lg" onClick={() => setAnswer('no')}>{p.question.noLabel ?? 'No'}</Btn>
                </div>
              </motion.div>
            )}
            {/* steps */}
            {branch && (
              <ol className="space-y-2">
                {branch.steps.map((s, i) => (
                  <StepCard key={`${answer}-${i}`} s={s} i={i} active={i === step} done={i < step} dark={dark} onDo={() => setStep(Math.min(branch.steps.length, i + 1))} onCall={call} onCpr={() => setCpr(true)} />
                ))}
                {step >= branch.steps.length && <li className={cx('rounded-3xl p-4 text-center text-[14px]', card)}>Stay with them until help takes over. You’re doing the right things.</li>}
              </ol>
            )}
            {p.redFlags && (
              <div className={cx('rounded-3xl p-4', dark ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-400/25' : 'bg-amber-50')}>
                <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-amber-700"><Icon name="alert" size={14} />Call emergency services if</p>
                <ul className={cx('mt-1 list-inside list-disc text-[13px]', dark ? 'text-amber-700' : 'text-amber-700')}>{p.redFlags.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CprMetronome on={cpr} onClose={() => setCpr(false)} />

      <div className={cx('mt-5 flex flex-wrap items-center gap-2 text-[11.5px]', muted)}>
        <Honest dark={dark} kind="prototype">Prototype guidance engine · on-device</Honest>
        <span>{DISCLAIMER}</span>
        {!emergency && <span className="w-full">Extended cloud guidance: not configured in this build.</span>}
      </div>
    </div>
  );
}

function StepCard({ s, i, active, done, dark, onDo, onCall, onCpr }: { s: Step; i: number; active: boolean; done: boolean; dark: boolean; onDo: () => void; onCall: () => void; onCpr: () => void }) {
  const [timer, setTimer] = useState<number | null>(null);
  const ref = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(ref.current), []);
  const startTimer = () => {
    if (!s.timerSec) return;
    let left = s.timerSec;
    setTimer(left);
    clearInterval(ref.current);
    ref.current = setInterval(() => { left -= 1; setTimer(left); if (left <= 0) { clearInterval(ref.current); sound.ping(); } }, 1000);
  };
  return (
    <motion.li layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: done ? 0.55 : 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}
      className={cx('relative overflow-hidden rounded-3xl p-4 transition-colors', active ? (dark ? 'bg-clinic-100 ring-1 ring-inset ring-violet-200' : 'bg-white ring-2 ring-violet-300') : dark ? 'bg-clinic-50 ring-1 ring-inset ring-line' : 'bg-white ring-1 ring-inset ring-line')}>
      {active && <motion.span layoutId="step-glow" className="absolute inset-y-0 left-0 w-1 bg-violet-400" />}
      <div className="flex gap-3">
        <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[13px] font-bold', done ? 'bg-vital-500 text-white' : active ? 'bg-violet-500 text-white' : dark ? 'bg-clinic-100 text-ink-muted' : 'bg-clinic-100 text-ink-muted')}>{done ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Step {i + 1}</p>
          <p className="text-[15.5px] font-semibold leading-snug">{s.title}</p>
          {s.detail && <p className={cx('mt-0.5 text-[13.5px] leading-snug', dark ? 'text-ink-muted' : 'text-ink-muted')}>{s.detail}</p>}
          {active && (
            <div className="mt-3 flex flex-wrap gap-2">
              {s.action === 'call' && <Btn size="sm" tone="coral" icon="phone" onClick={onCall}>Call now</Btn>}
              {s.action === 'cpr' && <Btn size="sm" tone="coral" icon="pulse" onClick={onCpr}>CPR rhythm</Btn>}
              {s.timerSec && <Btn size="sm" tone={dark ? 'outline' : 'white'} icon="timer" onClick={startTimer}>{timer != null ? `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : `Timer ${s.timerSec >= 60 ? `${s.timerSec / 60} min` : `${s.timerSec} s`}`}</Btn>}
              <Btn size="sm" tone="primary" icon="check" onClick={onDo}>Done</Btn>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/** 110 compressions a minute: a visual and audible beat to push to. */
function CprMetronome({ on, onClose }: { on: boolean; onClose: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    sound.unlock();
    const id = setInterval(() => { setN((x) => x + 1); sound.tone(880, 0.06, { vol: 0.2, type: 'square' }); }, 60000 / 110);
    return () => clearInterval(id);
  }, [on]);
  return (
    <AnimatePresence>
      {on && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-sm rounded-3xl bg-coral-600 p-4 text-white shadow-coral lg:bottom-8">
          <div className="flex items-center gap-4">
            <motion.span key={n} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-clinic-200 font-display text-[26px] font-bold tabular">{n + 1}</motion.span>
            <div className="min-w-0 flex-1"><b className="block font-display text-[17px]">Push on every beat</b><span className="block text-[12.5px] text-coral-600">110 a minute · hard and fast · let the chest rise</span></div>
            <button onClick={onClose} aria-label="Stop" className="grid h-10 w-10 place-items-center rounded-full bg-clinic-200"><Icon name="x" size={18} /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
