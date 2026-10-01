'use client';
import { useEffect, useRef } from 'react';
import type { CheckPlan, EmergencyLocation } from '@shared/types';
import { checkState, confirmPlan, startPlan, stopPlan } from '@shared/checks';
import { api } from './api';
import { currentFix, hasNative, invoke } from './native';

export interface CheckInput {
  label: string;
  intervalMin: number;
  graceMin: number;
  policy: 'notify' | 'sos';
  contactIds: string[];
}

/**
 * Periodic safety checks. On Android the phone owns the timeline (alarms, prompts, escalation, offline) and
 * reports to the server through its queue. In a browser the server keeps the timeline and escalates as backup.
 */
export const checks = {
  async start(input: CheckInput): Promise<CheckPlan> {
    const location: EmergencyLocation | null = await currentFix().catch(() => null);
    const plan = startPlan({ ...input, contactIds: input.contactIds });
    if (hasNative()) {
      invoke('checkStart', { plan, location });
      return plan;
    }
    return api<CheckPlan>('/checks/start', { plan: input, location });
  },
  async confirm(plan: CheckPlan): Promise<CheckPlan> {
    const location = await currentFix().catch(() => null);
    if (hasNative()) {
      invoke('checkConfirm', { location });
      return confirmPlan(plan);
    }
    return api<CheckPlan>('/checks/confirm', { location });
  },
  async stop(plan: CheckPlan): Promise<CheckPlan> {
    if (hasNative()) {
      invoke('checkStop');
      return stopPlan(plan);
    }
    await api('/checks/stop', {});
    return stopPlan(plan);
  },
};

/** Browser only: a system notification + vibration when a check is due or overdue (the Android app does this natively). */
export function useCheckPrompt(plan: CheckPlan | null | undefined, brand: string) {
  const ref = useRef(plan);
  ref.current = plan;
  const shown = useRef('');
  useEffect(() => {
    if (hasNative()) return;
    const t = setInterval(() => {
      const p = ref.current;
      const s = checkState(p);
      if ((s !== 'DUE' && s !== 'WARNING') || !p) return;
      const key = `${s}:${p.nextDueAt}`;
      if (shown.current === key) return;
      shown.current = key;
      navigator.vibrate?.([400, 200, 400]);
      try {
        if ('Notification' in window && Notification.permission === 'granted')
          new Notification(s === 'DUE' ? `${brand}: Are you OK?` : `${brand}: you missed a check-in`, { body: s === 'DUE' ? `Tap to check in (${p.label}).` : 'Check in now, or your contacts will be alerted.', tag: 'check', requireInteraction: true });
      } catch {
        /* notifications unavailable */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [brand]);
}
