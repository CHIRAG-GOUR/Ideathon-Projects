'use client';
import type { CheckPlan, EmergencyLocation } from '@shared/types';
import { confirmPlan, startPlan, stopPlan } from '@shared/checks';
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
