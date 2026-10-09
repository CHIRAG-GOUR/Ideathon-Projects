'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { HeroVisual } from '@/features/landing/HeroVisual';
import { HoldButton } from '@/components/HoldButton';
import { E3d, Logo, cn } from '@/components/ui';

const up = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.5 } };

const FEATURES = [
  { icon: 'siren', title: 'SOS', text: 'Hold for 3 seconds. A tap never triggers it.' },
  { icon: 'pin', title: 'Live Location', text: 'Keep trusted people updated while the SOS is active.' },
  { icon: 'family', title: 'Safety Circle', text: 'Choose who gets alerted — primary, secondary, backup.' },
  { icon: 'woman-walking', title: 'Safe Trip', text: 'Share your journey. Get asked if you don’t arrive.' },
  { icon: 'wave', title: 'Check In', text: 'Let people know you’re okay, with your location.' },
  { icon: 'police', title: 'Nearby Help', text: 'Police, hospitals and pharmacies from OpenStreetMap.' },
];

const STEPS = [
  { n: '1', title: 'Hold SOS for 3 seconds', text: 'The ring fills as you hold. Let go early and nothing is sent.' },
  { n: '2', title: 'Your phone acts immediately', text: 'Siren, vibration and GPS start on the device — no waiting for the internet.' },
  { n: '3', title: 'Your circle is alerted', text: 'An SMS with your location goes from your own number; verified contacts get a live-location link.' },
  { n: '4', title: 'They respond', text: '“Mom is responding.” You see who’s coming, and can message them.' },
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden bg-paper">
      <nav className="page flex h-20 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 text-sm font-bold">
          <Link href="/privacy" className="hidden rounded-full px-4 py-2 text-ink-soft hover:bg-blush-100 sm:inline">Privacy</Link>
          <Link href="/dashboard" className="rounded-full px-4 py-2 text-ink-soft hover:bg-blush-100">Dashboard</Link>
          <a href="/download/Shevolution.apk" className="rounded-full bg-sos-500 px-4 py-2 text-white shadow-glow">Get the app</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="page grid items-center gap-8 pb-16 pt-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full bg-sos-50 px-3 py-1.5 text-xs font-extrabold text-sos-700">
            <E3d name="heart" size={18} /> Women&apos;s safety companion
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Safety should be <span className="relative whitespace-nowrap text-sos-500">one hold<motion.svg viewBox="0 0 200 12" className="absolute -bottom-2 left-0 w-full" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}><motion.path d="M2 8 Q100 0 198 8" stroke="#FF93A8" strokeWidth="5" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }} /></motion.svg></span> away.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Shevolution connects you to the people you trust, shares your location when you need help, and keeps your safety journey visible.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/download/Shevolution.apk" className="inline-flex min-h-[56px] items-center gap-2 rounded-2xl bg-sos-500 px-6 text-lg font-bold text-white shadow-glow transition hover:bg-sos-600">
              Get Shevolution
            </a>
            <a href="#how" className="inline-flex min-h-[56px] items-center rounded-2xl border border-line bg-white px-6 text-lg font-bold text-ink shadow-soft">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-muted">Android app · web dashboard for your Safety Circle</p>
        </motion.div>
        <HeroVisual />
      </header>

      {/* How SOS works */}
      <section id="how" className="bg-white py-20">
        <div className="page grid items-center gap-12 lg:grid-cols-2">
          <motion.div {...up}>
            <p className="h-eyebrow">How SOS works</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight">One hold. Your people know.</h2>
            <ol className="mt-8 space-y-5">
              {STEPS.map((s, i) => (
                <motion.li key={s.n} {...up} transition={{ delay: i * 0.08 }} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sos-500 font-extrabold text-white">{s.n}</span>
                  <div>
                    <p className="font-extrabold">{s.title}</p>
                    <p className="text-ink-soft">{s.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </motion.div>
          <DemoSos />
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="page">
          <motion.div {...up} className="max-w-2xl">
            <p className="h-eyebrow">Everything in one calm place</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight">Calm every day. Clear in an emergency.</h2>
          </motion.div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} {...up} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }} className="rounded-4xl border border-line bg-white p-6 shadow-soft">
                <E3d name={f.icon} size={56} />
                <h3 className="mt-4 text-xl font-extrabold">{f.title}</h3>
                <p className="mt-1 text-ink-soft">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live location + circle */}
      <section className="bg-gradient-to-b from-sos-50 to-paper py-20">
        <div className="page grid gap-6 lg:grid-cols-3">
          {[
            { icon: 'map', title: 'Live location, only when it matters', text: 'Sharing starts with an SOS or Safe Trip and stops the moment it ends. Contacts see a map, the movement trail, accuracy and “updated 3 seconds ago”.' },
            { icon: 'lock', title: 'Verified contacts only', text: 'A contact must prove their phone number or email before they can ever open your live location. Links are random, expire, and never contain your data.' },
            { icon: 'chat', title: 'Offline emergency actions', text: 'Offline emergency actions available: siren, vibration, GPS, SMS from your own number and calling 112. Everything else syncs when the network returns.' },
          ].map((c, i) => (
            <motion.div key={c.title} {...up} transition={{ delay: i * 0.08 }} className="rounded-4xl bg-white p-6 shadow-soft">
              <E3d name={c.icon} size={52} />
              <h3 className="mt-4 text-xl font-extrabold">{c.title}</h3>
              <p className="mt-2 text-ink-soft">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Emergency services */}
      <section className="py-20">
        <div className="page">
          <motion.div {...up} className="grid items-center gap-8 rounded-[2.5rem] bg-ink p-8 text-white sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sos-300">Emergency services</p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">112 is always one tap away.</h2>
              <p className="mt-3 max-w-2xl text-white/75">
                In India, 112 (ERSS) reaches police, fire and ambulance by voice, SMS and the official 112 India app. Shevolution opens the call for you — it does not have its own
                link to the police control room, and it never says the police were notified unless an official system confirms it.
              </p>
            </div>
            <a href="tel:112" className="inline-flex min-h-[64px] items-center justify-center rounded-3xl bg-sos-500 px-10 text-2xl font-extrabold shadow-glow">Call 112</a>
          </motion.div>
        </div>
      </section>

      {/* Download */}
      <section className="pb-24">
        <div className="page">
          <motion.div {...up} className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sos-500 to-sos-700 p-8 text-white shadow-glow sm:p-14">
            <motion.div className="absolute -right-6 -top-6" animate={{ rotate: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity }}>
              <E3d name="heart-hands" size={180} className="opacity-90" />
            </motion.div>
            <h2 className="max-w-lg text-4xl font-extrabold leading-tight">You&apos;re not alone. Get Shevolution.</h2>
            <p className="mt-3 max-w-lg text-white/85">Install the Android app, add your Safety Circle, and keep SOS one hold away.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/download/Shevolution.apk" className="inline-flex min-h-[56px] items-center rounded-2xl bg-white px-6 text-lg font-bold text-sos-700">Download for Android</a>
              <Link href="/dashboard" className="inline-flex min-h-[56px] items-center rounded-2xl border border-white/40 px-6 text-lg font-bold">Open dashboard</Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="page flex flex-wrap items-center justify-between gap-4 text-sm text-ink-muted">
          <Logo size={26} />
          <div className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/app">App preview</Link>
            <span>3D emoji © Microsoft (MIT) · Maps © OpenStreetMap</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Interactive, clearly labelled demonstration — nothing is sent. */
function DemoSos() {
  const [phase, setPhase] = useState<'idle' | 'cancelled' | 'active'>('idle');
  const [alerted, setAlerted] = useState(0);
  return (
    <motion.div {...up} className="relative rounded-[2.5rem] border border-line bg-paper p-8 text-center shadow-soft">
      <span className="absolute left-5 top-5 rounded-full bg-plum px-3 py-1 text-[11px] font-extrabold tracking-wider text-white">DEMO</span>
      <AnimatePresence mode="wait">
        {phase === 'active' ? (
          <motion.div key="a" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4">
            <p className="text-4xl font-extrabold text-sos-600">🚨 SOS ACTIVE</p>
            <p className="mt-1 text-sm font-bold text-plum">DEMONSTRATION ONLY</p>
            <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
              {['Location', 'Mom', 'Brother', 'Live location'].map((r, i) => (
                <div key={r} className="flex justify-between rounded-2xl bg-white px-4 py-2.5 shadow-soft">
                  <span className="font-semibold">{r}</span>
                  <span className={cn('text-xs font-extrabold', i < alerted ? 'text-safe-600' : 'text-ink-muted')}>{i < alerted ? (i === 0 ? '✓ LOCKED' : i === 3 ? '✓ SHARING' : '✓ ALERTED') : '… '}</span>
                </div>
              ))}
            </div>
            <button className="mt-6 text-sm font-bold text-ink-soft" onClick={() => (setPhase('idle'), setAlerted(0))}>
              Reset demo
            </button>
          </motion.div>
        ) : (
          <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <p className="mb-4 font-bold text-ink-soft">Try it: press and hold</p>
            <HoldButton
              size={230}
              onPress={() => setPhase('idle')}
              onCancel={() => setPhase('cancelled')}
              onComplete={() => {
                setPhase('active');
                [0, 1, 2, 3].forEach((i) => setTimeout(() => setAlerted(i + 1), 400 + i * 450));
              }}
            />
            <p className="mt-3 h-6 text-sm font-bold text-ink-muted">{phase === 'cancelled' ? 'SOS cancelled — released too early' : 'Release before 3 seconds to cancel'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
