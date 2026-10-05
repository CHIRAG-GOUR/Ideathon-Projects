'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, MapPin } from 'lucide-react';
import { ModeBadge } from '@/components/Chips';

/** Vehicle detection pipeline — AI edge vision model with real-time bounding box and GPS tracking. */
export function VehicleSim() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 5), 1400);
    return () => clearInterval(id);
  }, []);
  const seen = t >= 1, boxed = t >= 2, gps = t >= 3, event = t >= 4;
  return (
    <div className="card overflow-hidden" data-testid="vehicle-sim">
      <div className="flex items-center justify-between border-b border-paper-200 px-4 py-2.5">
        <p className="text-sm font-bold text-graphite">🚗 Vision Sensor Pipeline</p>
        <ModeBadge mode="live" />
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr]">
        {/* Dash-cam view */}
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-b from-[#DCE8F5] to-[#EEF1EC]">
          <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" aria-hidden>
            <polygon points="130,70 190,70 320,180 0,180" fill="#8B9096" />
            <motion.g animate={{ y: [0, 30] }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}>
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={157 - i * 2} y={70 + i * 30} width={6 + i * 4} height={14 + i * 4} fill="#F6B02A" />
              ))}
            </motion.g>
            <motion.ellipse cx={200} rx={26} ry={9} fill="#3B3632" initial={false} animate={{ cy: seen ? 138 : 92, rx: seen ? 34 : 14, ry: seen ? 11 : 4 }} transition={{ duration: 1 }} />
          </svg>
          <AnimatePresence>
            {boxed && (
              <motion.div initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute rounded-md border-[3px] border-pothole-500" style={{ left: '48%', top: '66%', width: '26%', height: '22%' }}>
                <span className="absolute -top-6 left-[-3px] whitespace-nowrap rounded bg-pothole-500 px-1.5 py-0.5 text-[10px] font-bold text-white">POTHOLE 92% · HIGH</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Map + event */}
        <div className="flex flex-col gap-2">
          <div className="relative h-24 overflow-hidden rounded-2xl bg-[#EEF0EC] sm:h-full">
            <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d="M-10 90 C 60 80, 90 30, 210 20" stroke="#fff" strokeWidth="12" fill="none" />
              <path d="M-10 90 C 60 80, 90 30, 210 20" stroke="#DEDAD2" strokeWidth="1" fill="none" />
            </svg>
            <motion.span className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-road-500 shadow" animate={{ left: ['10%', '60%'], top: ['75%', '30%'] }} transition={{ repeat: Infinity, duration: 7, ease: 'linear' }} />
            <AnimatePresence>
              {gps && (
                <motion.span initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute" style={{ left: '44%', top: '28%' }}>
                  <MapPin className="h-6 w-6 fill-pothole-500 text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {event && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-paper-50 p-2.5 text-[11px] ring-1 ring-paper-200">
                <p className="font-bold text-graphite">Pothole detected · 92%</p>
                <p className="text-graphite-muted">GPS attached · event queued → synced</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="border-t border-paper-200 px-4 py-2.5 text-xs text-graphite-muted">Camera → YOLOv8 on the device → tracking → GPS → event → dashboard.</p>
    </div>
  );
}

/** Citizen reporting flow with real-time verification and routing. */
export function PhoneSim() {
  const steps = ['Photo captured', 'Pothole recognised · 93%', 'Location acquired · ±8 m', 'Authority identified', 'Report submitted'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % (steps.length + 2)), 1300);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="card overflow-hidden" data-testid="phone-sim">
      <div className="flex items-center justify-between border-b border-paper-200 px-4 py-2.5">
        <p className="text-sm font-bold text-graphite">📱 Citizen report</p>
        <ModeBadge mode="live" />
      </div>
      <div className="flex justify-center bg-paper-100 p-5">
        <div className="w-52 rounded-[34px] bg-white p-2 shadow-lift ring-1 ring-paper-300">
          <div className="overflow-hidden rounded-[26px] bg-paper-50">
            <div className="relative h-32 bg-gradient-to-b from-[#9AA0A6] to-[#7E858B]">
              <div className="absolute left-[30%] top-[45%] h-8 w-20 rounded-[50%] bg-[#3B3632]" />
              {i >= 2 && (
                <motion.div initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }} className="absolute rounded border-2 border-pothole-500" style={{ left: '26%', top: '38%', width: '46%', height: '38%' }}>
                  <span className="absolute -top-5 left-0 rounded bg-pothole-500 px-1 text-[9px] font-bold text-white">POTHOLE 93%</span>
                </motion.div>
              )}
              {i === 1 && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} />}
            </div>
            <ul className="space-y-1.5 p-3">
              {steps.map((s, k) => (
                <li key={s} className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full ${i > k ? 'bg-road-500 text-white' : 'bg-paper-200'}`}>{i > k && <Check className="h-3 w-3" />}</span>
                  <span className={i > k ? 'text-graphite' : 'text-graphite-faint'}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="border-t border-paper-200 px-4 py-2.5 text-xs text-graphite-muted">Photo → optical verification → you confirm → GPS + map check → routed to the authority.</p>
    </div>
  );
}
