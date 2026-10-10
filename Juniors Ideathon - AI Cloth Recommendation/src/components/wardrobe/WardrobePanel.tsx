import React, { useState, useMemo } from 'react';
import { 
  Shirt, 
  Footprints, 
  Glasses, 
  Search, 
  Layers,
  Sparkles,
  X,
  Scissors
} from 'lucide-react';
import { Garment, GarmentCategory } from '../../types/fashion';
import { GARMENTS } from '../../data/garments';
import { GarmentCard } from './GarmentCard';
import { useFashionStore } from '../../store/useFashionStore';

export function WardrobePanel() {
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory>('shirts');
  const [accessoryFilter, setAccessoryFilter] = useState<'all' | 'Watch' | 'Glasses' | 'Headwear'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingGarment, setInspectingGarment] = useState<Garment | null>(null);
  
  const { 
    equipGarment, 
    equipped,
    avatarCustomization, 
    updateAvatarCustomization 
  } = useFashionStore();

  const categories = [
    { id: 'shirts' as GarmentCategory, label: 'Shirts & Tees', icon: Shirt, badge: '10' },
    { id: 'jackets' as GarmentCategory, label: 'Jackets', icon: Layers, badge: '5+None' },
    { 
      id: 'bottoms' as GarmentCategory, 
      label: 'Bottoms', 
      icon: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 3h12v7l-2 11h-3l-1-9-1 9H8L6 10V3z"/>
        </svg>
      ),
      badge: '5'
    },
    { id: 'shoes' as GarmentCategory, label: 'Shoes', icon: Footprints, badge: '5' },
    { id: 'accessories' as GarmentCategory, label: 'Accessories', icon: Glasses, badge: 'Watches/Hats' }
  ];

  const filteredGarments = useMemo(() => {
    return GARMENTS.filter(item => {
      let matchCat = false;
      if (selectedCategory === 'shirts') {
        matchCat = item.category === 'shirts' || item.category === 'tops';
      } else {
        matchCat = item.category === selectedCategory;
      }

      if (selectedCategory === 'accessories' && accessoryFilter !== 'all') {
        if (item.subcategory !== accessoryFilter) return false;
      }

      const matchSearch = searchQuery.trim() === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.colorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.fabric.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [selectedCategory, accessoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-border-light p-4 shadow-card">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-ivory rounded-2xl border border-border-light/80 mb-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-coral text-white shadow-xs'
                  : 'text-plum-muted hover:text-plum hover:bg-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accessories Sub-filter Pills */}
      {selectedCategory === 'accessories' && (
        <div className="flex items-center gap-1 pb-2 mb-2 overflow-x-auto no-scrollbar border-b border-border-light/60">
          {(['all', 'Watch', 'Glasses', 'Headwear'] as const).map((sub) => {
            const isSubActive = accessoryFilter === sub;
            const labelMap: Record<string, string> = {
              all: 'All Accessories',
              Watch: 'Watches (4)',
              Glasses: 'Glasses (6)',
              Headwear: 'Hats & Headwear'
            };
            return (
              <button
                key={sub}
                onClick={() => setAccessoryFilter(sub)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSubActive 
                    ? 'bg-plum text-white' 
                    : 'bg-ivory text-plum-muted hover:text-plum'
                }`}
              >
                {labelMap[sub]}
              </button>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-plum-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${selectedCategory}...`}
          className="w-full pl-9 pr-3 py-2 text-xs bg-ivory/60 border border-border-light rounded-xl placeholder:text-plum-muted/60 text-plum focus:outline-none focus:border-coral/50 focus:bg-white transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-plum-muted hover:text-plum"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {/* Grid of Garment Cards (2-columns) */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2.5 max-h-[520px] lg:max-h-[580px]">
          {filteredGarments.length === 0 ? (
            <div className="py-12 text-center text-xs text-plum-muted">
              <p>No {selectedCategory} found matching "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-coral font-semibold hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredGarments.map((garment) => (
                <GarmentCard
                  key={garment.id}
                  garment={garment}
                  onShowDetails={(g) => setInspectingGarment(g)}
                />
              ))}
            </div>
          )}
        </div>

      {/* Garment Details Modal */}
      {inspectingGarment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-border-light shadow-float">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-ivory text-plum font-semibold text-[10px] uppercase tracking-wider">
                  {inspectingGarment.brand} · {inspectingGarment.subcategory || inspectingGarment.category}
                </span>
                <h3 className="font-bold text-base text-plum mt-1">
                  {inspectingGarment.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectingGarment(null)}
                className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-plum-muted hover:text-plum cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="w-full aspect-square my-3 rounded-2xl bg-ivory p-4 flex items-center justify-center">
              <img
                src={inspectingGarment.thumbnailUrl}
                alt={inspectingGarment.name}
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>

            <div className="space-y-2 text-xs text-plum-muted">
              <p>{inspectingGarment.description}</p>
              <div className="pt-2 border-t border-border-light grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-plum-muted/80 block uppercase">Fabric</span>
                  <span className="font-semibold text-plum">{inspectingGarment.fabric}</span>
                </div>
                <div>
                  <span className="text-[10px] text-plum-muted/80 block uppercase">Color</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-3 h-3 rounded-full border border-plum/20"
                      style={{ backgroundColor: inspectingGarment.hexColor }}
                    />
                    <span className="font-semibold text-plum">{inspectingGarment.colorName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  equipGarment(inspectingGarment);
                  setInspectingGarment(null);
                }}
                className="flex-1 btn-primary"
              >
                Wear This Now
              </button>
              <button
                onClick={() => setInspectingGarment(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
