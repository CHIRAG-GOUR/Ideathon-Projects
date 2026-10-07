'use client';
import { useEffect } from 'react';
import type { User as FbUser } from 'firebase/auth';
import type { EmergencyContact, User } from '@shared/types';
import { EmergencyNumberService } from '@shared/emergency';
import { TEMPLATES } from '@shared/message';
import { api } from './api';
import { DEFAULT_SETTINGS, saveProfile } from './data';
import { hasNative, invoke, type NativeInfo } from './native';

interface Setup {
  brand: string;
  origin: string;
  user: FbUser | null;
  profile: User | null | undefined;
  contacts: EmergencyContact[];
  native: NativeInfo | null;
  demo: boolean;
  onRegistered?: () => void;
}

/**
 * Keeps the Android safety layer configured so an SOS works with no network and no UI:
 * name, contacts, channels, message templates, emergency number, settings, device key.
 */
export function useNativeSetup({ brand, origin, user, profile, contacts, native, demo, onRegistered }: Setup) {
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (uid && profile === null) {
      const p: User = { name: user?.displayName || 'Me', phone: null, email: user?.email ?? null, profile: { shareMedical: false }, settings: { ...DEFAULT_SETTINGS, region: native?.region ?? 'IN' }, createdAt: new Date().toISOString() };
      saveProfile(uid, p).catch(() => undefined);
    }
  }, [uid, profile, user, native?.region]);

  useEffect(() => {
    if (!hasNative() || demo) return;
    const s = { ...DEFAULT_SETTINGS, ...profile?.settings };
    const region = EmergencyNumberService.forRegion(s.region || native?.region);
    invoke('configure', {
      brand,
      origin,
      userName: profile?.name || user?.displayName || 'Me',
      region: region.region,
      emergencyNumber: region.primary.number,
      timeZone: region.timeZone,
      templates: TEMPLATES,
      settings: { sound: s.sound, vibration: s.vibration, escalateAfterMin: s.escalateAfterMin, trackingIntervalSec: s.trackingIntervalSec, volumeTrigger: !!s.volumeTrigger },
      contacts: contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, role: c.role, sms: c.channels.sms, whatsapp: c.channels.whatsapp, email_on: c.channels.email, live: c.channels.live })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, profile, demo, uid]);

  useEffect(() => {
    if (!uid || !native || native.device.registered || demo) return;
    api<{ deviceId: string; deviceKey: string }>('/device/register', { label: 'Android' })
      .then((d) => {
        invoke('setDevice', { ...d, apiBase: origin });
        onRegistered?.();
      })
      .catch(() => undefined);
  }, [uid, native, demo, origin, onRegistered]);
}
