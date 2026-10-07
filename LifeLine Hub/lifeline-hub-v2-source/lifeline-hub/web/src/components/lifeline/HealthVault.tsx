'use client';
/**
 * Health Vault components: critical summary, expandable full profile, security model, access log, the
 * responder access token (QR, expiry, scope) and the editor.
 */
import { AnimatePresence, motion } from 'framer-motion';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ago } from '@shared/geo';
import { useApp, ORIGIN } from '@/ctx';
import { Icon, type IconName } from '@/ui/icons';
import { BottomSheet, Btn, Field, Honest, StatusChip, cx, inputCls, rise, stagger } from '@/ui/kit';
import {
  DEFAULT_SCOPE, EMPTY_MEDICAL, SCOPES, SCOPE_LABEL, createVaultLink, demoLogs, responderUrl, revokeVaultLink, saveMedical, useAccessLogs, useCountdown, useVaultTokens,
  type AccessLog, type MedicalProfile, type Scope,
} from '@/services/health/vault';

// ---------------------------------------------------------------------------------------------- summary
export function MedicalSummary({ m, dark, compact }: { m: MedicalProfile | null | undefined; dark?: boolean; compact?: boolean }) {
  const { demo } = useApp();
  if (m === undefined) return <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;
  const v = m ?? EMPTY_MEDICAL;
  const cells: { k: string; icon: IconName; label: string; value: ReactNode; warn?: boolean; big?: boolean }[] = [
    { k: 'b', icon: 'blood', label: 'Blood group', value: v.bloodGroup ?? 'Not set', big: !!v.bloodGroup, warn: !v.bloodGroup },
    { k: 'a', icon: 'allergy', label: 'Allergies', value: v.allergies.length ? v.allergies.join(', ') : v.updatedAt ? 'None recorded' : 'Not reviewed', warn: v.allergies.length > 0 },
    { k: 'm', icon: 'pill', label: 'Medication', value: v.medications.length ? v.medications.map((x) => x.name).join(', ') : v.updatedAt ? 'None recorded' : 'Not set' },
    { k: 'c', icon: 'condition', label: 'Conditions', value: v.conditions.length ? v.conditions.join(', ') : v.updatedAt ? 'None recorded' : 'Not set' },
  ];
  return (
    <div>
      {demo && <Honest kind="demo" dark={dark} className="mb-2" />}
      <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className={cx('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4')}>
        {cells.map((c) => (
          <motion.div key={c.k} variants={rise} className={cx('rounded-2xl p-3', dark ? 'bg-clinic-50 ring-1 ring-inset ring-line' : 'bg-clinic-50 ring-1 ring-inset ring-line')}>
            <div className={cx('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', dark ? 'text-ink-muted' : 'text-ink-muted')}>
              <Icon name={c.icon} size={13} className={c.warn ? 'text-amber-500' : dark ? 'text-cyan-600' : 'text-teal-500'} />{c.label}
            </div>
            <div className={cx('mt-1 line-clamp-2 font-semibold', c.big ? 'font-display text-[26px] leading-none' : 'text-[14px] leading-snug', dark ? 'text-ink' : 'text-ink')}>{c.value}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- expandable cards
export function ExpandCard({ icon, title, summary, children, tone = 'teal', defaultOpen }: { icon: IconName; title: string; summary: ReactNode; children: ReactNode; tone?: 'teal' | 'violet' | 'amber'; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const c = { teal: 'bg-teal-50 text-teal-600', violet: 'bg-violet-50 text-violet-500', amber: 'bg-amber-50 text-amber-600' }[tone];
  return (
    <motion.div layout className="overflow-hidden rounded-3xl bg-white ring-1 ring-inset ring-line">
      <motion.button layout="position" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', c)}><Icon name={icon} size={19} /></span>
        <span className="min-w-0 flex-1"><b className="block text-[15px] text-ink">{title}</b><span className="block truncate text-[12.5px] text-ink-muted">{summary}</span></span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-faint"><Icon name="down" size={18} /></motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <div className="border-t border-line px-4 pb-4 pt-3 text-[14px] text-ink-soft">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FullProfile({ m }: { m: MedicalProfile }) {
  return (
    <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="space-y-2">
      <motion.div variants={rise}><ExpandCard icon="pill" title="Medications" summary={m.medications.length ? `${m.medications.length} recorded` : 'None recorded'}>
        {m.medications.length ? <ul className="space-y-1.5">{m.medications.map((x, i) => <li key={i} className="flex justify-between gap-3"><b className="text-ink">{x.name}</b><span className="text-ink-muted">{x.dose}</span></li>)}</ul> : 'No medications recorded.'}
      </ExpandCard></motion.div>
      <motion.div variants={rise}><ExpandCard icon="condition" title="Conditions" summary={m.conditions.length ? m.conditions.join(', ') : 'None recorded'}>
        {m.conditions.length ? <div className="flex flex-wrap gap-1.5">{m.conditions.map((c) => <span key={c} className="rounded-full bg-clinic-100 px-3 py-1 text-[13px] font-medium text-ink">{c}</span>)}</div> : 'No conditions recorded.'}
      </ExpandCard></motion.div>
      <motion.div variants={rise}><ExpandCard icon="note" title="Emergency notes" summary={m.emergencyNotes ?? 'None'} tone="amber">{m.emergencyNotes ?? 'No notes.'}</ExpandCard></motion.div>
      <motion.div variants={rise}><ExpandCard icon="contact" title="Emergency contact" summary={m.emergencyContact ? `${m.emergencyContact.name} · ${m.emergencyContact.relationship}` : 'Not set'} tone="violet">
        {m.emergencyContact ? <p><b className="text-ink">{m.emergencyContact.name}</b> ({m.emergencyContact.relationship}) · <span className="font-mono">{m.emergencyContact.phone}</span></p> : 'Add the person responders should call.'}
      </ExpandCard></motion.div>
      <motion.div variants={rise}><ExpandCard icon="doctor" title="Doctor" summary={m.doctor ? `${m.doctor.name}${m.doctor.clinic ? ` · ${m.doctor.clinic}` : ''}` : 'Not set'}>
        {m.doctor ? <p><b className="text-ink">{m.doctor.name}</b>{m.doctor.clinic && ` · ${m.doctor.clinic}`} · <span className="font-mono">{m.doctor.phone}</span></p> : 'Optional: your regular doctor.'}
      </ExpandCard></motion.div>
      <motion.div variants={rise}><ExpandCard icon="heart" title="Organ donor" summary={m.organDonor == null ? 'Not stated' : m.organDonor ? 'Yes' : 'No'} tone="violet">
        {m.organDonor == null ? 'You have not stated a preference.' : m.organDonor ? 'You have indicated you are an organ donor.' : 'You have indicated you are not an organ donor.'}
      </ExpandCard></motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------------------------- security
export function VaultSecurity({ dark }: { dark?: boolean }) {
  const rows: { icon: IconName; t: string; d: string }[] = [
    { icon: 'lock', t: 'Encrypted', d: 'In transit (HTTPS) and at rest (Google Cloud Firestore encryption).' },
    { icon: 'shield', t: 'Controlled access', d: 'Security rules: only your signed-in account can read your vault.' },
    { icon: 'key', t: 'Responder access', d: 'Temporary, scoped links you create — expire automatically, revocable.' },
    { icon: 'history', t: 'Access log', d: 'Every responder view is recorded by the server, not the device.' },
  ];
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {rows.map((r, i) => (
        <motion.li key={r.t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} className={cx('flex gap-3 rounded-2xl p-3', dark ? 'bg-clinic-50 ring-1 ring-inset ring-line' : 'bg-white ring-1 ring-inset ring-line')}>
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', dark ? 'bg-cyan-50 text-cyan-600' : 'bg-teal-50 text-teal-600')}><Icon name={r.icon} size={18} /></span>
          <span><b className={cx('block text-[14px]', dark ? 'text-ink' : 'text-ink')}>{r.t}</b><span className={cx('block text-[12.5px] leading-snug', dark ? 'text-ink-muted' : 'text-ink-muted')}>{r.d}</span></span>
        </motion.li>
      ))}
    </ul>
  );
}

export function AccessLogList({ logs, dark }: { logs: AccessLog[] | undefined; dark?: boolean }) {
  if (logs === undefined) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>;
  if (!logs.length) return <p className={cx('text-[13.5px]', dark ? 'text-ink-muted' : 'text-ink-muted')}>No access yet. When a responder opens a link you share, it appears here.</p>;
  const icon = (k: AccessLog['kind']): IconName => (k === 'responder_view' ? 'eye' : k === 'token_created' ? 'key' : k === 'token_revoked' ? 'x' : 'edit');
  return (
    <ol className="relative space-y-3 pl-6">
      <span className={cx('absolute bottom-2 left-[11px] top-2 w-px', dark ? 'bg-clinic-100' : 'bg-line')} />
      {logs.map((l, i) => (
        <motion.li key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
          <span className={cx('absolute -left-6 top-0.5 grid h-[22px] w-[22px] place-items-center rounded-full ring-4', l.kind === 'responder_view' ? 'bg-cyan-500 text-white' : dark ? 'bg-clinic-100 text-ink-muted' : 'bg-clinic-200 text-ink-soft', dark ? 'ring-line' : 'ring-white')}>
            <Icon name={icon(l.kind)} size={12} strokeWidth={2.4} />
          </span>
          <p className={cx('text-[13.5px] font-semibold', dark ? 'text-ink' : 'text-ink')}>{l.actor}</p>
          <p className={cx('text-[12.5px]', dark ? 'text-ink-muted' : 'text-ink-muted')}>{l.detail}</p>
          <p className={cx('font-mono text-[11px]', dark ? 'text-ink-faint' : 'text-ink-faint')}>{ago(l.at)}</p>
        </motion.li>
      ))}
    </ol>
  );
}

export function useLogs(): AccessLog[] | undefined {
  const { uid, demo } = useApp();
  const real = useAccessLogs(demo ? null : uid);
  return useMemo(() => (demo ? demoLogs() : real), [demo, real]);
}

// ---------------------------------------------------------------------------------------------- QR
export function QR({ value, size = 220, dark }: { value: string; size?: number; dark?: boolean }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0E1B17', light: '#00000000' } }).then(setSvg).catch(() => setSvg(''));
  }, [value, dark]);
  return <div className="[&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="Responder access QR code" role="img" />;
}

/**
 * MedicalAccessToken — SHARE EMERGENCY MEDICAL ACCESS. Creates a temporary, scoped responder link (real, via the
 * server) and shows it as a QR with a countdown, the scope, and a revoke button. In Demo mode the token is
 * simulated (it opens a demonstration responder page) and says so.
 */
export function MedicalAccessToken({ dark, initialScope = DEFAULT_SCOPE, compact }: { dark?: boolean; initialScope?: Scope[]; compact?: boolean }) {
  const { demo, uid, prefs, toast } = useApp();
  const tokens = useVaultTokens(demo ? null : uid);
  const [scope, setScope] = useState<Scope[]>(initialScope);
  const [minutes, setMinutes] = useState(prefs.vaultLinkMinutes || 15);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ token: string; id: string; expiresAt: string } | null>(() => {
    try { const s = sessionStorage.getItem('lifelinehub.vaultLink'); const j = s ? JSON.parse(s) : null; return j && Date.parse(j.expiresAt) > Date.now() ? j : null; } catch { return null; }
  });
  const cd = useCountdown(link?.expiresAt ?? null);
  const live = link && !cd.expired && !(tokens?.find((t) => t.id === link.id)?.revoked);
  const views = tokens?.find((t) => t.id === link?.id)?.views ?? 0;

  const create = async () => {
    setBusy(true);
    try {
      const r = demo ? { token: 'demo', id: 'demo', expiresAt: new Date(Date.now() + minutes * 60000).toISOString() } : await createVaultLink(scope, minutes);
      setLink(r);
      try { sessionStorage.setItem('lifelinehub.vaultLink', JSON.stringify(r)); } catch { /* */ }
    } catch (e) {
      toast((e as Error).message || 'Could not create the link. Check your connection.');
    }
    setBusy(false);
  };
  const revoke = async () => {
    if (!link) return;
    if (!demo) await revokeVaultLink(link.id).catch(() => undefined);
    setLink(null);
    try { sessionStorage.removeItem('lifelinehub.vaultLink'); } catch { /* */ }
    toast('Responder link revoked.');
  };
  const url = link ? (demo ? `${ORIGIN}/r/demo` : responderUrl(ORIGIN, link.token)) : '';
  const total = minutes * 60000;
  const frac = link ? Math.min(1, cd.ms / total) : 1;

  return (
    <div className={cx('relative overflow-hidden rounded-4xl p-5 sm:p-6', dark ? 'surface-clinical text-ink' : 'surface-clinical text-ink')}>
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cyan-600">Emergency access</p>
          <h3 className="mt-1 font-display text-[22px] font-semibold tracking-tight">Share emergency medical access</h3>
          <p className="mt-1 max-w-md text-[13.5px] text-ink-muted">A temporary link for an authorised responder. It shows only what you choose, expires on its own, and every view is logged.</p>
        </div>
        {demo ? <Honest dark kind="simulated">Demo token</Honest> : live ? <StatusChip status="live" label="Link active" /> : <StatusChip status="off" label="No active link" dark />}
      </div>

      <div className={cx('relative mt-5 grid gap-6', compact ? '' : 'md:grid-cols-[auto_1fr]')}>
        {/* QR stage */}
        <div className="mx-auto">
          <div className="relative grid h-[248px] w-[248px] place-items-center rounded-[28px] bg-clinic-50 ring-1 ring-teal-500/15">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(125,231,250,.12)" strokeWidth="1.2" />
              <motion.circle cx="50" cy="50" r="48" fill="none" stroke={frac < 0.2 ? '#E89A16' : '#0B8A57'} strokeWidth="1.6" strokeLinecap="round" animate={{ strokeDasharray: `${frac * 301.6} 301.6` }} transition={{ duration: 0.4 }} />
            </svg>
            {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => <span key={`${x}${y}`} className="absolute h-6 w-6 border-cyan-300" style={{ left: x ? undefined : 18, right: x ? 18 : undefined, top: y ? undefined : 18, bottom: y ? 18 : undefined, borderTopWidth: y ? 0 : 2, borderBottomWidth: y ? 2 : 0, borderLeftWidth: x ? 0 : 2, borderRightWidth: x ? 2 : 0, borderRadius: 6 }} />)}
            <AnimatePresence mode="wait">
              {live ? (
                <motion.div key="qr" initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.45 }} className="relative rounded-2xl bg-white p-2.5">
                  <QR value={url} size={156} />
                  <motion.span className="absolute inset-x-2 h-[2px] bg-teal-400 shadow-[0_0_12px_#27A36C]" initial={{ top: '8%' }} animate={{ top: ['8%', '92%', '8%'] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }} />
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-cyan-50 text-cyan-600"><Icon name="qr" size={30} /></span>
                  <p className="mt-3 text-[13px] text-ink-muted">No active link</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {live && (
            <div className="mt-3 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">Expires in</p>
              <p className="font-display text-[30px] font-semibold tabular leading-none">{cd.label}</p>
              <p className="mt-1 text-[12px] text-ink-faint">{views ? `Viewed ${views} time${views > 1 ? 's' : ''}` : 'Not viewed yet'}</p>
            </div>
          )}
        </div>

        {/* scope + controls */}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ink-muted">Authorised responder can view</p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SCOPES.map((s) => {
              const on = scope.includes(s);
              return (
                <li key={s}>
                  <button disabled={!!live} onClick={() => setScope(on ? scope.filter((x) => x !== s) : [...scope, s])} aria-pressed={on} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition', on ? 'bg-teal-50 text-ink ring-1 ring-inset ring-teal-500/25' : 'text-ink-faint ring-1 ring-inset ring-line', live && 'cursor-default')}>
                    <span className={cx('grid h-5 w-5 place-items-center rounded-md', on ? 'bg-teal-500 text-white' : 'bg-clinic-100')}>{on && <Icon name="check" size={13} strokeWidth={3} />}</span>
                    {SCOPE_LABEL[s]}
                  </button>
                </li>
              );
            })}
          </ul>
          {!live && (
            <>
              <p className="mt-4 text-[12px] font-semibold text-ink-muted">Expires after</p>
              <div className="mt-2 flex gap-1.5">
                {[5, 15, 30, 60].map((m) => (
                  <button key={m} onClick={() => setMinutes(m)} className={cx('h-9 flex-1 rounded-xl text-[13px] font-semibold', minutes === m ? 'bg-teal-500 text-white' : 'bg-clinic-50 text-ink-muted')}>{m} min</button>
                ))}
              </div>
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {live ? (
              <>
                <Btn tone="outline" icon="send" onClick={() => { void navigator.clipboard?.writeText(url).then(() => toast('Link copied.')); }}>Copy link</Btn>
                <Btn tone="outline" icon="eye" onClick={() => window.open(url, '_blank')}>Preview</Btn>
                <Btn tone="coral" icon="x" onClick={revoke}>Revoke now</Btn>
              </>
            ) : (
              <Btn tone="primary" icon="key" disabled={busy || !scope.length || (!demo && !uid)} onClick={create}>{busy ? 'Creating…' : 'Generate emergency access'}</Btn>
            )}
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-faint">Responders don’t need an account. They never see your location history, contacts list or anything outside this scope.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- editor
export function VaultEditor({ open, onClose, m }: { open: boolean; onClose: () => void; m: MedicalProfile }) {
  const { uid, demo, toast } = useApp();
  const [d, setD] = useState<MedicalProfile>(m);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setD(m); }, [open, m]);
  const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    if (demo || !uid) return toast('Demo mode — edits are not saved.');
    setBusy(true);
    try { await saveMedical(uid, d); toast('Health Vault updated.'); onClose(); } catch (e) { toast(`Could not save: ${(e as Error).message}`); }
    setBusy(false);
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={<div><p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-teal-600">Health Vault</p><p className="font-display text-[19px] font-semibold">Edit medical profile</p></div>}>
      <div className="space-y-3">
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Blood group"><select className={inputCls} value={d.bloodGroup ?? ''} onChange={(e) => setD({ ...d, bloodGroup: e.target.value || null })}><option value="">Unknown</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="Allergies" hint="Comma separated · leave empty for none"><input className={inputCls} defaultValue={d.allergies.join(', ')} onBlur={(e) => setD({ ...d, allergies: list(e.target.value) })} placeholder="Penicillin, peanuts" /></Field>
        </div>
        <Field label="Conditions" hint="Comma separated"><input className={inputCls} defaultValue={d.conditions.join(', ')} onBlur={(e) => setD({ ...d, conditions: list(e.target.value) })} placeholder="Asthma, diabetes" /></Field>
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Medications</span>
          {d.medications.map((x, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input className={inputCls} value={x.name} placeholder="Name" onChange={(e) => setD({ ...d, medications: d.medications.map((y, j) => (j === i ? { ...y, name: e.target.value.slice(0, 60) } : y)) })} />
              <input className={inputCls} value={x.dose} placeholder="Dose" onChange={(e) => setD({ ...d, medications: d.medications.map((y, j) => (j === i ? { ...y, dose: e.target.value.slice(0, 60) } : y)) })} />
              <button onClick={() => setD({ ...d, medications: d.medications.filter((_, j) => j !== i) })} aria-label="Remove" className="grid h-11 w-11 place-items-center rounded-2xl bg-clinic-100 text-ink-muted"><Icon name="trash" size={16} /></button>
            </div>
          ))}
          <Btn tone="soft" size="sm" icon="plus" onClick={() => setD({ ...d, medications: [...d.medications, { name: '', dose: '' }] })}>Add medication</Btn>
        </div>
        <Field label="Emergency notes"><textarea className={cx(inputCls, 'h-20 py-2.5')} maxLength={500} value={d.emergencyNotes ?? ''} onChange={(e) => setD({ ...d, emergencyNotes: e.target.value || null })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Emergency contact"><input className={inputCls} value={d.emergencyContact?.name ?? ''} placeholder="Name" onChange={(e) => setD({ ...d, emergencyContact: { relationship: '', phone: '', ...d.emergencyContact, name: e.target.value.slice(0, 60) } })} /></Field>
          <Field label="Relationship"><input className={inputCls} value={d.emergencyContact?.relationship ?? ''} onChange={(e) => setD({ ...d, emergencyContact: { name: '', phone: '', ...d.emergencyContact, relationship: e.target.value.slice(0, 30) } })} /></Field>
          <Field label="Phone"><input className={inputCls} type="tel" value={d.emergencyContact?.phone ?? ''} onChange={(e) => setD({ ...d, emergencyContact: { name: '', relationship: '', ...d.emergencyContact, phone: e.target.value.slice(0, 20) } })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Doctor"><input className={inputCls} value={d.doctor?.name ?? ''} onChange={(e) => setD({ ...d, doctor: { phone: '', clinic: '', ...d.doctor, name: e.target.value.slice(0, 60) } })} /></Field>
          <Field label="Clinic"><input className={inputCls} value={d.doctor?.clinic ?? ''} onChange={(e) => setD({ ...d, doctor: { name: '', phone: '', ...d.doctor, clinic: e.target.value.slice(0, 60) } })} /></Field>
          <Field label="Phone"><input className={inputCls} type="tel" value={d.doctor?.phone ?? ''} onChange={(e) => setD({ ...d, doctor: { name: '', clinic: '', ...d.doctor, phone: e.target.value.slice(0, 20) } })} /></Field>
        </div>
        <Field label="Organ donor"><select className={inputCls} value={d.organDonor == null ? '' : d.organDonor ? 'y' : 'n'} onChange={(e) => setD({ ...d, organDonor: e.target.value === '' ? null : e.target.value === 'y' })}><option value="">Prefer not to say</option><option value="y">Yes</option><option value="n">No</option></select></Field>
        <Btn className="w-full" size="lg" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Health Vault'}</Btn>
        <p className="text-center text-[11.5px] text-ink-faint">Stored in your private LifeLine Hub database. Only you can read it; responders see only what a link you create allows.</p>
      </div>
    </BottomSheet>
  );
}
