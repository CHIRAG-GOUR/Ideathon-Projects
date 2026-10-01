import type { EventLevel, Level, Phase, SafetyState, SimState } from '@engine/engine';
import { CONFIG, levelOf } from '@engine/engine';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'isolated';
export const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-ok-50 text-ok-700 ring-ok-100',
  warn: 'bg-safety-50 text-safety-700 ring-safety-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  info: 'bg-lpg-50 text-lpg-700 ring-lpg-100',
  isolated: 'bg-lpg-100 text-lpg-800 ring-lpg-200',
  neutral: 'bg-steel-100 text-graphite-soft ring-steel-200',
};
export const DOT_CLASS: Record<Tone, string> = { ok: 'bg-ok-500', warn: 'bg-safety-500', danger: 'bg-danger-500', info: 'bg-lpg-500', isolated: 'bg-lpg-600', neutral: 'bg-steel-400' };
export const SYMBOL: Record<Tone, string> = { ok: '●', warn: '▲', danger: '■', info: '◆', isolated: '◼', neutral: '○' };

export function safetyTone(s: SafetyState): Tone {
  return s === 'NORMAL' || s === 'SAFE' ? 'ok' : s === 'ANOMALY' || s === 'WARNING' ? 'warn' : s === 'CRITICAL' ? 'danger' : s === 'ISOLATED' ? 'isolated' : 'neutral';
}
export function phaseTone(p: Phase): Tone {
  if (p === 'CONTAINED' || p === 'COOKING') return 'ok';
  if (p === 'ANOMALY' || p === 'WARNING' || p === 'RESPONSE' || p === 'LEAK') return 'warn';
  if (p === 'CRITICAL' || p === 'DANGER' || p === 'INCIDENT') return 'danger';
  if (p === 'RECOVERY') return 'neutral';
  return 'info';
}
export function levelTone(l: Level): Tone {
  return l === 0 ? 'ok' : l === 1 ? 'info' : l === 2 ? 'warn' : 'danger';
}
export const LEVEL_TEXT = ['NORMAL', 'ANOMALY', 'WARNING', 'CRITICAL'] as const;
export function eventTone(l: EventLevel): Tone {
  return l === 'success' ? 'ok' : l === 'warning' ? 'warn' : l === 'critical' ? 'danger' : l === 'notice' ? 'info' : 'neutral';
}
/** Sensor level for display. In the no-dock scenario nobody measures it; we still show the simulated truth, labelled. */
export function sensorLevel(s: SimState, k: 'gas' | 'temp' | 'tilt'): Level {
  return levelOf(k, k === 'gas' ? s.gas : k === 'temp' ? s.temp : s.tilt);
}
export const SAFETY_TEXT: Record<SafetyState, string> = { NORMAL: 'NORMAL', ANOMALY: 'ANOMALY', WARNING: 'WARNING', CRITICAL: 'CRITICAL', ISOLATED: 'SUPPLY ISOLATED', SAFE: 'SAFE', UNMONITORED: 'NOT MONITORED' };
export const TH = CONFIG.thresholds;
