'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Keyboard, Printer, Search, Sun, Ruler, Hand } from 'lucide-react';
import { LiveScanner } from './LiveScanner';
import { ProductResult } from './ProductResult';
import { PRODUCTS, Product, findProductByBarcode, normalizeBarcode } from '@/lib/products';
import { useShop } from '@/lib/store';
import { ProductArt } from '@/components/art/ProductArt';
import { playScanBeep, playSuccessChime, playWarningBuzz } from '@/lib/sound';

export function ScannerView() {
  const router = useRouter();
  const markScanned = useShop((s) => s.markScanned);
  const setHandoff = useShop((s) => s.setHandoff);

  const [result, setResult] = useState<Product | null>(null);
  const resultRef = useRef<Product | null>(null);
  const [resumeSignal, setResumeSignal] = useState(0);
  const [unknown, setUnknown] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const lastUnknown = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  // After “Scan Another”, ignore the product that is probably still in front of the camera for a moment.
  const cooldown = useRef<{ id: string; until: number }>({ id: '', until: 0 });
  const [scanCount, setScanCount] = useState(0);
  const resultPanelRef = useRef<HTMLDivElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const showProduct = useCallback(
    (product: Product) => {
      resultRef.current = product;
      setResult(product);
      setScanCount((n) => n + 1);
      setUnknown(null);
      markScanned(product.id);
      playScanBeep();
      setTimeout(playSuccessChime, 120);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(60);
      // On phones the result sits below the camera — bring it into view.
      setTimeout(() => {
        if (window.innerWidth < 1024) resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    },
    [markScanned]
  );

  const handleCode = useCallback(
    (raw: string) => {
      if (resultRef.current) return false;
      const product = findProductByBarcode(raw);
      if (product) {
        if (product.id === cooldown.current.id && Date.now() < cooldown.current.until) return false;
        showProduct(product);
        return true;
      }
      const code = normalizeBarcode(raw);
      const now = Date.now();
      if (code !== lastUnknown.current.code || now - lastUnknown.current.at > 3000) {
        lastUnknown.current = { code, at: now };
        setUnknown(code);
        playWarningBuzz();
      }
      return false;
    },
    [showProduct]
  );

  useEffect(() => {
    if (!unknown) return;
    const t = setTimeout(() => setUnknown(null), 4000);
    return () => clearTimeout(t);
  }, [unknown]);

  const scanAnother = () => {
    if (resultRef.current) cooldown.current = { id: resultRef.current.id, until: Date.now() + 2500 };
    resultRef.current = null;
    setResult(null);
    setResumeSignal((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const arrange = () => {
    if (!result) return;
    setHandoff(result.id);
    router.push('/warehouse');
  };

  const openManual = () => {
    setManualOpen(true);
    setTimeout(() => manualInputRef.current?.focus(), 50);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const product = findProductByBarcode(manualCode);
    if (product) {
      showProduct(product);
      setManualCode('');
    } else {
      setUnknown(normalizeBarcode(manualCode) || manualCode);
      playWarningBuzz();
    }
  };

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display-xl text-4xl sm:text-5xl">Scan a Product</h1>
          <p className="mt-2 text-lg text-ink-soft">Point your camera at the barcode.</p>
        </div>
        <Link href="/demo" className="btn btn-secondary btn-sm self-start sm:self-auto">
          <Printer className="h-4 w-4" /> Print demo barcodes
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div>
          <LiveScanner onCode={handleCode} onManualEntry={openManual} resumeSignal={resumeSignal} />

          <AnimatePresence>
            {unknown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 flex items-start gap-3 rounded-2xl bg-mango-50 p-4 text-sm ring-1 ring-mango-200"
                role="status"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-mango-600" />
                <p className="text-ink-soft">
                  Barcode <span className="font-mono font-bold text-ink">{unknown}</span> isn’t in your stock list. Try one of the printed demo
                  barcodes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-inset ring-cream-300">
            {!manualOpen ? (
              <button onClick={openManual} className="btn btn-ghost btn-sm w-full" data-testid="open-manual">
                <Keyboard className="h-4 w-4" /> Enter Barcode Manually
              </button>
            ) : (
              <form onSubmit={submitManual} className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="manual-code" className="sr-only">
                  Barcode number
                </label>
                <input
                  id="manual-code"
                  ref={manualInputRef}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 890000000001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 rounded-full bg-cream-100 px-5 py-3 font-mono text-base text-ink outline-none ring-1 ring-inset ring-cream-300 focus:ring-2 focus:ring-leaf-400"
                />
                <button type="submit" className="btn btn-primary btn-md">
                  <Search className="h-4 w-4" /> Find product
                </button>
              </form>
            )}
          </div>
        </div>

        <div ref={resultPanelRef} className="scroll-mt-24">
          <AnimatePresence mode="wait">
            {result ? (
              <ProductResult key={`${result.id}-${scanCount}`} product={result} onArrange={arrange} onScanAnother={scanAnother} />
            ) : (
              <motion.aside key="tips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-6">
                <h2 className="font-display text-2xl font-semibold">Scanning tips</h2>
                <ul className="mt-4 space-y-3 text-[15px] text-ink-soft">
                  <li className="flex gap-3">
                    <Ruler className="mt-0.5 h-5 w-5 flex-none text-leaf-600" /> Hold the barcode 15–25 cm from the camera, flat and level.
                  </li>
                  <li className="flex gap-3">
                    <Sun className="mt-0.5 h-5 w-5 flex-none text-mango-500" /> Good light helps. Avoid glare on shiny packets.
                  </li>
                  <li className="flex gap-3">
                    <Hand className="mt-0.5 h-5 w-5 flex-none text-soil-500" /> Keep still for a moment — it’s found in under a second.
                  </li>
                </ul>

                <div className="mt-6 border-t border-cream-300 pt-5">
                  <p className="text-sm font-bold text-ink">No printout nearby?</p>
                  <p className="text-sm text-ink-muted">Tap a product to try the flow without the camera.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {PRODUCTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => showProduct(p)}
                        className="group flex flex-col items-center rounded-2xl bg-cream-100 p-2 text-xs font-bold text-ink-soft transition hover:-translate-y-0.5 hover:bg-cream-200"
                        data-testid={`quick-${p.id}`}
                      >
                        <ProductArt id={p.id} className="h-12 w-12 transition-transform group-hover:scale-105" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
