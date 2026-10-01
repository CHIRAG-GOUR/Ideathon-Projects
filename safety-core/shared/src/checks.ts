import type { CheckPlan, CheckState } from './types';

/** The check state at a moment in time, derived only from the plan's timestamps (same on phone, web and server). */
export function checkState(p: CheckPlan | null | undefined, now = Date.now()): CheckState {
  if (!p || !p.active || !p.nextDueAt) return 'OFF';
  if (p.escalatedAt && Date.parse(p.escalatedAt) >= Date.parse(p.nextDueAt)) return 'ESCALATED';
  const due = Date.parse(p.nextDueAt);
  const g = p.graceMin * 60_000;
  if (now < due) return 'WAITING';
  if (now < due + g) return 'DUE';
  if (now < due + 2 * g) return 'WARNING';
  return 'ESCALATED';
}

/** When the next transition happens (for countdowns and alarms). */
export function nextTransition(p: CheckPlan, now = Date.now()): { state: CheckState; at: number } | null {
  if (!p.active || !p.nextDueAt) return null;
  const due = Date.parse(p.nextDueAt);
  const g = p.graceMin * 60_000;
  for (const [state, at] of [['DUE', due], ['WARNING', due + g], ['ESCALATED', due + 2 * g]] as const) if (at > now) return { state, at };
  return null;
}

export function confirmPlan(p: CheckPlan, now = Date.now()): CheckPlan {
  const iso = new Date(now).toISOString();
  return { ...p, lastConfirmedAt: iso, nextDueAt: new Date(now + p.intervalMin * 60_000).toISOString(), escalatedAt: null, escalatedBy: null, updatedAt: iso };
}

export function startPlan(p: Omit<CheckPlan, 'active' | 'startedAt' | 'nextDueAt' | 'lastConfirmedAt' | 'escalatedAt' | 'escalatedBy' | 'updatedAt'>, now = Date.now()): CheckPlan {
  const iso = new Date(now).toISOString();
  return { ...p, active: true, startedAt: iso, nextDueAt: new Date(now + p.intervalMin * 60_000).toISOString(), lastConfirmedAt: null, escalatedAt: null, escalatedBy: null, updatedAt: iso };
}

export function stopPlan(p: CheckPlan, now = Date.now()): CheckPlan {
  return { ...p, active: false, nextDueAt: null, updatedAt: new Date(now).toISOString() };
}
