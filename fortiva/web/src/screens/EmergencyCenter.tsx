'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { fillMessage, fmtTime } from '@shared/message';
import type { ReadinessItem } from '@core/readiness';
import { currentFix, dial, hasNative, invoke, openWhatsApp, requestPermission, smsUrl } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Dot, Label, Spinner, cx } from '@/ui/kit';
import { SosRing } from '@/ui/art';
import { Icon } from '@/ui/icons';

export function EmergencyCenter() {
  const { startSos, region, contacts, readiness, profile, user, toast, nav, demo } = useApp();
  const [sharing, setSharing] = useState(false);
  const primary = contacts.find((c) => c.role === 'primary' && c.phone) ?? contacts.find((c) => c.phone);

  // Not an SOS: one message with where you are right now, sent from your own WhatsApp/Messages.
  const shareLocation = async () => {
    if (!primary) return nav.go('circle');
    setSharing(true);
    const fix = await currentFix().catch(() => null);
    setSharing(false);
    if (!fix) return toast('Location unavailable. Turn on location and try again.');
    const name = profile?.name || user?.displayName || 'Me';
    const text = fillMessage('📍 {name} shared their location with you via {brand}.\n{locline}\n{coords}\n🕒 {time}', { brand: 'Fortiva', name, location: fix, time: fmtTime(fix.timestamp, region.timeZone), emergency: region.primary.number, liveUrl: null });
    if (demo) return toast('Demo — nothing was sent.');
    if (primary.channels.whatsapp) openWhatsApp(primary.phone!, text);
    else location.href = smsUrl([primary.phone!], text);
  };

  const fix = async (i: ReadinessItem) => {
    if (i.key === 'contacts') return nav.go('circle');
    if (i.key === 'gps') return invoke('openLocationSettings');
    if (i.key === 'location' || i.key === 'notifications' || i.key === 'sms') {
      if (!(await requestPermission(i.key))) {
        toast('Not allowed. Opening app settings so you can allow it there.');
        if (hasNative()) invoke('openAppSettings');
      }
      readiness.refresh();
    }
  };
  const fixable = (i: ReadinessItem) => i.state !== 'ok' && (i.key === 'contacts' || i.key === 'location' || i.key === 'notifications' || (hasNative() && (i.key === 'gps' || (i.key === 'sms' && !!readiness.native?.directSms))));

  return (
    <>
      <Header title="Emergency Center" sub="Real SOS, official numbers and your readiness" />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="flex flex-col items-center !p-6 text-center">
            <Label>SOS to your whole circle</Label>
            <div className="my-3"><SosRing onComplete={() => startSos('sos')} size={230} /></div>
            <p className="max-w-xs text-sm text-ink-muted">Siren, live location and alerts to {contacts.length || 'no'} {contacts.length === 1 ? 'person' : 'people'} in your circle. Release before 3 s to cancel.</p>
            <div className="mt-5 flex w-full max-w-sm flex-col items-center gap-2 rounded-4xl bg-paper-100 p-4">
              <SosRing tone="dark" size={110} label="SILENT" sub="Hold 3 s" onComplete={() => startSos('discreet')} />
              <p className="text-xs text-ink-muted">Silent SOS: no siren or sound. Your circle is texted that you may not be able to talk.</p>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <Label>Official numbers · {region.name}</Label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[region.primary, ...region.others].map((l) => (
                  <button key={l.number} onClick={() => dial(l.number)} className={cx('flex items-center gap-3 rounded-3xl px-4 py-3 text-left', l === region.primary ? 'col-span-2 bg-coral-500 text-white shadow-coral' : 'bg-cobalt-50 text-cobalt-900')}>
                    <Icon name="phone" size={20} />
                    <span><span className="block text-xl font-bold leading-tight">{l.number}</span><span className={cx('block text-xs font-medium', l === region.primary ? 'text-white/85' : 'text-ink-muted')}>{l.label}</span></span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-muted">Fortiva does not contact emergency services for you. Calls go through your phone.</p>
            </Card>
            <Card>
              <Label>Quick actions</Label>
              <div className="mt-3 grid gap-2">
                <Btn tone="soft" className="w-full justify-start" disabled={sharing} onClick={shareLocation}>{sharing ? <Spinner /> : <Icon name="share" size={18} />}{primary ? `Share my location with ${primary.name.split(' ')[0]}` : 'Add a circle member to share location'}</Btn>
                {primary && <Btn tone="soft" className="w-full justify-start" onClick={() => dial(primary.phone!)}><Icon name="phone" size={18} />Call {primary.name.split(' ')[0]}</Btn>}
                <Btn tone="soft" className="w-full justify-start" onClick={() => nav.go('nearby')}><Icon name="pin" size={18} />Nearby police & hospitals</Btn>
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <Label>Safety readiness</Label>
            <button onClick={readiness.refresh} aria-label="Check again" className="grid h-9 w-9 place-items-center rounded-full bg-cobalt-50 text-cobalt-700"><Icon name="refresh" size={16} /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {readiness.items.map((i, n) => (
              <motion.div key={i.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.03 }} className="flex items-center gap-3 rounded-3xl border border-line p-3">
                <Dot state={i.state} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{i.label}</p>
                  <p className="text-xs text-ink-muted">{i.detail}</p>
                </div>
                {fixable(i) && <Btn tone="soft" className="!min-h-[36px] !px-3 text-sm" onClick={() => fix(i)}>Fix</Btn>}
              </motion.div>
            ))}
          </div>
        </Card>
      </Page>
    </>
  );
}
