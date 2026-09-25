'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';
import { INITIAL_DEMO_PRODUCTS, DemoProduct } from '@/lib/products';
import { Printer, ArrowLeft, ScanLine, CheckCircle2, Scissors, Info } from 'lucide-react';

function BarcodeCard({ product }: { product: DemoProduct }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128',
          lineColor: '#000000',
          width: 2.2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          font: 'monospace',
          textMargin: 4,
          background: '#ffffff',
          margin: 10,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [product.barcode]);

  return (
    <div className="bg-white border-2 border-dashed border-cardboard-300 rounded-3xl p-5 shadow-warm-sm flex flex-col justify-between print:border-black print:shadow-none print:break-inside-avoid">
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{product.emoji}</span>
            <div>
              <h3 className="font-display font-bold text-sm text-gray-900">
                {product.name}
              </h3>
              <p className="text-[10px] text-gray-500">
                {product.category} • {product.unit}
              </p>
            </div>
          </div>

          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
              product.idealZone === 'SELL_FIRST'
                ? 'bg-tomato-100 text-tomato-800'
                : product.idealZone === 'SELL_SOON'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {product.idealZone.replace('_', ' ')}
          </span>
        </div>

        {/* Real Machine-Readable SVG Barcode */}
        <div className="my-2 p-2 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden">
          <svg ref={svgRef} className="max-w-full h-auto" />
        </div>

        <div className="text-[11px] text-gray-600 space-y-0.5 mt-2 bg-cream-50 p-2.5 rounded-xl border border-cardboard-200">
          <div className="flex justify-between">
            <span className="text-gray-400">Stock:</span>
            <span className="font-bold text-gray-900">{product.quantity} units</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Shelf Life:</span>
            <span className="font-bold text-tomato-700">{product.shelfLifeText}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Destination:</span>
            <span className="font-bold text-emerald-800">{product.idealZone}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-mono print:hidden">
        <span>Paste on bottle/box</span>
        <button
          onClick={() => window.print()}
          className="text-emerald-700 hover:text-emerald-900 font-bold"
        >
          Print this
        </button>
      </div>
    </div>
  );
}

export default function BarcodesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-1.5 rounded-xl bg-white border border-cardboard-200 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-900 tracking-tight">
              Print Demo Barcodes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real machine-readable Code-128 barcodes for the 6 school demo objects
          </p>
        </div>

        {/* Big Print All Button */}
        <button
          onClick={() => window.print()}
          className="px-6 py-3 rounded-2xl bg-grocery-700 hover:bg-grocery-800 text-white font-bold text-xs shadow-md shadow-grocery-800/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-emerald-300" />
          <span>Print All 6 Barcodes Sheet</span>
        </button>
      </div>

      {/* Instructions Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 print:hidden">
        <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center flex-shrink-0 text-base">
          <Scissors className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 leading-relaxed">
          <strong className="block font-bold mb-0.5">How to prepare your demo items:</strong>
          Click &ldquo;Print All 6 Barcodes Sheet&rdquo;, cut along the dashed borders with scissors, and tape each barcode onto physical items (e.g. a water bottle for Milk, a small cardboard box for Bread, etc.).
        </div>
      </div>

      {/* 6 Barcode Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INITIAL_DEMO_PRODUCTS.map((product) => (
          <BarcodeCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
