'use client';

/**
 * Small, tasteful sound + haptic feedback (Web Audio, no audio files).
 * Only ever triggered by a user action, respects the mute setting and reduced motion
 * preferences for vibration.
 */
let ctx: AudioContext | null = null;
const MUTE_KEY = 'nutri-scan-muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted()) return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  gain.gain.setValueAtTime(0.0001, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

function vibrate(pattern: number | number[]) {
  try {
    if (isMuted()) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export const feedback = {
  /** Camera shutter */
  shutter() {
    tone(1400, 0, 0.05, 'square', 0.03);
    tone(900, 0.05, 0.06, 'square', 0.025);
    vibrate(20);
  },
  /** Food recognised — a bright rising chime */
  food() {
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.07));
    vibrate(40);
  },
  /** Not food — a playful boing */
  notFood() {
    const a = audio();
    if (a) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, a.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, a.currentTime + 0.28);
      gain.gain.setValueAtTime(0.09, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.32);
      osc.connect(gain).connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + 0.34);
    }
    vibrate([30, 60, 30]);
  },
  /** Unsure / error — soft two-note */
  unsure() {
    tone(392, 0, 0.14, 'sine', 0.06);
    tone(330, 0.14, 0.18, 'sine', 0.06);
    vibrate([15, 40, 15]);
  },
  /** Saved / correct */
  success() {
    tone(660, 0, 0.1, 'triangle', 0.07);
    tone(990, 0.08, 0.16, 'triangle', 0.07);
    vibrate(25);
  },
  /** Big moment (all sorted, badge) */
  celebrate() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.07));
    vibrate([30, 40, 30, 40, 60]);
  },
};
