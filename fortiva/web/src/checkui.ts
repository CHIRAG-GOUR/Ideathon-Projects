'use client';
import { useEffect, useState } from 'react';
import type { CheckLogEntry, CheckPlan, CheckState } from '@shared/types';
import { checkState, nextTransition } from '@shared/checks';

export const STATE_LABEL: Record<CheckState, string> = { OFF: 'Off', WAITING: 'On schedule', DUE: 'Check-in due', WARNING: 'Missed — reminder sent', ESCALATED: 'Circle alerted' };
export const STATE_TONE: Record<CheckState, 'idle' | 'teal' | 'amber' | 'coral'> = { OFF: 'idle', WAITING: 'teal', DUE: 'amber', WARNING: 'coral', ESCALATED: 'coral' };
export const LOG_TEXT: Record<CheckLogEntry['type'], string> = { started: 'Check-ins started', confirmed: 'Checked in — OK', warning: 'Missed check-in — reminder', missed: 'Check-in missed', escalated: 'Escalated to your circle', stopped: 'Check-ins stopped', sos: 'SOS started after missed check-ins' };
export const LOG_TONE: Record<CheckLogEntry['type'], 'teal' | 'amber' | 'coral' | 'cobalt' | 'gray'> = { started: 'cobalt', confirmed: 'teal', warning: 'amber', missed: 'coral', escalated: 'coral', stopped: 'gray', sos: 'coral' };

export function useNow(ms = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => set(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Everything the countdown UI needs, derived only from the plan's timestamps. */
export function useCheckView(plan: CheckPlan | null | undefined) {
  const now = useNow();
  const state = checkState(plan, now);
  if (!plan || state === 'OFF') return { state, left: 0, progress: 0, nextLabel: '' };
  const due = Date.parse(plan.nextDueAt!);
  if (state === 'WAITING') {
    const total = plan.intervalMin * 60_000;
    return { state, left: due - now, progress: 1 - (due - now) / total, nextLabel: 'Next check-in in' };
  }
  const t = nextTransition(plan, now);
  const g = plan.graceMin * 60_000;
  if (state === 'ESCALATED' || !t) return { state, left: 0, progress: 1, nextLabel: 'Escalated' };
  return { state, left: t.at - now, progress: 1 - (t.at - now) / g, nextLabel: state === 'DUE' ? 'Reminder in' : 'Circle alerted in' };
}
