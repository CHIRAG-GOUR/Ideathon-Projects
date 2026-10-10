import React, { useState } from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { Bookmark, Shirt, Trash2, Calendar, Share2, Sparkles, Plus } from 'lucide-react';
import { MOODS } from '../../data/moods';

export function SavedLooksView() {
  const { 
    savedLooks, 
    applySavedLook, 
    deleteSavedLook, 
    saveCurrentLook, 
    setActiveTab,
    equipped,
    currentMood
  } = useFashionStore();

  const [lookNameInput, setLookNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleCreateSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCurrentLook(lookNameInput.trim() || undefined);
    setLookNameInput('');
    setShowSaveModal(false);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-light">
        <div>
          <h2 className="font-editorial font-extrabold text-2xl text-plum">
            Saved Outfits & Capsules
          </h2>
          <p className="text-xs text-plum-muted">
            All your curated looks saved with their exact mood states and equipped garment layers.
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="btn-primary text-xs py-2 px-4 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Current Look</span>
        </button>
      </div>

      {/* Grid of Saved Looks */}
      {savedLooks.length === 0 ? (
        <div className="card-surface p-12 text-center max-w-md mx-auto space-y-3">
          <Bookmark className="w-8 h-8 text-plum-muted/60 mx-auto" />
          <h3 className="font-bold text-base text-plum">No saved looks yet</h3>
          <p className="text-xs text-plum-muted leading-relaxed">
            Head over to the Fitting Room, try on combinations, and click the bookmark button to save your favorites.
          </p>
          <button
            onClick={() => setActiveTab('fitting-room')}
            className="btn-primary text-xs mt-2"
          >
            Go to Fitting Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedLooks.map((look) => {
            const moodConfig = MOODS[look.mood] || MOODS.chill;
            const formattedDate = new Date(look.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={look.id}
                className="card-surface p-4 flex flex-col justify-between hover:shadow-float transition-all group"
              >
                <div>
                  {/* Visual Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-lavender text-plum text-[11px] font-bold flex items-center gap-1">
                      <span>{moodConfig.emoji}</span>
                      <span>{moodConfig.name}</span>
                    </span>
                    <span className="text-[10px] text-plum-muted font-medium">
                      {formattedDate}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-plum mb-3 line-clamp-1">
                    {look.name}
                  </h3>

                  {/* Thumbnail Previews of Equipped Layers */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-2xl bg-ivory/60 border border-border-light mb-3">
                    <div className="aspect-square bg-white rounded-xl p-1 flex items-center justify-center">
                      {look.equipped.tops ? (
                        <img
                          src={look.equipped.tops.thumbnailUrl}
                          alt="Top"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-plum-muted">No Top</span>
                      )}
                    </div>
                    <div className="aspect-square bg-white rounded-xl p-1 flex items-center justify-center">
                      {look.equipped.bottoms ? (
                        <img
                          src={look.equipped.bottoms.thumbnailUrl}
                          alt="Bottom"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-plum-muted">No Bottom</span>
                      )}
                    </div>
                    <div className="aspect-square bg-white rounded-xl p-1 flex items-center justify-center">
                      {look.equipped.shoes ? (
                        <img
                          src={look.equipped.shoes.thumbnailUrl}
                          alt="Shoes"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[9px] text-plum-muted">No Shoes</span>
                      )}
                    </div>
                  </div>

                  {/* Garment Details summary */}
                  <ul className="text-[11px] text-plum-muted space-y-1 mb-4">
                    {look.equipped.tops && (
                      <li className="truncate">👔 {look.equipped.tops.name}</li>
                    )}
                    {look.equipped.bottoms && (
                      <li className="truncate">👖 {look.equipped.bottoms.name}</li>
                    )}
                    {look.equipped.shoes && (
                      <li className="truncate">👟 {look.equipped.shoes.name}</li>
                    )}
                  </ul>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                  <button
                    onClick={() => {
                      applySavedLook(look);
                      setActiveTab('fitting-room');
                    }}
                    className="flex-1 btn-primary py-1.5 text-xs"
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    <span>Wear on Avatar</span>
                  </button>

                  <button
                    onClick={() => deleteSavedLook(look.id)}
                    title="Delete outfit"
                    className="p-2 rounded-xl text-plum-muted hover:text-coral hover:bg-coral-light/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/30 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateSave}
            className="bg-white rounded-3xl p-6 max-w-sm w-full border border-border-light shadow-float space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-light">
              <h3 className="font-bold text-sm text-plum">Save Current Outfit</h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-plum-muted hover:text-plum text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-plum block mb-1">
                Outfit Title
              </label>
              <input
                type="text"
                value={lookNameInput}
                onChange={(e) => setLookNameInput(e.target.value)}
                placeholder="e.g. Friday Campus Minimalist"
                className="w-full px-3 py-2 text-xs bg-ivory border border-border-light rounded-xl text-plum focus:outline-none focus:border-coral/50"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 btn-primary text-xs py-2">
                Save Look
              </button>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="btn-secondary text-xs py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
