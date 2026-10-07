/**
 * Emergency numbers: official public numbers by region (Safety Core EmergencyNumberService), overridable per user
 * in Settings. Nothing here dispatches anything — calling is done by the phone's dialer.
 */
import type { RegionConfig } from '@shared/emergency';

export interface Prefs {
  ambulance: string | null;
  police: string | null;
  fire: string | null;
  autoVaultLink: boolean;
  vaultLinkMinutes: number;
  voiceGuidance: boolean;
  updatedAt?: string;
}
export const DEFAULT_PREFS: Prefs = { ambulance: null, police: null, fire: null, autoVaultLink: false, vaultLinkMinutes: 15, voiceGuidance: true };

export interface ServiceLine { key: 'emergency' | 'ambulance' | 'police' | 'fire'; label: string; number: string; note: string; custom: boolean }

/** India: 112 (ERSS) is the single emergency number; 108 ambulance and 101 fire are also public lines. */
export function serviceLines(region: RegionConfig, prefs: Prefs): ServiceLine[] {
  const other = (label: RegExp) => region.others.find((o) => label.test(o.label))?.number;
  const primary = region.primary.number;
  const line = (key: ServiceLine['key'], label: string, custom: string | null, fallback: string | undefined, note: string): ServiceLine => ({ key, label, number: custom || fallback || primary, note, custom: !!custom });
  return [
    { key: 'emergency', label: region.primary.label, number: primary, note: region.primary.note ?? 'All emergency services', custom: false },
    line('ambulance', 'Ambulance', prefs.ambulance, other(/ambulance/i), 'Medical emergency'),
    line('police', 'Police', prefs.police, other(/^police$/i), 'Police emergency'),
    line('fire', 'Fire & rescue', prefs.fire, other(/fire/i), 'Fire, rescue, entrapment'),
  ];
}
