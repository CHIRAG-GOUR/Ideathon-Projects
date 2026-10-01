import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { main } from '@/simulation/controller';
import { useSim } from '@/simulation/useSim';
import { ProductView } from '@/three/ProductView';
import type { PartId } from '@/three/CylinderDock';
import { PARTS } from '@/safety/parts';
import { SAFETY_TEXT, safetyTone } from '@/safety/labels';
import { HowItWorks } from '@/components/HowItWorks';
import { Btn, Card, PageHeader, Status, cx } from '@/components/ui';
import { go } from '@/hooks/useRoute';

export default function SmartDock() {
  const s = useSim(main, 6);
  // ?shot=1&explode=x renders a clean still (used to generate the concept images in public/img).
  const shot = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const still = shot.get('shot') === '1';
  const [sel, setSel] = useState<PartId | null>(still ? null : 'gas');
  const [explode, setExplode] = useState(still ? Number(shot.get('explode') ?? 0) : 0.6);
  const part = PARTS.find((p) => p.id === sel);
  return (
    <div className="space-y-4">
      <PageHeader title="Smart Dock · 3D product view" sub="Click a component to inspect it. Concept / prototype — no certified sensor accuracy is claimed." right={<Status tone={safetyTone(s.safety)}>LIVE LED · {SAFETY_TEXT[s.safety]}</Status>} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 overflow-hidden rounded-xl2 shadow-card ring-1 ring-line">
          <ProductView still={still} sim={main} explode={explode} selected={sel} onSelect={setSel} className="h-[46vh] min-h-[320px] w-full xl:h-[540px]" />
          <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
            <label htmlFor="explode" className="text-[13px] font-bold text-graphite-soft">Exploded view</label>
            <input id="explode" type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(+e.target.value)} className="w-48 accent-lpg-600" />
            <span className="ml-auto text-[12px] text-graphite-muted">Drag to orbit · scroll/pinch to zoom</span>
          </div>
        </div>
        <aside className="space-y-3">
          <AnimatePresence mode="wait">
            {part && (
              <motion.div key={part.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="ring-2 !ring-lpg-200">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-lpg-600">Component</p>
                  <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-graphite">{part.name}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-graphite-soft">“{part.text}”</p>
                  <p className="mt-3 rounded-lg bg-cream-100 px-3 py-2 font-mono text-[12px] text-graphite-soft ring-1 ring-line">{part.spec}</p>
                  <p className="mt-2 font-mono text-[10px] font-bold tracking-wider text-graphite-faint">CONCEPT / PROTOTYPE</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          <Card title="Components">
            <ul className="grid gap-1">
              {PARTS.map((p) => (
                <li key={p.id}>
                  <button onClick={() => setSel(p.id)} aria-pressed={sel === p.id} className={cx('w-full rounded-lg px-3 py-2 text-left text-[14px] font-bold', sel === p.id ? 'bg-lpg-600 text-white' : 'text-graphite-soft hover:bg-cream-100')}>{p.name}</button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
      <Card title="How the dock works · follows the live simulation" action={<Btn size="sm" onClick={() => (main.restart('with', 'scripted', true), go('simulation'))}>Run it live</Btn>}>
        <HowItWorks s={s} />
      </Card>
      <Card title="From prototype to hardware">
        <div className="grid gap-3 text-[14px] text-graphite-soft md:grid-cols-3">
          <p><b className="text-graphite">Today:</b> every reading comes from the simulation engine through a <code className="font-mono text-[12px]">SimulationTelemetryProvider</code>. The shutoff, alarm and sensors are simulated.</p>
          <p><b className="text-graphite">Next:</b> a <code className="font-mono text-[12px]">FutureHardwareTelemetryProvider</code> feeds real dock readings into the same UI and the same safety engine — the screens do not change.</p>
          <p><b className="text-graphite">Before any real use:</b> certified gas sensors, a tested shutoff, and safety certification would be required. This app does not provide them.</p>
        </div>
      </Card>
    </div>
  );
}
