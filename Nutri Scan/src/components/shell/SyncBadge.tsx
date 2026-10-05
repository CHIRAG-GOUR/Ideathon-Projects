'use client';

import React from 'react';
import { Cloud, CloudOff, Loader2, HardDrive } from 'lucide-react';
import { useSyncStatus } from '@/lib/firebase/syncStatus';

/** Small, honest indicator of where your food list is saved. */
export function SyncBadge() {
  const synced = useSyncStatus((s) => s.state);
  // The browser knows first when the network drops — trust it over any in-flight sync step.
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const state = !online && synced !== 'disabled' ? 'offline' : synced;
  const map = {
    disabled: { icon: HardDrive, text: 'Saved on this device', cls: 'text-ink-muted' },
    connecting: { icon: Loader2, text: 'Connecting…', cls: 'text-ink-muted' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-ink-muted' },
    synced: { icon: Cloud, text: 'Synced', cls: 'text-aqua-700' },
    offline: { icon: CloudOff, text: 'Offline — saved on device', cls: 'text-lemon-700' },
    error: { icon: CloudOff, text: 'Saved on device', cls: 'text-lemon-700' },
  }[state];
  const spin = state === 'connecting' || state === 'saving';
  return (
    <span className={`hidden items-center gap-1.5 text-xs font-bold sm:flex ${map.cls}`} title={map.text} data-testid="sync-badge" data-state={state}>
      <map.icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />
      <span className="hidden lg:inline">{map.text}</span>
    </span>
  );
}
