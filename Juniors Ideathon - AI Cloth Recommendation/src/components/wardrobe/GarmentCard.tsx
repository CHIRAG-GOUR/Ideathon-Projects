import React from 'react';
import { Garment } from '../../types/fashion';
import { useFashionStore } from '../../store/useFashionStore';
import { Info, Check, Plus, GripVertical } from 'lucide-react';

interface GarmentCardProps {
  garment: Garment;
  onShowDetails?: (garment: Garment) => void;
}

export function GarmentCard({ garment, onShowDetails }: GarmentCardProps) {
  const { equipped, equipGarment, setDraggingGarment } = useFashionStore();

  const isEquipped = 
    (garment.category === 'shirts' && equipped.shirt?.id === garment.id) ||
    (garment.category === 'jackets' && (garment.isNone ? !equipped.jacket : equipped.jacket?.id === garment.id)) ||
    (garment.category === 'tops' && equipped.tops?.id === garment.id) ||
    (garment.category === 'bottoms' && equipped.bottoms?.id === garment.id) ||
    (garment.category === 'shoes' && equipped.shoes?.id === garment.id) ||
    (garment.category === 'accessories' && (
      equipped.watch?.id === garment.id ||
      equipped.glasses?.id === garment.id ||
      equipped.headwear?.id === garment.id ||
      equipped.accessories?.id === garment.id
    ));

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', garment.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingGarment(garment);
  };

  const handleDragEnd = () => {
    setDraggingGarment(null);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => equipGarment(garment)}
      className={`group relative flex flex-col justify-between p-3 rounded-2xl bg-white border transition-all duration-200 cursor-pointer select-none ${
        isEquipped 
          ? 'border-coral ring-2 ring-coral/20 shadow-md bg-coral-light/10' 
          : 'border-border-light hover:border-plum/20 hover:shadow-card hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header Row matching screenshot */}
      <div className="flex items-center justify-between gap-1 w-full text-xs mb-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails?.(garment);
            }}
            title="Inspect garment fabric & notes"
            className="p-1 rounded-md text-plum-muted/70 hover:text-plum hover:bg-ivory transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Size Pill */}
          <span className="px-1.5 py-0.5 rounded-md bg-ivory text-plum font-semibold text-[11px] border border-border-light/80">
            {(garment.size || 'M').split(' ')[0]}
          </span>
        </div>

        {/* Color Swatch Dot */}
        <div className="flex items-center gap-1">
          <span
            className="w-3.5 h-3.5 rounded-full border border-plum/20 shadow-xs"
            style={{ backgroundColor: garment.hexColor }}
            title={garment.colorName}
          />
        </div>
      </div>

      {/* Center HD Render Preview Thumbnail */}
      <div className="relative w-full aspect-square my-1 rounded-xl bg-ivory/50 flex items-center justify-center p-2 overflow-hidden group-hover:scale-105 transition-transform duration-200">
        <img
          src={garment.thumbnailUrl}
          alt={garment.name}
          className="w-full h-full object-contain filter drop-shadow-sm"
          loading="lazy"
        />

        {/* Drag Handle Overlay */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white/80 backdrop-blur-xs text-plum-muted">
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Equipped Badge */}
        {isEquipped && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-coral text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span>ON</span>
          </div>
        )}
      </div>

      {/* Bottom Name & Price Row */}
      <div className="mt-1 pt-1.5 border-t border-border-light/60">
        <h4 className="font-semibold text-xs text-plum leading-snug line-clamp-1 group-hover:text-coral transition-colors">
          {garment.name}
        </h4>
        <div className="flex items-center justify-between mt-1 text-[11px]">
          <span className="font-bold text-plum">
            {garment.currency}{garment.price.toFixed(2)}
          </span>
          <span className="text-[10px] text-plum-muted/80 font-medium">
            {isEquipped ? 'Equipped' : 'Click to wear'}
          </span>
        </div>
      </div>
    </div>
  );
}
