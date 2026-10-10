import React from 'react';
import { WardrobePanel } from '../wardrobe/WardrobePanel';
import { StudioCanvas } from '../studio/StudioCanvas';
import { MoodSelector } from '../inspector/MoodSelector';
import { CurrentlyWearing } from '../inspector/CurrentlyWearing';
import { SavedLooksCard } from '../inspector/SavedLooksCard';
import { OutfitAnalysisCard } from '../inspector/OutfitAnalysisCard';
import { MessageSquare, Mail, HelpCircle } from 'lucide-react';

export function FittingRoomView() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
      {/* 3-Column Studio Layout matching the reference FitMe interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Wardrobe & Clothing Catalog (4 cols on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 order-2 lg:order-1">
          <WardrobePanel />
        </div>

        {/* Center Column: 3D Studio Pedestal & Hero Model (4 cols on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 order-1 lg:order-2 flex flex-col items-center">
          <StudioCanvas />
        </div>

        {/* Right Column: Mood Selector, Saved Outfits, Currently Wearing & Analysis (4 cols on desktop) */}
        <div className="lg:col-span-4 xl:col-span-4 order-3 space-y-4">
          {/* Mood Selector Pills */}
          <MoodSelector />

          {/* Saved Outfits Card */}
          <SavedLooksCard />

          {/* Currently Wearing Table */}
          <CurrentlyWearing />

          {/* Outfit Analysis & Weather Card */}
          <OutfitAnalysisCard />

          {/* Information & Disclaimer Box matching screenshot */}
          <div className="bg-white rounded-3xl border border-border-light p-4 shadow-card text-xs text-plum-muted space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-plum flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-plum-muted" />
                <span>Information</span>
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-plum">
                <a href="#discord" className="hover:text-coral transition-colors flex items-center gap-1">
                  <span>Discord</span>
                </a>
                <a href="#message" className="hover:text-coral transition-colors flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>Message</span>
                </a>
                <a href="#email" className="hover:text-coral transition-colors flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-ivory text-[11px] text-plum-muted/90 text-center border border-border-light/70 leading-relaxed">
              This is a simulation, although we try to make it as realistic as possible, it is not a perfect representation of reality.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
