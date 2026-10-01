'use client';
import { motion } from 'framer-motion';
import type { ReadinessItem } from '@core/readiness';
import { hasNative, invoke, requestPermission } from '@core/native';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Dot, Eyebrow } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/icons';
import { Score } from './Home';

const ICON: Record<ReadinessItem['key'], IconName> = { location: 'pin', gps: 'gps', notifications: 'bell', contacts: 'people', network: 'wifi', sms: 'sms', battery: 'battery' };

export function Readiness() {
  const { readiness, nav, toast } = useApp();
  const fix = async (i: ReadinessItem) => {
    if (i.key === 'contacts') return nav.go('contacts');
    if (i.key === 'gps') return invoke('openLocationSettings');
    if (i.key === 'location' || i.key === 'notifications' || i.key === 'sms') {
      const ok = await requestPermission(i.key);
      if (!ok) {
        toast('Not allowed. Opening app settings so you can allow it there.');
        if (hasNative()) invoke('openAppSettings');
      }
      readiness.refresh();
    }
  };
  const fixable = (i: ReadinessItem) => i.state !== 'ok' && (i.key === 'contacts' || i.key === 'location' || i.key === 'notifications' || (hasNative() && (i.key === 'gps' || (i.key === 'sms' && !!readiness.native?.directSms))));

  return (
    <>
      <Header title="Emergency readiness" sub="What your phone reports right now — nothing assumed" back />
      <Page>
        <Card className="flex items-center gap-5 !p-5">
          <Score score={readiness.score} total={readiness.total} size={84} />
          <div>
            <p className="text-2xl font-extrabold text-violet-900">{readiness.ready ? 'You are ready' : 'Almost ready'}</p>
            <p className="text-sm text-ink-muted">{readiness.ready ? 'An SOS can find you and reach your contacts.' : 'Fix the items marked below so an SOS works fully.'}</p>
          </div>
          <button onClick={readiness.refresh} aria-label="Check again" className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-violet-50 text-violet-700"><Icon name="refresh" size={18} /></button>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {readiness.items.map((i, n) => (
            <motion.div key={i.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.04 }}>
              <Card className="flex h-full items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Icon name={ICON[i.key]} /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-extrabold text-ink"><Dot state={i.state} />{i.label}</p>
                  <p className="text-sm text-ink-muted">{i.detail}</p>
                </div>
                {fixable(i) && <Btn tone="soft" onClick={() => fix(i)}>Fix</Btn>}
              </Card>
            </motion.div>
          ))}
        </div>
        <Card>
          <Eyebrow>Before you go out</Eyebrow>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>• Keep your phone above 30% or carry a power bank.</li>
            <li>• Tell your primary contact that She Shield may text them.</li>
            <li>• Turn on Shield Mode in places you don&apos;t know well.</li>
            {!hasNative() && <li>• Install the Android app for automatic SMS, background protection and offline alerts.</li>}
          </ul>
        </Card>
      </Page>
    </>
  );
}
