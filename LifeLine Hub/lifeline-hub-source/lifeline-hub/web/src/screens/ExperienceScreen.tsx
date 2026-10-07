'use client';
/**
 * EXPERIENCE LIFELINE — the cinematic product demo (lazy-loaded with its 3D engine), framed by what is real in
 * the app today and what the film simulates.
 */
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { Kicker, Panel, rise, stagger } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';

const Player = dynamic(() => import('@/cinematic/Player'), {
  ssr: false,
  loading: () => <div className="grid aspect-[4/5] w-full place-items-center rounded-[28px] bg-midnight-950 sm:aspect-video"><span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" /></div>,
});

const REAL: [IconName, string, string][] = [
  ['sos', '3-second SOS hold', 'The exact control you hold in the film starts a real SOS in the app.'],
  ['location', 'Live location', 'GPS fix shared through a private live link your contacts can open.'],
  ['whatsapp', 'WhatsApp + SMS', 'Pre-written alerts open in WhatsApp or your SMS app with your location.'],
  ['vault', 'Health Vault', 'Your own medical card, plus expiring, logged responder links.'],
  ['radar', 'Geo-Radar', 'Hospitals, police and fire stations from OpenStreetMap, ETAs estimated from distance.'],
  ['ai', 'Guidance', 'Step-by-step first-aid prompts from an on-device prototype engine.'],
];
const SIMULATED: [IconName, string][] = [
  ['ambulance', 'The ambulance, its crew and the 04:32 ETA'],
  ['family', 'Arjun, his parents and every bystander'],
  ['hospital', 'City General Hospital and the street'],
  ['helper', 'LifeLine Helpers on the radar'],
];

export default function ExperienceScreen() {
  const { nav } = useApp();
  return (
    <Page wide>
      <PageTitle kicker="Experience LifeLine" title="From incident to care, in two minutes." sub="A dramatized, interactive film. When Arjun reaches for his phone, you hold the SOS." tone="cyan" />
      <motion.div variants={rise} initial="hidden" animate="show">
        <Player onTrySos={() => nav.tab('sos')} />
      </motion.div>
      <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="p-5">
          <Kicker tone="teal">Real in the app</Kicker>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REAL.map(([i, t, d]) => (
              <motion.li key={t} variants={rise} className="flex gap-3 rounded-2xl bg-clinic-50 p-3 ring-1 ring-inset ring-line">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-600"><Icon name={i} size={18} /></span>
                <span className="min-w-0"><b className="block text-[13.5px] text-ink">{t}</b><span className="block text-[12px] leading-snug text-ink-muted">{d}</span></span>
              </motion.li>
            ))}
          </ul>
        </Panel>
        <Panel tone="command" className="p-5">
          <Kicker tone="cyan">Simulated in the film</Kicker>
          <ul className="mt-3 space-y-2">
            {SIMULATED.map(([i, t]) => (
              <motion.li key={t} variants={rise} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-violet-200"><Icon name={i} size={18} /></span>
                <span className="text-[13px] text-white/85">{t}</span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-snug text-midnight-200">LifeLine Hub does not dispatch ambulances or police. It gets your family and the official emergency numbers the facts faster — where you are, who you are, what you need.</p>
        </Panel>
      </motion.div>
    </Page>
  );
}
