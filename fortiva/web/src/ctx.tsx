'use client';
import { createContext, useContext } from 'react';
import type { User as FbUser } from 'firebase/auth';
import type { CheckPlan, EmergencyContact, User, UserSettings } from '@shared/types';
import type { RegionConfig } from '@shared/emergency';
import type { useNav } from '@core/useNav';
import type { useReadiness } from '@core/readiness';
import type { Trigger, useSos } from '@core/useSos';
import { Icon } from '@/ui/icons';
import { cx } from '@/ui/kit';

export const APP_ID = 'fortiva';
export const BRAND = 'Fortiva';
export const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'https://fortiva-safecheck.web.app';

export type Screen = 'home' | 'checks' | 'circle' | 'emergency' | 'journal' | 'nearby' | 'history' | 'privacy' | 'settings';

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
  plan: CheckPlan | null | undefined;
  setLocalPlan: (p: CheckPlan | null) => void;
  toast: (msg: string) => void;
}
export const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => useContext(Ctx)!;


/** Page header shared by all screens. */
export function Header({ title, sub, back, right }: { title: string; sub?: string; back?: boolean; right?: React.ReactNode }) {
  const { nav } = useApp();
  return (
    <header className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-6">
      <div className="flex items-start gap-2">
        {back && nav.depth > 1 && (
          <button onClick={nav.back} aria-label="Back" className="-ml-2 mt-0.5 grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-cobalt-50">
            <Icon name="back" />
          </button>
        )}
        <div>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-cobalt-900">{title}</h1>
          {sub && <p className="mt-0.5 text-sm font-medium text-ink-muted">{sub}</p>}
        </div>
      </div>
      {right}
    </header>
  );
}

export const Page = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cx('mx-auto max-w-6xl space-y-4 px-4 pt-2 sm:px-6', className)}>{children}</div>;
