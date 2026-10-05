// Synthesised sound cues (no audio files). Sound is never the only signal: every cue has visible text too.
import type { SimController } from '@/simulation/controller';
import { settings } from './settings';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (settings.get().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // audio unavailable — the simulation stays fully visual
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, when = 0, endFreq?: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sound = {
  click: () => tone(880, 0.06, 'sine', 0.04),
  notice: () => tone(660, 0.12, 'triangle', 0.06),
  warning: () => {
    tone(988, 0.16, 'square', 0.05);
    tone(988, 0.16, 'square', 0.05, 0.24);
  },
  critical: () => {
    tone(1318, 0.12, 'square', 0.06);
    tone(1046, 0.12, 'square', 0.06, 0.14);
  },
  isolated: () => tone(523, 0.22, 'triangle', 0.07, 0, 392),
  contained: () => {
    tone(523, 0.16, 'sine', 0.08);
    tone(659, 0.16, 'sine', 0.08, 0.14);
    tone(784, 0.3, 'sine', 0.08, 0.28);
  },
  /** Cinematic boom — only for the clearly labelled SIMULATED INCIDENT. */
  incident: () => {
    const a = ac();
    if (!a) return;
    const t = a.currentTime;
    const len = Math.floor(a.sampleRate * 2.2);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource();
    src.buffer = buf;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 1.8);
    const g = a.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    src.connect(lp).connect(g).connect(a.destination);
    src.start(t);
    tone(55, 1.4, 'sine', 0.35, 0, 30);
  },
};

function vibrate(p: number | number[]) {
  if (settings.get().vibration) navigator.vibrate?.(p);
}

/** Plays cues for new engine events and repeats the alarm while the dock's alarm is on. */
export function attachSound(c: SimController) {
  let seen = 0;
  let session = c.sessionId;
  let nextBeep = 0;
  return c.subscribe(() => {
    if (c.sessionId !== session) {
      session = c.sessionId;
      seen = 0;
    }
    const s = c.state;
    for (const e of s.events.slice(seen)) {
      if (e.kind === 'warning') (sound.warning(), vibrate([200, 100, 200]));
      else if (e.kind === 'critical' || e.kind === 'danger') (sound.critical(), vibrate([300, 100, 300]));
      else if (e.kind === 'isolated') sound.isolated();
      else if (e.kind === 'contained') sound.contained();
      else if (e.kind === 'incident') (sound.incident(), vibrate([600]));
      else if (e.kind === 'anomaly' || e.kind === 'leak_introduced') sound.notice();
    }
    seen = s.events.length;
    if (c.running && s.alarm !== 'none' && s.t >= nextBeep) {
      if (s.t > 0.5 && s.events.at(-1)?.kind !== 'warning') (s.alarm === 'critical' ? sound.critical : sound.warning)();
      nextBeep = s.t + (s.alarm === 'critical' ? 0.8 : 1.4);
    }
  });
}
