'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { cn } from '@/lib/utils';

/**
 * A real, machine-readable Code 128 barcode rendered with JsBarcode.
 * Code 128 encodes our 12-digit demo numbers exactly as written and is read by
 * both BarcodeDetector and ZXing. Always rendered black on pure white with a
 * generous quiet zone so printed labels scan reliably.
 */
export function Barcode({
  value,
  className,
  height = 70,
  moduleWidth = 2,
  showValue = false,
}: {
  value: string;
  className?: string;
  height?: number;
  moduleWidth?: number;
  showValue?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width: moduleWidth,
        height,
        margin: moduleWidth * 12,
        background: '#FFFFFF',
        lineColor: '#000000',
        displayValue: showValue,
        font: 'JetBrains Mono, monospace',
        fontSize: 16,
        textMargin: 4,
      });
      // Make the SVG scale with its container (JsBarcode writes fixed pixel sizes).
      const svg = ref.current;
      const w = parseFloat(svg.getAttribute('width') || '0');
      const h = parseFloat(svg.getAttribute('height') || '0');
      if (w && h) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.aspectRatio = `${w} / ${h}`;
      }
    } catch (err) {
      console.error('Barcode render failed', err);
    }
  }, [value, height, moduleWidth, showValue]);

  return <svg ref={ref} className={cn('block h-auto max-w-full', className)} data-barcode={value} aria-label={`Barcode ${value}`} role="img" />;
}
