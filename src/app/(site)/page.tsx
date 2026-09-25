import { Hero } from '@/components/home/Hero';
import { WhatIs, Problem, Solution } from '@/components/home/Story';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ScanPreview } from '@/components/home/ScanPreview';
import { ExpiryTimeline } from '@/components/home/ExpiryTimeline';
import { ScannerBand, StockPreview } from '@/components/home/ProductSections';
import { WarehousePreview } from '@/components/home/WarehousePreview';
import { UseCases } from '@/components/home/UseCases';
import { BeforeAfter } from '@/components/home/BeforeAfter';
import { FinalCTA } from '@/components/home/FinalCTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhatIs />
      <Problem />
      <Solution />
      <HowItWorks />
      <ScanPreview />
      <ExpiryTimeline />
      <ScannerBand />
      <StockPreview />
      <WarehousePreview />
      <UseCases />
      <BeforeAfter />
      <FinalCTA />
    </>
  );
}
