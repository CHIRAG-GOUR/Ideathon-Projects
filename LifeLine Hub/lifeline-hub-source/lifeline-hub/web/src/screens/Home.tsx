'use client';
/**
 * HOME — the product explained without overwhelm: Emergency care, connected. A calm hero with an "Emergency
 * ready" console, the LifeLine network at the centre, readiness on the left, medical status on the right, the
 * Incident → Care chain, and the radar, activity, guidance and devices below.
 */
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Btn, Honest, Kicker, Panel, StatusChip, cx, rise, stagger } from '@/ui/kit';
import { Page } from '@/components/lifeline/LifeLineShell';
import { LifeLineNetwork, PillarChain } from '@/components/lifeline/Network';
import { ReadinessPanel, useEmergencyReadiness } from '@/components/lifeline/Readiness';
import { MedicalSummary } from '@/components/lifeline/HealthVault';
import { RadarView, KIND_ICON } from '@/components/lifeline/RadarView';
import { RecentActivity, WearableStatus } from '@/components/lifeline/Activity';
import { PROTOCOLS } from '@/services/guidance/protocols';
import { fmtEta, fmtKm, KIND_COLOR } from '@/services/georadar/radar';
import { readiness as vaultReadiness } from '@/services/health/vault';

export function Home() {
  const { nav, demo, profile, user, fix, locState, locate, radar, medical, lines } = useApp();
  const readyRef = useRef<HTMLDivElement>(null);
  const { score } = useEmergencyReadiness();
  const [sel, setSel] = useState<string | null>(null);
  const name = demo ? 'Arjun' : (profile?.name || user?.displayName || '').split(' ')[0];
  const top = (radar.points ?? []).slice(0, 4);
  const v = vaultReadiness(medical ?? null);

  return (
    <Page wide>
      <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-5 lg:space-y-6">
        {/* ------------------------------------------------ HERO */}
        <motion.section variants={rise} className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="pt-2">
            <Kicker>{name ? `Good to see you, ${name} · ` : ''}LifeLine Hub</Kicker>
            <h1 className="mt-3 font-display text-[40px] font-semibold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[58px]">
              Emergency care,<br /><span className="bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">connected.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-muted">One place to trigger help, share the right medical context, find nearby assistance and get guidance while help is on the way.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Btn tone="coral" size="lg" icon="sos" onClick={() => nav.tab('sos')}>SOS</Btn>
              <Btn tone="white" size="lg" icon="shield" onClick={() => readyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Explore emergency readiness</Btn>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {['SOS Push', 'Health Vault', 'Geo-Radar', 'AI Guidance'].map((p, i) => (
                <motion.span key={p} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft ring-1 ring-inset ring-line">{p}</motion.span>
              ))}
            </div>
          </div>
          {/* emergency-ready console */}
          <Panel tone="command" className="p-5 sm:p-6">
            <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative flex items-center gap-5">
              <button onClick={() => nav.tab('sos')} aria-label="Open SOS Push" className="relative grid h-[118px] w-[118px] shrink-0 place-items-center rounded-full">
                {[0, 1].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border border-coral-400/50" initial={{ scale: 0.8, opacity: 0.6 }} animate={{ scale: 1.25, opacity: 0 }} transition={{ duration: 3, repeat: Infinity, delay: i * 1.5 }} />)}
                <svg viewBox="0 0 100 100" className="absolute inset-0"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2" /><motion.circle cx="50" cy="50" r="46" fill="none" stroke="#3DBB7E" strokeWidth="2.5" strokeLinecap="round" transform="rotate(-90 50 50)" initial={{ strokeDasharray: '0 289' }} animate={{ strokeDasharray: `${score * 289} 289` }} transition={{ duration: 1.2 }} /></svg>
                <span className="grid h-[84px] w-[84px] place-items-center rounded-full bg-gradient-to-b from-midnight-700 to-midnight-900 ring-1 ring-coral-500/40">
                  <span className="text-center"><span className="block font-display text-[22px] font-bold tracking-wide text-white">SOS</span><span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-coral-300">hold 3 s</span></span>
                </span>
              </button>
              <div className="min-w-0">
                <StatusChip status="ready" label="Emergency ready" dark />
                <p className="mt-2 font-display text-[22px] font-semibold leading-tight">{Math.round(score * 100)}% ready</p>
                <p className="mt-1 text-[13px] text-midnight-200">{fix ? (demo ? 'Demo location · New Delhi' : `Location ready · ±${Math.round(fix.accuracy ?? 30)} m`) : locState === 'locating' ? 'Finding your location…' : 'Location not enabled'}</p>
                {!fix && !demo && <button onClick={locate} className="mt-2 text-[13px] font-semibold text-cyan-300">Enable location →</button>}
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-3 gap-2">
              {lines.slice(1).map((l) => (
                <a key={l.key} href={`tel:${l.number}`} className="rounded-2xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]">
                  <span className="block text-[11px] text-midnight-200">{l.label}</span>
                  <span className="block font-display text-[18px] font-semibold">{l.number}</span>
                </a>
              ))}
            </div>
          </Panel>
        </motion.section>

        {/* ------------------------------------------------ READINESS · NETWORK · MEDICAL */}
        <div ref={readyRef} className="grid grid-cols-1 scroll-mt-20 gap-4 lg:grid-cols-[320px_1fr_340px]">
          <Panel className="order-2 p-5 lg:order-1">
            <ReadinessPanel />
          </Panel>
          <Panel tone="command" className="order-1 p-4 sm:p-6 lg:order-2">
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <Kicker tone="cyan">The LifeLine network</Kicker>
                <h2 className="mt-1 font-display text-[22px] font-semibold tracking-tight">Everyone who can help, linked to you</h2>
              </div>
              {demo && <Honest dark kind="demo" />}
            </div>
            <LifeLineNetwork className="mx-auto mt-2 max-w-[560px]" />
          </Panel>
          <Panel className="order-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Kicker>Medical status</Kicker>
                <h2 className="mt-1 font-display text-[20px] font-semibold tracking-tight text-ink">Critical information</h2>
              </div>
              <StatusChip status={v.score >= 0.75 ? 'ready' : 'pending'} label={v.score >= 0.75 ? 'Responder-ready' : 'Incomplete'} />
            </div>
            <div className="mt-4"><MedicalSummary m={medical} compact /></div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-teal-50 px-3 py-2.5 text-[12.5px] text-teal-700">
              <Icon name="lock" size={15} />Private to you · shared only through links you create
            </div>
            <Btn tone="soft" className="mt-3 w-full" icon="vault" onClick={() => nav.tab('vault')}>Open Health Vault</Btn>
          </Panel>
        </div>

        {/* ------------------------------------------------ CHAIN */}
        <Panel className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Kicker>From incident to care</Kicker>
              <h2 className="mt-1 font-display text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">One emergency intelligence system</h2>
            </div>
            <button onClick={() => nav.tab('experience')} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-teal-600"><Icon name="film" size={16} />Experience LifeLine</button>
          </div>
          <PillarChain />
        </Panel>

        {/* ------------------------------------------------ RADAR · ACTIVITY · GUIDANCE · DEVICES */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Panel tone="command" className="p-5 sm:p-6">
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <Kicker tone="cyan">Geo-Radar</Kicker>
                <h2 className="mt-1 font-display text-[22px] font-semibold tracking-tight">Help around you</h2>
              </div>
              {radar.live ? <StatusChip status="estimated" label="ETA estimated" dark /> : <Honest dark kind="simulated" />}
            </div>
            <div className="relative mt-3 grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,260px)_1fr]">
              {fix ? (
                radar.points ? <RadarView points={radar.points} compact selected={sel} onSelect={setSel} className="mx-auto max-w-[260px]" /> : <div className="mx-auto aspect-square w-full max-w-[260px] animate-pulse rounded-full bg-white/[0.04]" />
              ) : (
                <div className="mx-auto grid aspect-square w-full max-w-[260px] place-items-center rounded-full bg-white/[0.04] p-8 text-center ring-1 ring-inset ring-white/10">
                  <div><Icon name="location" size={26} className="mx-auto text-cyan-300" /><p className="mt-2 text-[13px] text-midnight-200">Enable location to see hospitals, police and safe zones near you.</p><Btn tone="outline" size="sm" className="mt-3" onClick={locate}>Enable</Btn></div>
                </div>
              )}
              <ul className="space-y-1.5">
                {top.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setSel(p.id)} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 ring-inset transition', sel === p.id ? 'bg-white/[0.08] ring-cyan-300/30' : 'ring-white/5 hover:bg-white/[0.04]')}>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl" style={{ background: `${KIND_COLOR[p.kind]}22`, color: KIND_COLOR[p.kind] }}><Icon name={KIND_ICON[p.kind]} size={16} /></span>
                      <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{p.name}</b><span className="block font-mono text-[11px] text-midnight-300">{fmtKm(p.distance)} · ~{fmtEta(p.etaMin)}</span></span>
                    </button>
                  </li>
                ))}
                {fix && radar.points && !top.length && <li className="text-[13px] text-midnight-200">No mapped help found nearby.</li>}
                {radar.error && <li className="text-[13px] text-amber-300">{radar.error}</li>}
                <li><button onClick={() => nav.tab('radar')} className="mt-1 text-[13px] font-semibold text-cyan-300">Open Geo-Radar →</button></li>
              </ul>
            </div>
          </Panel>
          <div className="grid gap-4">
            <Panel className="p-5">
              <div className="flex items-center justify-between"><Kicker tone="violet">AI Guidance</Kicker><span className="text-[11.5px] text-ink-faint">On-device · works offline</span></div>
              <h2 className="mt-1 font-display text-[19px] font-semibold tracking-tight text-ink">What happened?</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PROTOCOLS.slice(0, 6).map((p) => (
                  <motion.button key={p.id} whileTap={{ scale: 0.96 }} onClick={() => nav.go('guidance', p.id)} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[12.5px] font-semibold text-violet-600 hover:bg-violet-100">
                    <Icon name={p.icon} size={14} />{p.label}
                  </motion.button>
                ))}
              </div>
            </Panel>
            <div className="grid gap-4">
              <Panel className="p-5">
                <Kicker>Recent activity</Kicker>
                <div className="mt-2"><RecentActivity max={4} /></div>
              </Panel>
              <motion.div variants={rise}>
                <p className="mb-2 px-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-teal-600">Connected devices</p>
                <WearableStatus />
              </motion.div>
            </div>
          </div>
        </div>

        <p className="pb-2 text-center text-[12px] text-ink-faint">LifeLine Hub is not an emergency service and does not dispatch ambulances or police. In danger, call {lines[0]?.number}.</p>
      </motion.div>
    </Page>
  );
}
