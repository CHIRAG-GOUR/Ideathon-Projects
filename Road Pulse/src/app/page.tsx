'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Camera, Car, EyeOff, MapPinned, Radar, Route, ShieldCheck } from 'lucide-react';
import { PhoneSim, VehicleSim } from '@/features/home/Sims';

const rise = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } as const;

export default function Home() {
  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="page relative grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">RoadPulse</p>
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="display mt-3 text-[2.6rem] leading-[1.03] min-[400px]:text-5xl sm:text-6xl">
              See a pothole?
              <br />
              <span className="text-pothole-500">Turn it into a road report.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-5 max-w-xl text-lg leading-relaxed text-graphite-soft">
              RoadPulse combines vehicle-mounted computer vision detection with citizen reporting to help identify, locate and track road hazards.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/report" className="btn btn-danger btn-lg" data-testid="cta-report">
                <Camera className="h-5 w-5" /> Report a Pothole
              </Link>
              <a href="/live" className="btn btn-secondary btn-lg" data-testid="cta-live">
                <Radar className="h-5 w-5" /> See Live Detection
              </a>
            </motion.div>
            <p className="mt-5 text-sm font-semibold text-graphite-muted">Detect the road · Locate the problem · Report it · Track the response</p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <VehicleSim />
          </motion.div>
        </div>
      </section>

      {/* Two ways */}
      <section className="page grid gap-4 pb-14 md:grid-cols-2">
        {[
          { icon: Car, title: 'Drive & Detect', text: 'Vehicle-mounted cameras continuously detect potholes while you drive.', cta: 'Explore Live Detection', href: '/live', hard: true, tint: 'bg-road-50 text-road-600' },
          { icon: Camera, title: 'Capture & Report', text: 'See a pothole? Take a photo, confirm its location and send a verified report.', cta: 'Report a Pothole', href: '/report', hard: false, tint: 'bg-pothole-50 text-pothole-500' },
        ].map((c, i) => (
          <motion.div key={c.title} {...rise} transition={{ ...rise.transition, delay: i * 0.08 }} className="card p-6 sm:p-8" data-testid="feature-card">
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${c.tint}`}>
              <c.icon className="h-7 w-7" />
            </span>
            <p className="mt-4 font-display text-2xl font-bold">{c.title}</p>
            <p className="mt-1 text-graphite-soft">{c.text}</p>
            {c.hard ? (
              <a href={c.href} className="btn btn-secondary mt-5">
                {c.cta} <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link href={c.href} className="btn btn-secondary mt-5">
                {c.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-white/70 py-14">
        <div className="page grid items-center gap-8 lg:grid-cols-2">
          <motion.div {...rise}>
            <p className="eyebrow">How a citizen report works</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">About 30 seconds, start to finish.</h2>
            <ol className="mt-5 space-y-3 text-graphite-soft">
              {['Open Report and take a photo', 'Sensor verifies the photo on your phone and marks the pothole', 'You confirm it and add your location', 'Check the pin on the map — drag it if GPS is a few metres off', 'Submit — it’s routed to the right authority where that’s connected'].map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="num flex h-7 w-7 flex-none items-center justify-center rounded-full bg-graphite text-sm font-bold text-white">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </motion.div>
          <motion.div {...rise}>
            <PhoneSim />
          </motion.div>
        </div>
      </section>

      {/* Honesty + privacy */}
      <section className="page grid gap-4 py-14 md:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Real statuses only', text: '“Submitted” appears only when the authority’s own system accepts a report. Otherwise we say exactly what happened.' },
          { icon: EyeOff, title: 'Private by default', text: 'Photos upload only when you submit and are visible only to you and road authorities. Location is asked for, never taken silently.' },
          { icon: Route, title: 'On-device Processing', text: 'Detection runs on your phone or the vehicle’s edge device. Video never streams to the cloud — only confirmed pothole events.' },
        ].map((c, i) => (
          <motion.div key={c.title} {...rise} transition={{ ...rise.transition, delay: i * 0.08 }} className="card p-6">
            <c.icon className="h-7 w-7 text-road-500" />
            <p className="mt-3 text-lg font-bold">{c.title}</p>
            <p className="mt-1 text-sm text-graphite-soft">{c.text}</p>
          </motion.div>
        ))}
      </section>

      <section className="page pb-16">
        <motion.div {...rise} className="rounded-4xl bg-white p-8 text-center shadow-soft ring-1 ring-paper-200 sm:p-12">
          <MapPinned className="mx-auto h-10 w-10 text-pothole-500" />
          <h2 className="display mt-3 text-3xl sm:text-4xl">Detect the road. Locate the problem.</h2>
          <p className="mt-2 text-graphite-soft">Report it. Track the response.</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/report" className="btn btn-danger btn-lg">
              <Camera className="h-5 w-5" /> Report a Pothole
            </Link>
            <Link href="/map" className="btn btn-secondary btn-lg">
              <MapPinned className="h-5 w-5" /> Open the Map
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
