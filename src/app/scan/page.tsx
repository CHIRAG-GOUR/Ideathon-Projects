'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { useGroceryStore } from '@/lib/store';
import { DemoProduct } from '@/lib/products';
import { playScanBeep, playSuccessChime, playWarningBuzz } from '@/lib/sound';
import {
  ArrowLeft,
  Camera,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Barcode,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScannerPage() {
  const router = useRouter();
  const { scanProductByBarcode, setSelectedProductId, products } = useGroceryStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [cameraState, setCameraState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'DENIED' | 'UNAVAILABLE'>('IDLE');
  const [scannedProduct, setScannedProduct] = useState<DemoProduct | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Start ZXing Camera Scanner
  const startCameraScanner = async () => {
    try {
      setErrorMessage(null);
      setCameraState('SCANNING');

      // Stop previous controls if any
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }

      const codeReader = new BrowserMultiFormatReader();

      // Request camera with back/environment facing preference
      const controls = await codeReader.decodeFromVideoDevice(
        undefined, // default camera or back camera
        videoRef.current || undefined,
        (result, error) => {
          if (result) {
            const rawText = result.getText();
            handleBarcodeScanned(rawText);
          }
        }
      );

      controlsRef.current = controls;
    } catch (err: unknown) {
      console.warn('Camera error:', err);
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setCameraState('DENIED');
      } else {
        setCameraState('UNAVAILABLE');
      }
    }
  };

  useEffect(() => {
    startCameraScanner();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, []);

  const handleBarcodeScanned = (code: string) => {
    const res = scanProductByBarcode(code);

    if (res.found && res.product) {
      // Pause camera scanning
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }

      playScanBeep();
      setTimeout(() => playSuccessChime(), 100);

      setCameraState('SUCCESS');
      setScannedProduct(res.product);
      setSelectedProductId(res.product.id);
    } else {
      playWarningBuzz();
      setErrorMessage(res.error || `Barcode "${code}" is not in demo stock.`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleBarcodeScanned(manualCode.trim());
    }
  };

  const handleScanAnother = () => {
    setScannedProduct(null);
    setCameraState('SCANNING');
    startCameraScanner();
  };

  const handleArrangeProduct = () => {
    if (scannedProduct) {
      setSelectedProductId(scannedProduct.id);
      router.push('/warehouse');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl bg-white border border-cardboard-200 shadow-warm-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/barcodes"
            className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            Physical Barcodes Sheet
          </Link>
        </div>
      </div>

      {/* Main Scanner Card */}
      <div className="bg-white rounded-3xl border border-[#E8DFC9] p-5 sm:p-8 shadow-warm-md space-y-6">
        <div className="text-center max-w-md mx-auto">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-900 tracking-tight">
            Scan Your Product 📷
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Point your camera at the barcode on your demo item
          </p>
        </div>

        {/* Live Camera Viewfinder Frame */}
        <div className="relative max-w-lg mx-auto h-72 sm:h-80 rounded-3xl bg-[#1A2421] border-4 border-[#344E41] flex flex-col items-center justify-center overflow-hidden shadow-inner p-4 text-center">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover ${
              cameraState === 'SCANNING' ? 'opacity-100' : 'opacity-30'
            }`}
            autoPlay
            playsInline
            muted
          />

          {/* Corner Reticles */}
          <div
            className={`absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl transition-colors ${
              cameraState === 'SUCCESS' ? 'border-emerald-400' : 'border-emerald-400/80'
            }`}
          />
          <div
            className={`absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl transition-colors ${
              cameraState === 'SUCCESS' ? 'border-emerald-400' : 'border-emerald-400/80'
            }`}
          />
          <div
            className={`absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl transition-colors ${
              cameraState === 'SUCCESS' ? 'border-emerald-400' : 'border-emerald-400/80'
            }`}
          />
          <div
            className={`absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 rounded-br-xl transition-colors ${
              cameraState === 'SUCCESS' ? 'border-emerald-400' : 'border-emerald-400/80'
            }`}
          />

          {/* Animated Laser Scanning Line */}
          {cameraState === 'SCANNING' && (
            <div className="absolute left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-tomato-500 to-transparent shadow-[0_0_12px_#E63946] animate-laser z-20 pointer-events-none" />
          )}

          {/* Center Target Box Prompt */}
          {cameraState === 'SCANNING' && (
            <div className="relative z-10 bg-black/40 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/20 text-white text-xs font-mono">
              Align barcode inside the box
            </div>
          )}

          {/* Permission Denied / Camera Unavailable State */}
          {(cameraState === 'DENIED' || cameraState === 'UNAVAILABLE') && (
            <div className="relative z-10 bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-cardboard-200 max-w-xs shadow-lg space-y-3">
              <Camera className="w-8 h-8 mx-auto text-cardboard-600" />
              <p className="text-xs font-bold text-gray-900">
                {cameraState === 'DENIED'
                  ? 'Camera permission was denied.'
                  : 'Webcam not detected.'}
              </p>
              <button
                onClick={startCameraScanner}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Try Camera Again
              </button>
            </div>
          )}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-tomato-50 border border-tomato-200 text-tomato-800 text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4 text-tomato-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* RECOGNIZED PRODUCT SUCCESS POPUP CARD */}
        <AnimatePresence>
          {scannedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg mx-auto bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl border-2 border-emerald-500 p-6 shadow-xl space-y-5"
            >
              {/* Product Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{scannedProduct.emoji}</span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Product Found!
                    </span>
                    <h2 className="font-display font-black text-xl text-gray-900 mt-0.5">
                      {scannedProduct.name}
                    </h2>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-gray-400 block text-[10px]">Barcode</span>
                  <span className="font-bold text-gray-900">{scannedProduct.barcode}</span>
                </div>
              </div>

              {/* Expiry & Urgency Box */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white border border-cardboard-200 shadow-warm-sm">
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">
                    Stock Quantity
                  </span>
                  <span className="text-base font-extrabold text-gray-900 mt-0.5 block">
                    {scannedProduct.quantity} units
                  </span>
                  <span className="text-[10px] text-gray-500">{scannedProduct.unit}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border shadow-warm-sm ${
                    scannedProduct.idealZone === 'SELL_FIRST'
                      ? 'bg-tomato-50 border-tomato-200 text-tomato-900'
                      : scannedProduct.idealZone === 'SELL_SOON'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block opacity-70">
                    Expiry Window
                  </span>
                  <span className="text-base font-extrabold mt-0.5 block">
                    {scannedProduct.shelfLifeText}
                  </span>
                  <span className="text-[10px] font-bold">
                    Priority: {scannedProduct.idealZone.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Recommendation Tip */}
              <div className="p-3.5 rounded-2xl bg-emerald-100/70 border border-emerald-200 text-xs text-emerald-950">
                <strong className="block font-bold mb-0.5">What should you do?</strong>
                <p>{scannedProduct.tip}</p>
              </div>

              {/* Big Action Button */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleArrangeProduct}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-display font-black text-base shadow-lg shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>ARRANGE PRODUCT IN WAREHOUSE</span>
                  <ArrowRight className="w-5 h-5 text-emerald-300" />
                </button>

                <button
                  onClick={handleScanAnother}
                  className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-900 text-xs font-bold transition-colors"
                >
                  Scan Next Product
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Demo Barcode Fallback Buttons for Testing */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Quick Barcode Tap (Testing Fallback):
            </span>
            <button
              onClick={() => setIsManualOpen(!isManualOpen)}
              className="text-[11px] font-bold text-emerald-700 hover:underline"
            >
              {isManualOpen ? 'Hide Manual Input' : 'Type Barcode Manually'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => handleBarcodeScanned(p.barcode)}
                className="p-2.5 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cardboard-200 text-center transition-all active:scale-95"
              >
                <span className="text-2xl block">{p.emoji}</span>
                <span className="text-xs font-bold text-gray-800 block truncate mt-1">
                  {p.name}
                </span>
                <span className="text-[9px] font-mono text-gray-400 block">
                  {p.barcode.slice(-4)}
                </span>
              </button>
            ))}
          </div>

          {/* Manual Numeric Barcode Input */}
          {isManualOpen && (
            <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                placeholder="Type e.g. 890000000001"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-cream-50 border border-cardboard-200 rounded-xl font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-grocery-700 hover:bg-grocery-800 text-white text-xs font-bold"
              >
                Search
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
