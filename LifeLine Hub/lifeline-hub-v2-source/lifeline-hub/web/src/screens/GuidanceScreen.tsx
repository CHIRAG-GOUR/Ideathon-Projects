'use client';
/** AI GUIDANCE — Stay calm. Know what to do next. */
import { motion } from 'framer-motion';
import { useApp } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { Kicker, Panel } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { AIGuidance } from '@/components/lifeline/AIGuidance';

const ARCH: { icon: IconName; t: string; d: string; state: string }[] = [
  { icon: 'devices', t: 'On-device triage', d: 'Rule-based protocols run on this device — instant and offline.', state: 'Active' },
  { icon: 'mic', t: 'Voice guidance', d: 'Steps read aloud with your device’s speech engine.', state: 'Active' },
  { icon: 'ai', t: 'Cloud models for extended guidance', d: 'Planned. No cloud model is configured in this build.', state: 'Not configured' },
];

export function GuidanceScreen() {
  const { nav } = useApp();
  return (
    <Page>
      <PageTitle kicker="AI Guidance" title="Stay calm. Know what to do next." sub="Short, step-by-step guidance and calming scripts while help is on the way. For anything serious, the first step is always to call emergency services." tone="violet" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel tone="command" className="p-5 sm:p-6"><div className="relative"><AIGuidance key={nav.arg ?? 'none'} initial={nav.arg} /></div></Panel>
        <div className="space-y-4">
          <Panel className="p-5">
            <Kicker tone="violet">How guidance works</Kicker>
            <ul className="mt-3 space-y-3">
              {ARCH.map((a, i) => (
                <motion.li key={a.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-500"><Icon name={a.icon} size={17} /></span>
                  <span><b className="block text-[14px] text-ink">{a.t}</b><span className="block text-[12.5px] text-ink-muted">{a.d}</span><span className="mt-0.5 inline-block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-violet-500">{a.state}</span></span>
                </motion.li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-5">
            <Kicker tone="coral">Not a doctor</Kicker>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">LifeLine Guidance gives general first-aid steps. It does not diagnose, and it does not replace emergency services or professional medical care. If someone is unresponsive, not breathing normally, bleeding heavily, or has chest pain — call emergency services first.</p>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
