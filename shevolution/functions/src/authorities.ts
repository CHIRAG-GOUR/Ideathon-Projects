import type { AuthoritySubmission, EmergencyAuthority, EmergencyAuthorityConfig, SosEvent } from '../../shared/src/types';
import { EmergencyNumberService } from '../../shared/src/emergency';
import { db, nowIso } from './admin';

/**
 * Region adapters. No official emergency-service data integration exists in this build, so the India
 * adapter records "call available" and points the user to 112 — it never claims the event was sent.
 * A sandbox adapter (configured in emergencyAuthorities/{region}, type "sandbox") exercises the full
 * submit / response / failure / retry path against a TEST endpoint only.
 */
class CallOnlyAuthority implements EmergencyAuthority {
  constructor(private region: string) {}
  async call() {
    return { route: 'dial' as const, number: EmergencyNumberService.forRegion(this.region).primary.number };
  }
  async sendEmergencyAlert(): Promise<AuthoritySubmission> {
    const r = EmergencyNumberService.forRegion(this.region);
    return {
      authorityId: `call-${r.region}`,
      name: `${r.primary.label} ${r.primary.number}`,
      status: 'not_integrated',
      integrated: false,
      referenceId: null,
      detail: `Shevolution has no official data link to ${r.primary.number}. Use "Call ${r.primary.number}".`,
      at: nowIso(),
    };
  }
  supportsLocationPayload() {
    return false;
  }
}

class SandboxAuthority implements EmergencyAuthority {
  constructor(private cfg: EmergencyAuthorityConfig) {}
  async call() {
    return { route: 'dial' as const, number: EmergencyNumberService.forRegion(this.cfg.region).primary.number };
  }
  async sendEmergencyAlert(e: Pick<SosEvent, 'id' | 'ownerName' | 'lastLocation' | 'startedAt'>): Promise<AuthoritySubmission> {
    const base = { authorityId: this.cfg.id, name: this.cfg.name, integrated: true, at: nowIso() };
    try {
      const res = await fetch(this.cfg.endpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, eventId: e.id, name: e.ownerName, startedAt: e.startedAt, location: e.lastLocation }),
        signal: AbortSignal.timeout(10_000),
      });
      const j = (await res.json().catch(() => ({}))) as { referenceId?: string; received?: boolean };
      if (res.ok && j.received && j.referenceId) return { ...base, status: 'confirmed', referenceId: j.referenceId, detail: 'Test endpoint confirmed receipt' };
      return { ...base, status: 'failed', referenceId: null, detail: `Endpoint answered ${res.status} without confirmation` };
    } catch (err) {
      return { ...base, status: 'failed', referenceId: null, detail: (err as Error).message };
    }
  }
  supportsLocationPayload() {
    return true;
  }
}

export async function authorityFor(region: string): Promise<EmergencyAuthority> {
  const snap = await db().collection('emergencyAuthorities').doc(region).get();
  const cfg = snap.data() as EmergencyAuthorityConfig | undefined;
  if (cfg?.enabled && cfg.type === 'sandbox' && cfg.endpoint) return new SandboxAuthority({ ...cfg, id: snap.id });
  return new CallOnlyAuthority(region);
}
