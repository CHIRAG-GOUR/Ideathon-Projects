'use client';
/**
 * LIFELINE HELPERS — community response. In Demo mode: a simulated nearby network (first names only, no precise
 * locations). In the real app: the network is a pilot — users can register interest; nobody is shown as
 * "verified" without a verification process, and no helper's location is ever public.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import { api } from '@core/api';
import { useDoc } from '@core/data';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Btn, Field, Honest, Kicker, Panel, StatusChip, cx, inputCls, rise, stagger } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { fmtEta, fmtKm } from '@/services/georadar/radar';

const SKILLS = [['first_aid', 'First aid'], ['cpr', 'CPR'], ['medical_professional', 'Medical professional'], ['driver', 'Can drive'], ['other', 'Other']] as const;

export function HelpersScreen() {
  const { demo, radar, uid, toast } = useApp();
  const helpers = (radar.points ?? []).filter((p) => p.kind === 'helper');
  const reg = useDoc<{ city: string; skills: string[]; status: string }>(!demo && uid ? `lifelineHelpers/${uid}` : null);
  const [city, setCity] = useState('');
  const [skills, setSkills] = useState<string[]>(['first_aid']);
  const [busy, setBusy] = useState(false);
  const register = async (withdraw = false) => {
    setBusy(true);
    try { await api('/helpers/register', { city: city || reg?.city || 'Unknown', skills, withdraw }); toast(withdraw ? 'Registration withdrawn.' : 'Thanks — your interest is registered.'); } catch (e) { toast((e as Error).message); }
    setBusy(false);
  };
  return (
    <Page>
      <PageTitle kicker="LifeLine Helpers" title="Community response, verified." sub="Trained people nearby who can reach you in the minutes before an ambulance does. A trusted emergency network — not a social network." right={demo ? <Honest kind="simulated">Simulated network</Honest> : <StatusChip status="pending" label="Pilot · not live" />} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel tone="command" className="p-5 sm:p-6">
          <Kicker tone="cyan">Nearby helpers</Kicker>
          {demo ? (
            <motion.ul variants={stagger(0.07)} initial="hidden" animate="show" className="relative mt-4 space-y-2">
              {helpers.map((h) => (
                <motion.li key={h.id} variants={rise} className="flex items-center gap-3 rounded-3xl bg-clinic-50 p-3.5 ring-1 ring-inset ring-line">
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-400/15 font-display text-[18px] font-semibold text-teal-600">{h.name[0]}
                    {h.status !== 'busy' && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-vital-400 ring-2 ring-line" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><b className="text-[15px]">{h.name}</b><span className="inline-flex items-center gap-1 rounded-full bg-teal-400/15 px-2 py-0.5 text-[10.5px] font-semibold text-teal-600"><Icon name="safe" size={11} />Verified LifeLine Helper</span></span>
                    <span className="block text-[12px] text-ink-muted">{h.note}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-[13px] font-semibold">{fmtKm(h.distance)}</span>
                    <span className="block font-mono text-[11px] text-ink-faint">ETA {fmtEta(h.etaMin)}</span>
                    <span className={cx('mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold', h.status === 'busy' ? 'bg-clinic-100 text-ink-muted' : h.status === 'responding' ? 'bg-cyan-50 text-cyan-600' : 'bg-vital-400/20 text-vital-600')}>{h.status === 'busy' ? 'Unavailable' : h.status === 'responding' ? 'Responding' : 'Available'}</span>
                  </span>
                </motion.li>
              ))}
              <li className="pt-1"><Honest dark kind="simulated">Fictional helpers · first names and approximate distance only</Honest></li>
            </motion.ul>
          ) : (
            <div className="relative mt-4 rounded-3xl bg-clinic-50 p-6 text-center ring-1 ring-inset ring-line">
              <Icon name="helpers" size={34} className="mx-auto text-teal-600" />
              <p className="mt-3 font-display text-[18px] font-semibold">The helper network isn’t live in your area yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-ink-muted">When it launches, an SOS can reach verified helpers within a few minutes of you. Until then, LifeLine Hub alerts your own emergency contacts.</p>
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel className="p-5">
            <Kicker>How helpers are trusted</Kicker>
            <ul className="mt-3 space-y-2.5 text-[13.5px] text-ink-soft">
              {[['safe', 'Verified identity and training before activation'], ['lock', 'People in need see a first name, distance and ETA — never a home address'], ['eye', 'Helpers see an SOS location only while they are responding'], ['shield', 'Helpers don’t replace emergency services; they bridge the first minutes']].map(([i, t]) => (
                <li key={t} className="flex gap-2.5"><Icon name={i as 'safe'} size={17} className="mt-0.5 shrink-0 text-teal-600" />{t}</li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-5">
            <Kicker>Become a LifeLine Helper</Kicker>
            {demo ? <p className="mt-2 text-[13.5px] text-ink-muted">Registration is available when signed in (not in demo mode).</p> : reg ? (
              <div className="mt-3">
                <StatusChip status="pending" label="Pending verification" />
                <p className="mt-2 text-[13.5px] text-ink-soft">Registered for {reg.city}. We’ll contact you when the pilot reaches your area. You are not shown to anyone.</p>
                <Btn tone="ghost" size="sm" className="mt-2" disabled={busy} onClick={() => register(true)}>Withdraw</Btn>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <Field label="Your city"><input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" /></Field>
                <div className="flex flex-wrap gap-1.5">{SKILLS.map(([k, l]) => <button key={k} onClick={() => setSkills(skills.includes(k) ? skills.filter((x) => x !== k) : [...skills, k])} aria-pressed={skills.includes(k)} className={cx('rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset', skills.includes(k) ? 'bg-teal-500 text-white ring-teal-500' : 'text-ink-soft ring-line')}>{l}</button>)}</div>
                <Btn className="w-full" disabled={busy || city.trim().length < 2} onClick={() => register(false)}>Register interest</Btn>
                <p className="text-[11.5px] text-ink-faint">Registering doesn’t make you visible or “verified”. It only records your interest for the pilot.</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
