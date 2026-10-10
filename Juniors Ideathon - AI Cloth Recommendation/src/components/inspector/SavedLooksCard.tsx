import React, { useState } from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { Bookmark, Shirt, Share2, Trash2, Check, Sparkles } from 'lucide-react';

export function SavedLooksCard() {
  const { savedLooks, applySavedLook, deleteSavedLook } = useFashionStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeSaved = savedLooks[0];

  const handleShare = (id: string) => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="bg-white rounded-3xl border border-border-light p-4 shadow-card">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-border-light">
        <div className="flex items-center gap-1.5">
          <Bookmark className="w-4 h-4 text-plum" />
          <h3 className="font-bold text-sm text-plum">Saved outfits</h3>
        </div>
        <span className="text-[11px] font-semibold text-plum-muted">
          {savedLooks.length} looks
        </span>
      </div>

      {!activeSaved ? (
        <div className="py-6 text-center text-xs text-plum-muted">
          No saved outfits yet. Click the bookmark icon in the 3D studio to save your look!
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-ivory/60 border border-border-light flex flex-col items-center">
          {/* Avatar preview card thumbnail matching screenshot */}
          <div className="relative w-full h-32 rounded-xl bg-white border border-border-light/80 flex items-center justify-center overflow-hidden mb-2.5">
            {/* Visual representation of saved outfit */}
            <div className="flex items-center justify-center gap-1">
              {activeSaved.equipped.tops && (
                <img
                  src={activeSaved.equipped.tops.thumbnailUrl}
                  alt={activeSaved.equipped.tops.name}
                  className="w-16 h-16 object-contain"
                />
              )}
              {activeSaved.equipped.bottoms && (
                <img
                  src={activeSaved.equipped.bottoms.thumbnailUrl}
                  alt={activeSaved.equipped.bottoms.name}
                  className="w-16 h-16 object-contain"
                />
              )}
            </div>

            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-plum text-white text-[10px] font-bold uppercase tracking-wider">
              {activeSaved.mood}
            </span>
          </div>

          <p className="font-semibold text-xs text-plum mb-2.5 truncate w-full text-center">
            {activeSaved.name}
          </p>

          {/* Action buttons matching screenshot */}
          <div className="flex items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={() => applySavedLook(activeSaved)}
              className="flex-1 btn-primary py-1.5 text-xs"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Wear</span>
            </button>

            <button
              type="button"
              onClick={() => handleShare(activeSaved.id)}
              title="Share look link"
              className="p-2 rounded-xl bg-white border border-border-light text-plum-muted hover:text-plum hover:bg-ivory transition-colors"
            >
              {copiedId === activeSaved.id ? (
                <Check className="w-3.5 h-3.5 text-teal" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => deleteSavedLook(activeSaved.id)}
              title="Delete saved look"
              className="p-2 rounded-xl bg-white border border-border-light text-plum-muted hover:text-coral hover:bg-coral-light/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
