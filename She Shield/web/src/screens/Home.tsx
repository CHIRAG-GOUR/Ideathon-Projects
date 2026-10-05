'use client';
import { motion } from 'framer-motion';
import { checkState } from '@shared/checks';
import { dial } from '@core/native';
import { Header, Page, useApp, type Screen } from '@/ctx';
import { Card, Dot, Eyebrow, Pill, cx } from '@/ui/kit';
import { Logo, ShieldRings, SecurePin, VaultArt, CircleArt } from '@/ui/art';
import { SosControl } from '@/ui/SosControl';
import { HoldPill } from '@/ui/HoldPill';
import { Icon } from '@/ui/icons';

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function Home() {
  const { profile, user, shield, readiness, contacts, contactsLoaded, nav, startSos, region, plan } = useApp();
  const name = (profile?.name || user?.displayName || '').split(' ')[0];
  const issues = readiness.items.filter((i) => i.state !== 'ok');
  const cs = checkState(plan);

  return (
    <>
      <Header title={`${greet()}${name ? `, ${name}` : ''}`} sub={shield.on ? 'Shield Mode is protecting you' : 'Your protection is one hold away'} right={<span className="lg:hidden"><Logo word={false} /></span>} />
      <Page>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {/* Protection state */}
          <Card onClick={() => nav.go('shield')} className={cx('relative overflow-hidden !p-5', shield.on && '!border-violet-300 bg-gradient-to-br from-violet-50 to-white')}>
            <div className="flex items-center gap-4">
              <ShieldRings on={shield.on} size={104} />
              <div className="min-w-0">
                <Eyebrow>Shield Mode</Eyebrow>
                <p className="mt-1 text-xl font-extrabold text-violet-900">{shield.on ? 'Protection on' : 'Protection off'}</p>
                <p className="text-sm text-ink-muted">
                  {shield.on ? `Since ${new Date(shield.since ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · location kept ready` : 'Turn on when you want extra protection.'}
                </p>
                {cs !== 'OFF' && <Pill tone={cs === 'WAITING' ? 'mint' : 'alert'} className="mt-2">Protection check · {cs === 'WAITING' ? 'on schedule' : 'answer now'}</Pill>}
              </div>
              <Icon name="next" className="ml-auto shrink-0 text-violet-400" />
            </div>
          </Card>

          {/* SOS */}
          <Card className="flex flex-col items-center !p-5 lg:row-span-2">
            <Eyebrow className="self-start">Emergency SOS</Eyebrow>
            <div className="my-2">
              <SosControl onComplete={() => startSos('sos')} />
            </div>
            <p className="max-w-xs text-center text-sm text-ink-muted">
              {contactsLoaded && contacts.length === 0 ? 'Add a trusted contact so SOS can reach someone.' : `Alerts ${contacts.length} trusted contact${contacts.length === 1 ? '' : 's'} with your live location.`}
            </p>
            <HoldPill className="mt-4 max-w-sm" label="Discreet alert" hint="Hold 2 s · no siren, no sound — contacts are texted silently" onComplete={() => startSos('discreet')} />
            <div className="mt-4 flex w-full max-w-sm gap-2">
              {[region.primary, ...region.others.slice(0, 2)].map((l) => (
                <button key={l.number} onClick={() => dial(l.number)} className="min-w-0 flex-1 rounded-2xl bg-violet-50 px-2 py-2.5 text-center">
                  <span className="block text-lg font-extrabold text-violet-900">{l.number}</span>
                  <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-ink-muted">{l.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Readiness */}
          <Card onClick={() => nav.go('ready')} className="!p-5">
            <div className="flex items-center justify-between">
              <div>
                <Eyebrow>Emergency readiness</Eyebrow>
                <p className="mt-1 text-xl font-extrabold text-violet-900">{readiness.ready ? 'Ready' : `${issues.length} thing${issues.length === 1 ? '' : 's'} to check`}</p>
              </div>
              <Score score={readiness.score} total={readiness.total} />
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {readiness.items.map((i) => (
                <li key={i.key} className="flex items-center gap-2 text-sm font-semibold text-ink-soft"><Dot state={i.state} />{i.label.replace(' permission', '')}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['nearby', 'Nearby help', 'Police, hospitals, pharmacies', <SecurePin key="a" size={40} />],
              ['vault', 'Evidence vault', 'Private notes, photos, audio', <VaultArt key="b" size={40} />],
              ['contacts', 'Trusted contacts', `${contacts.length} added`, <CircleArt key="c" size={40} />],
              ['shield', 'Protection check', cs === 'OFF' ? 'Ask me if I’m safe' : 'Running', <span key="d" className="grid h-10 w-10 place-items-center rounded-xl bg-shield-100 text-shield-600"><Icon name="bell" /></span>],
            ] as [Screen, string, string, JSX.Element][]
          ).map(([s, t, d, art], n) => (
            <motion.button key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * n }} whileTap={{ scale: 0.97 }} onClick={() => nav.go(s)} className="rounded-xl2 border border-line bg-white p-4 text-left shadow-card">
              {art}
              <p className="mt-3 font-extrabold text-ink">{t}</p>
              <p className="text-xs font-semibold text-ink-muted">{d}</p>
            </motion.button>
          ))}
        </div>
      </Page>
    </>
  );
}

export function Score({ score, total, size = 64 }: { score: number; total: number; size?: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${score} of ${total} ready`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#ECE5F8" strokeWidth="7" />
        <motion.circle cx="32" cy="32" r={r} fill="none" stroke={score === total ? '#2FBF8F' : '#7C4DDB'} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / Math.max(1, total)) }} transition={{ duration: 0.8 }} />
      </svg>
      <span className="text-sm font-extrabold text-violet-900">{score}/{total}</span>
    </div>
  );
}
