'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { DISCLAIMER, PLAYBOOKS, type Action, type Step } from '@/content';
import { Header, Page, useApp } from '@/ctx';
import { Btn, Card, Tag, cx } from '@/ui/kit';
import { SituationArt } from '@/ui/art';
import { Icon, type IconName } from '@/ui/icons';
import { HoldBar } from '@/parts/HoldBar';

const KIND: Record<Step['kind'], { tag: string; tone: 'indigo' | 'teal' | 'sos'; ring: string }> = {
  info: { tag: 'Good to know', tone: 'indigo', ring: 'border-indigo-100' },
  do: { tag: 'You do this', tone: 'teal', ring: 'border-teal-100' },
  action: { tag: 'Emergency action', tone: 'sos', ring: 'border-sos-100' },
};

export function PlaybookView() {
  const { nav } = useApp();
  const p = PLAYBOOKS.find((x) => x.id === nav.arg) ?? PLAYBOOKS[0];
  const [done, setDone] = useState<number[]>([]);
  const toggle = (i: number) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  return (
    <>
      <Header title={p.title} sub={p.short} back />
      <Page>
        <Card className="flex flex-wrap items-center gap-4">
          <SituationArt id={p.id} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {(['action', 'do', 'info'] as const).map((k) => <Tag key={k} tone={KIND[k].tone}>{KIND[k].tag}</Tag>)}
            </div>
            <p className="mt-2 text-sm text-ink-muted">Red steps perform a real action when you use them. Tick steps as you go.</p>
          </div>
          <div className="w-full sm:w-48">
            <div className="flex justify-between text-xs font-semibold text-ink-muted"><span>Progress</span><span>{done.length}/{p.steps.length}</span></div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-cream-100"><motion.div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" animate={{ width: `${(done.length / p.steps.length) * 100}%` }} /></div>
          </div>
        </Card>
        <ol className="space-y-3">
          {p.steps.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}>
              <div className={cx('flex gap-3 rounded-3xl border-2 bg-white p-4 shadow-tile transition-opacity', KIND[s.kind].ring, done.includes(i) && 'opacity-60')}>
                <button onClick={() => toggle(i)} role="checkbox" aria-checked={done.includes(i)} aria-label={`Step ${i + 1} done`} className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 font-display font-bold', done.includes(i) ? 'border-emerald-600 bg-emerald-500 text-white' : 'border-indigo-100 text-indigo-700')}>
                  {done.includes(i) ? <Icon name="check" size={18} /> : i + 1}
                </button>
                <div className="min-w-0 flex-1">
                  <Tag tone={KIND[s.kind].tone}>{KIND[s.kind].tag}</Tag>
                  <p className="mt-1.5 font-display text-[16px] font-bold text-indigo-800">{s.title}</p>
                  {s.text && <p className="mt-0.5 text-sm text-ink-soft">{s.text}</p>}
                  {s.action && <div className="mt-3 max-w-sm"><ActionButton a={s.action} /></div>}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
        <p className="text-xs text-ink-muted">{DISCLAIMER}</p>
      </Page>
    </>
  );
}

export function ActionButton({ a }: { a: Action }) {
  const { run, lineNumber, contacts } = useApp();
  const primary = contacts.find((c) => c.role === 'primary' && c.phone) ?? contacts.find((c) => c.phone);
  if (a.kind === 'sos') return <HoldBar label="Start SOS" onComplete={() => run(a)} />;
  if (a.kind === 'silent') return <HoldBar label="Silent SOS" tone="indigo" onComplete={() => run(a)} />;
  const [label, icon]: [string, IconName] =
    a.kind === 'call' ? [`Call ${lineNumber(a.line).number} · ${lineNumber(a.line).label}`, 'phone'] : a.kind === 'callTrusted' ? [primary ? `Call ${primary.name}` : 'Add a trusted contact', 'people'] : a.kind === 'share' ? [primary ? `Share location with ${primary.name.split(' ')[0]}` : 'Add a trusted contact', 'share'] : ['Find nearby help', 'pin'];
  return <Btn tone={a.kind === 'call' ? 'sos' : 'indigo'} className="w-full justify-start" onClick={() => run(a)}><Icon name={icon} size={18} />{label}</Btn>;
}
