'use client';
import { motion } from 'framer-motion';
import { DISCLAIMER, PLAYBOOKS, TOOLKIT } from '@/content';
import { Header, Page, useApp } from '@/ctx';
import { Card, Kicker, cx } from '@/ui/kit';
import { SituationArt, ToolArt } from '@/ui/art';
import { Icon } from '@/ui/icons';

export function Toolkit() {
  const { nav } = useApp();
  const tool = TOOLKIT.find((t) => t.id === nav.arg);
  return tool ? <ToolDetail id={tool.id} /> : (
    <>
      <Header title="Safety Toolkit" sub="Practical know-how, sorted by situation" />
      <Page>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLKIT.map((t, i) => (
            <motion.button key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => nav.go('toolkit', t.id)} className="flex items-center gap-4 rounded-3xl border-2 border-indigo-100 bg-white p-4 text-left shadow-tile">
              <ToolArt id={t.id} size={60} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] font-bold text-indigo-800">{t.title}</span>
                <span className="block text-sm text-ink-muted">{t.blurb}</span>
                <span className="mt-1 block text-xs font-semibold text-teal-700">{t.tips.length} tips · {t.playbooks.length} playbook{t.playbooks.length > 1 ? 's' : ''}</span>
              </span>
              <Icon name="next" className="text-ink-faint" />
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-ink-muted">{DISCLAIMER}</p>
      </Page>
    </>
  );
}

function ToolDetail({ id }: { id: string }) {
  const { nav, run, lineNumber } = useApp();
  const t = TOOLKIT.find((x) => x.id === id)!;
  return (
    <>
      <Header title={t.title} sub={t.blurb} back />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            {t.tips.map((tip, i) => (
              <motion.div key={tip.t} initial={{ opacity: 0, rotateX: -60, y: 10 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 260, damping: 22 }} style={{ transformPerspective: 600 }}>
                <Card className="flex gap-4">
                  <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-bold', i % 2 ? 'bg-tang-50 text-tang-600' : 'bg-teal-50 text-teal-700')}>{i + 1}</span>
                  <div>
                    <p className="font-display font-bold text-indigo-800">{tip.t}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{tip.d}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="space-y-4">
            <Card>
              <Kicker>Related playbooks</Kicker>
              <div className="mt-3 space-y-2">
                {t.playbooks.map((pid) => {
                  const p = PLAYBOOKS.find((x) => x.id === pid)!;
                  return (
                    <button key={pid} onClick={() => nav.go('playbook', pid)} className="flex w-full items-center gap-3 rounded-2xl border-2 border-indigo-100 p-2.5 text-left hover:border-teal-300">
                      <SituationArt id={pid} size={40} />
                      <span className="flex-1 font-semibold text-ink">{p.title}</span>
                      <Icon name="next" size={18} className="text-ink-faint" />
                    </button>
                  );
                })}
              </div>
            </Card>
            {t.lines && (
              <Card>
                <Kicker>Helplines</Kicker>
                <div className="mt-3 grid gap-2">
                  {[...new Set(t.lines.map((l) => lineNumber(l).number))].map((num) => {
                    const l = t.lines!.find((x) => lineNumber(x).number === num)!;
                    return (
                      <button key={num} onClick={() => run({ kind: 'call', line: l })} className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-2.5 text-left">
                        <Icon name="phone" size={18} className="text-indigo-600" />
                        <span className="font-display text-lg font-bold text-indigo-800">{num}</span>
                        <span className="text-sm text-ink-muted">{lineNumber(l).label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-muted">{DISCLAIMER}</p>
      </Page>
    </>
  );
}
