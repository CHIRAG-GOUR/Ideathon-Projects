'use client';
import { motion } from 'framer-motion';
import { PLAYBOOKS, TOOLKIT } from '@/content';
import { Header, Page, useApp } from '@/ctx';
import { Card, Kicker, Tag, cx } from '@/ui/kit';
import { Logo, SituationArt, SosBadge, ToolArt } from '@/ui/art';
import { Icon } from '@/ui/icons';
import { Checklist } from '@/parts/Checklist';
import { QuickRow } from '@/parts/QuickRow';

export function Home() {
  const { profile, user, nav, startSos, lineNumber, contacts, run } = useApp();
  const name = (profile?.name || user?.displayName || '').split(' ')[0];
  return (
    <>
      <Header title="Your Safety Toolkit" sub={name ? `Hi ${name} — prepared, not scared.` : 'Prepared, not scared.'} right={<span className="lg:hidden"><Logo word={false} /></span>} />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-indigo-700 p-5 text-white shadow-tile">
            <svg className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-20" viewBox="0 0 64 64" aria-hidden><path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill="none" stroke="#FF9F5A" strokeWidth="3" /></svg>
            <div className="flex items-center gap-4">
              <SosBadge size={150} onComplete={() => startSos('sos')} />
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">In danger?</p>
                <p className="mt-1 text-sm text-indigo-100">Hold SOS for 3 seconds. {contacts.length ? `${contacts.length} trusted contact${contacts.length > 1 ? 's' : ''} get your live location.` : 'Add a trusted contact so it reaches someone.'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['emergency', 'women'] as const).map((l) => (
                    <button key={l} onClick={() => run({ kind: 'call', line: l })} className="rounded-xl bg-white/10 px-3 py-1.5 text-left hover:bg-white/20">
                      <span className="block font-display text-lg font-bold leading-none">{lineNumber(l).number}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-100">{lineNumber(l).label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => nav.go('sos')} className="mt-4 flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/15">
              <span className="flex items-center gap-2"><Icon name="eyeoff" size={18} />Silent SOS and more options</span>
              <Icon name="next" size={18} />
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <Kicker>What&apos;s happening?</Kicker>
                <h2 className="font-display text-xl font-bold text-indigo-800">Emergency playbooks</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PLAYBOOKS.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 14, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 22 }}
                  whileHover={{ y: -3, rotate: i % 2 ? 1 : -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => nav.go('playbook', p.id)}
                  className={cx('flex flex-col items-start rounded-3xl border-2 bg-white p-3.5 text-left shadow-tile', p.urgent ? 'border-sos-100' : 'border-indigo-100')}
                >
                  <SituationArt id={p.id} size={44} />
                  <span className="mt-2.5 font-display text-[14px] font-bold leading-tight text-indigo-800">{p.title}</span>
                  {p.urgent && <Tag tone="sos" className="mt-1.5">Urgent</Tag>}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Kicker className="mb-2">Quick actions</Kicker>
          <QuickRow />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Checklist compact />
          <Card>
            <div className="flex items-center justify-between">
              <Kicker>Toolkit</Kicker>
              <button onClick={() => nav.tab('toolkit')} className="text-sm font-bold text-teal-700">All →</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOOLKIT.slice(0, 6).map((t) => (
                <button key={t.id} onClick={() => nav.go('toolkit', t.id)} className="flex items-center gap-2 rounded-2xl p-2 text-left hover:bg-cream-100">
                  <ToolArt id={t.id} size={36} />
                  <span className="text-sm font-semibold leading-tight text-ink">{t.title}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </Page>
    </>
  );
}
