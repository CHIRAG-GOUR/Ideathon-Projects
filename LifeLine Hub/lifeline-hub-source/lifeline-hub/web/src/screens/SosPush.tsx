'use client';
/** SOS PUSH — one deliberate hold starts the response. Everything that will happen is visible beforehand. */
import { motion } from 'framer-motion';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Btn, Honest, Kicker, Panel, StatusChip, cx, rise, stagger } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { SOSControl } from '@/components/lifeline/SOSControl';
import { BroadcastStatus } from '@/components/lifeline/BroadcastStatus';
import { EmergencyServiceCard } from '@/components/lifeline/EmergencyServices';
import { KIND_ICON } from '@/components/lifeline/RadarView';
import { KIND_COLOR, fmtEta, fmtKm } from '@/services/georadar/radar';

export function SosPush() {
  const { startSos, contacts, fix, locState, locate, radar, lines, demo, nav, readiness } = useApp();
  const hospitals = (radar.points ?? []).filter((p) => p.kind === 'hospital').slice(0, 3);
  const notif = readiness.items.find((i) => i.key === 'notifications');
  return (
    <Page wide>
      <PageTitle kicker="SOS Push" title="One hold starts the response." sub="Your location, your emergency contacts, your medical context and nearby help — set in motion together." tone="coral" right={demo ? <Honest kind="demo">Demo mode · nothing is sent</Honest> : undefined} />
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr_1fr]">
        {/* left: location + contacts */}
        <div className="order-2 space-y-4 lg:order-1">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-2"><Kicker>Current location</Kicker><StatusChip status={fix ? 'locked' : locState === 'locating' ? 'scanning' : 'pending'} label={fix ? 'Ready' : locState === 'locating' ? 'Locating' : 'Off'} /></div>
            {fix ? (
              <>
                <p className="mt-2 font-mono text-[15px] font-semibold tabular text-ink">{fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)}</p>
                <p className="text-[12.5px] text-ink-muted">{demo ? 'Demo location · New Delhi' : `Accuracy ±${Math.round(fix.accuracy ?? 30)} m · refreshed when SOS starts`}</p>
              </>
            ) : (
              <>
                <p className="mt-2 text-[14px] text-ink-soft">Location is acquired the moment SOS starts. Enable it now for a faster lock.</p>
                <Btn tone="soft" size="sm" className="mt-3" icon="location" onClick={locate}>{locState === 'locating' ? 'Locating…' : 'Enable location'}</Btn>
              </>
            )}
          </Panel>
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-2"><Kicker>Emergency contacts</Kicker><button onClick={() => nav.tab('contacts')} className="text-[12.5px] font-semibold text-teal-600">Manage</button></div>
            <ul className="mt-3 space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 font-display text-[15px] font-semibold text-teal-700">{c.name[0]}</span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[14px] text-ink">{c.name}</b><span className="block text-[12px] text-ink-muted">{c.relationship || c.role}</span></span>
                  <span className="flex gap-1">
                    {c.channels.whatsapp && <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#25D366]/15 text-[#128C4B]" title="WhatsApp"><Icon name="whatsapp" size={14} /></span>}
                    {c.channels.sms && <span className="grid h-7 w-7 place-items-center rounded-lg bg-clinic-100 text-ink-soft" title="SMS"><Icon name="sms" size={14} /></span>}
                    {c.channels.live && <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/10 text-cyan-600" title="Live location"><Icon name="location" size={14} /></span>}
                  </span>
                </li>
              ))}
              {!contacts.length && <li className="rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-700">No contacts yet — add the people who should be alerted.</li>}
            </ul>
          </Panel>
        </div>

        {/* centre: the control */}
        <Panel tone="command" className="order-1 flex flex-col items-center justify-center p-6 lg:order-2 lg:p-8">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" />
          <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-coral-300">Activate SOS</p>
          <div className="relative mt-5"><SOSControl dark size={260} onActivated={() => setTimeout(() => startSos('sos'), 650)} label={`Activate SOS. Press and hold for 3 seconds${demo ? ' (demo: nothing is sent)' : ''}`} /></div>
          <div className="relative mt-2 grid w-full max-w-sm grid-cols-3 gap-2 text-center">
            {[{ t: 'Location', i: 'location' as const }, { t: 'Contacts', i: 'family' as const }, { t: 'Medical', i: 'vault' as const }].map((x) => (
              <div key={x.t} className="rounded-2xl bg-white/[0.05] px-2 py-2.5 ring-1 ring-inset ring-white/10"><Icon name={x.i} size={16} className="mx-auto text-cyan-300" /><span className="mt-1 block text-[11.5px] text-midnight-200">{x.t}</span></div>
            ))}
          </div>
        </Panel>

        {/* right: services + hospitals + comms */}
        <div className="order-3 space-y-4">
          <Panel className="p-5">
            <Kicker>Emergency services</Kicker>
            <div className="mt-3 space-y-2">{lines.slice(0, 2).map((l) => <EmergencyServiceCard key={l.key} line={l} compact />)}</div>
            <button onClick={() => nav.tab('services')} className="mt-2 text-[12.5px] font-semibold text-teal-600">All services →</button>
          </Panel>
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-2"><Kicker>Nearby hospitals</Kicker>{radar.live ? <StatusChip status="estimated" label="ETA est." /> : <Honest />}</div>
            <ul className="mt-3 space-y-2">
              {hospitals.map((h) => (
                <motion.li key={h.id} variants={rise} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${KIND_COLOR.hospital}1F`, color: '#0891B2' }}><Icon name={KIND_ICON.hospital} size={17} /></span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] text-ink">{h.name}</b><span className="block font-mono text-[11.5px] text-ink-muted">{fmtKm(h.distance)} · ~{fmtEta(h.etaMin)}</span></span>
                </motion.li>
              ))}
              {!fix && <li className="text-[13px] text-ink-muted">Enable location to list hospitals near you.</li>}
              {fix && radar.points && !hospitals.length && <li className="text-[13px] text-ink-muted">No mapped hospitals within 5 km.</li>}
            </ul>
          </Panel>
          <BroadcastStatus light />
          <div className={cx('flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-inset ring-line')}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-clinic-100 text-ink-soft"><Icon name="info" size={17} /></span>
            <span className="min-w-0 flex-1"><b className="block text-[13.5px] text-ink">Notification status</b><span className="block text-[12px] text-ink-muted">{notif?.detail ?? 'Unknown on this device'}</span></span>
            <StatusChip status={notif?.state === 'ok' ? 'ready' : 'pending'} />
          </div>
        </div>
      </motion.div>
      <p className="mt-6 text-center text-[12px] text-ink-faint">LifeLine Hub alerts your contacts and shares your location. It does not dispatch an ambulance or police — call {lines[0]?.number} for emergency services.</p>
    </Page>
  );
}
