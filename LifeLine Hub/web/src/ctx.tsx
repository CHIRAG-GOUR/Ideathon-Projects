'use client';
import { createContext, useContext } from 'react';
import type { User as FbUser } from 'firebase/auth';
import type { EmergencyContact, User, UserSettings } from '@shared/types';
import type { RegionConfig } from '@shared/emergency';
import type { useSos, Trigger } from '@core/useSos';
import type { useReadiness } from '@core/readiness';
import type { useNav } from '@core/useNav';
import type { MedicalProfile } from '@/services/health/vault';
import type { Fix, RadarPoint } from '@/services/georadar/radar';
import type { Prefs, ServiceLine } from '@/services/emergency/numbers';

export const APP_ID = 'lifelinehub';
export const BRAND = 'LifeLine Hub';
export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'https://lifeline-hub-app.web.app';
export const TAGLINE = 'Futuristic emergency care — instant, intelligent, everywhere.';

export type Screen = 'home' | 'sos' | 'vault' | 'radar' | 'guidance' | 'services' | 'helpers' | 'devices' | 'experience' | 'more' | 'contacts' | 'settings' | 'history' | 'privacy';

export interface AppCtx {
  uid: string | null;
  user: FbUser | null;
  profile: User | null | undefined;
  settings: UserSettings;
  contacts: EmergencyContact[];
  contactsLoaded: boolean;
  demo: boolean;
  setDemo: (v: boolean) => void;
  region: RegionConfig;
  nav: ReturnType<typeof useNav<Screen>>;
  sos: ReturnType<typeof useSos>;
  startSos: (t: Trigger) => void;
  readiness: ReturnType<typeof useReadiness>;
  toast: (m: string) => void;
  medical: MedicalProfile | null | undefined;
  prefs: Prefs;
  savePrefs: (p: Partial<Prefs>) => Promise<void>;
  lines: ServiceLine[];
  fix: Fix | null;
  locState: 'idle' | 'locating' | 'ok' | 'denied' | 'error';
  locate: () => void;
  radar: { points: RadarPoint[] | null; error: string | null; live: boolean };
  online: boolean;
  emergency: boolean;
}

export const Ctx = createContext<AppCtx | null>(null);
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
