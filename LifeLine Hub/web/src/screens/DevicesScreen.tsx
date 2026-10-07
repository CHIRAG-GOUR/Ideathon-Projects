'use client';
/** CONNECTED DEVICES — wearable auto-triggering is on the roadmap. Nothing here pretends a device is connected. */
import { motion } from 'framer-motion';
import { hasNative } from '@core/native';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Kicker, Panel, StatusChip } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';

export function DevicesScreen() {
  const { readiness } = useApp();
  const phone = hasNative();
  return (
    <Page>
      <PageTitle kicker="Connected devices" title="Ready for what’s next." sub="Wearables that can start SOS automatically after a fall or impact are part of the LifeLine roadmap." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel tone="command" className="p-6">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.span animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 4, repeat: Infinity }} className="grid h-14 w-14 place-items-center rounded-2xl bg-clinic-50 text-cyan-600 ring-1 ring-inset ring-line"><Icon name="watch" size={28} /></motion.span>
              <div><p className="font-display text-[19px] font-semibold">Wearable</p><p className="text-[13px] text-ink-muted">Not connected</p></div>
            </div>
            <StatusChip status="soon" />
          </div>
          <div className="relative mt-5 divide-y divide-line rounded-3xl bg-clinic-50 px-4 ring-1 ring-inset ring-line">
            {[['Auto SOS', 'Disabled'], ['Fall detection', 'Coming soon'], ['Impact detection', 'Coming soon'], ['Heart-rate context in Health Vault', 'Coming soon']].map(([a, b]) => (
              <div key={a} className="flex items-center justify-between py-3 text-[13.5px]"><span>{a}</span><span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{b}</span></div>
            ))}
          </div>
          <p className="relative mt-4 text-[12.5px] text-ink-faint">When wearables arrive, auto-SOS will still give you a countdown to cancel before anyone is alerted.</p>
        </Panel>
        <Panel className="p-6">
          <Kicker>This device</Kicker>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-600"><Icon name="devices" size={24} /></span>
            <div><p className="font-semibold text-ink">{phone ? 'LifeLine Hub for Android' : 'Web browser'}</p><p className="text-[13px] text-ink-muted">{phone ? 'Native safety layer: SIM SMS, background GPS, siren' : 'Browser GPS · SMS and WhatsApp open ready to send'}</p></div>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {readiness.items.map((i) => (
              <li key={i.key} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <span className="text-ink-soft">{i.label}<span className="block text-[12px] text-ink-faint">{i.detail}</span></span>
                <StatusChip status={i.state === 'ok' ? 'ready' : i.state === 'unknown' ? 'pending' : i.state === 'off' ? 'off' : 'pending'} label={i.state === 'ok' ? 'OK' : i.state === 'unknown' ? 'Unknown' : i.state === 'off' ? 'Off' : 'Check'} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
