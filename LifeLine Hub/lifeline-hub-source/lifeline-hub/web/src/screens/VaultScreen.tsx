'use client';
/** HEALTH VAULT — critical information first, the full profile on demand, and responder access you control. */
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useApp } from '@/ctx';
import { Icon } from '@/ui/icons';
import { Btn, Honest, Kicker, Panel, StatusChip, rise, stagger } from '@/ui/kit';
import { Page, PageTitle } from '@/components/lifeline/LifeLineShell';
import { AccessLogList, FullProfile, MedicalAccessToken, MedicalSummary, VaultEditor, VaultSecurity, useLogs } from '@/components/lifeline/HealthVault';
import { ScoreRing } from '@/components/lifeline/Readiness';
import { EMPTY_MEDICAL, readiness } from '@/services/health/vault';

export function VaultScreen() {
  const { medical, demo } = useApp();
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  const logs = useLogs();
  const m = medical ?? EMPTY_MEDICAL;
  const r = readiness(medical ?? null);
  return (
    <Page wide>
      <PageTitle kicker="Health Vault" title="Your critical medical context, ready when it matters." sub="Responders act faster when they know your blood group, allergies, medications and conditions. You decide who sees what, and for how long."
        right={<div className="flex items-center gap-2">{demo && <Honest kind="demo" />}<Btn icon="edit" tone="white" onClick={() => setEdit(true)}>Edit</Btn></div>} />
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-4">
          <Panel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Kicker>Critical information</Kicker>
                <h2 className="mt-1 font-display text-[22px] font-semibold tracking-tight text-ink">What a responder needs first</h2>
              </div>
              <div className="flex items-center gap-2"><span className="font-display text-[20px] font-semibold text-ink">{Math.round(r.score * 100)}%</span><ScoreRing value={r.score} size={44} /></div>
            </div>
            <div className="mt-4"><MedicalSummary m={medical} /></div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {r.items.map((i) => <li key={i.key}><StatusChip status={i.ok ? 'ready' : 'pending'} label={i.label} /></li>)}
            </ul>
            {medical === null && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-[13.5px] text-amber-700">
                Your Health Vault is empty. Add your blood group, allergies and medications — it takes a minute.
                <Btn size="sm" tone="primary" className="mt-3" icon="plus" onClick={() => setEdit(true)}>Set up Health Vault</Btn>
              </div>
            )}
          </Panel>
          <Panel className="p-5 sm:p-6">
            <button onClick={() => setFull(!full)} aria-expanded={full} className="flex w-full items-center justify-between gap-3 text-left">
              <div><Kicker>Full medical profile</Kicker><h2 className="mt-1 font-display text-[20px] font-semibold tracking-tight text-ink">Everything else, when it’s needed</h2></div>
              <motion.span animate={{ rotate: full ? 180 : 0 }} className="grid h-10 w-10 place-items-center rounded-full bg-clinic-100 text-ink-soft"><Icon name="down" size={18} /></motion.span>
            </button>
            {full && <div className="mt-4"><FullProfile m={m} /></div>}
          </Panel>
        </div>
        <div className="space-y-4">
          <motion.div variants={rise}><MedicalAccessToken /></motion.div>
          <Panel className="p-5 sm:p-6">
            <Kicker>Security</Kicker>
            <h2 className="mt-1 font-display text-[20px] font-semibold tracking-tight text-ink">Encrypted · controlled · logged</h2>
            <div className="mt-4"><VaultSecurity /></div>
            <p className="mt-3 text-[11.5px] text-ink-faint">No additional end-to-end encryption layer is used in this version; the app makes no claim beyond what is listed.</p>
          </Panel>
          <Panel className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2"><Kicker>Access log</Kicker>{demo && <Honest kind="demo" />}</div>
            <div className="mt-4"><AccessLogList logs={logs} /></div>
          </Panel>
        </div>
      </motion.div>
      <VaultEditor open={edit} onClose={() => setEdit(false)} m={m} />
    </Page>
  );
}
