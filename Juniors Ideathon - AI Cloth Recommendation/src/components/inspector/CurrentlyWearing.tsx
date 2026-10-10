import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { Garment } from '../../types/fashion';
import { ShoppingBag, Check } from 'lucide-react';

export function CurrentlyWearing() {
  const { 
    equipped, 
    cartItemIds, 
    toggleCart 
  } = useFashionStore();

  const rawList: { label: string; item: Garment | null | undefined }[] = [
    { label: 'Shirt / Tee', item: equipped.shirt || equipped.tops },
    { label: 'Jacket', item: equipped.jacket },
    { label: 'Bottoms', item: equipped.bottoms },
    { label: 'Footwear', item: equipped.shoes },
    { label: 'Watch', item: equipped.watch || (equipped.accessories?.subcategory === 'Watch' ? equipped.accessories : undefined) },
    { label: 'Glasses', item: equipped.glasses || (equipped.accessories?.subcategory === 'Glasses' ? equipped.accessories : undefined) },
    { label: 'Headwear', item: equipped.headwear || (equipped.accessories?.subcategory === 'Headwear' ? equipped.accessories : undefined) },
  ];

  const equippedItems = rawList.filter(
    (s): s is { label: string; item: Garment } => !!s.item && !s.item.isNone
  );

  return (
    <div className="bg-white rounded-3xl border border-border-light p-4 shadow-card">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-light">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-plum" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
          </svg>
          <h3 className="font-bold text-sm text-plum">Currently wearing</h3>
        </div>
        <span className="text-[11px] font-semibold text-plum-muted">
          {equippedItems.length} items on avatar
        </span>
      </div>

      {/* Equipped Items List */}
      <div className="divide-y divide-border-light/60">
        {equippedItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-plum-muted">
            No clothes currently equipped. Click items in the wardrobe to wear them.
          </div>
        ) : (
          equippedItems.map(({ label, item }) => {
            const inCart = cartItemIds.includes(item.id);

            return (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                {/* Category & Name */}
                <div className="flex-1 min-w-0 pr-1">
                  <span className="text-[10px] uppercase font-bold text-plum-muted/80 block leading-tight">
                    {item.brand} · {label}
                  </span>
                  <p className="font-semibold text-plum truncate leading-tight">
                    {item.name}
                  </p>
                </div>

                {/* Color Swatch */}
                <div className="flex items-center">
                  <span
                    className="w-4 h-4 rounded-full border border-plum/20 shadow-2xs"
                    style={{ backgroundColor: item.hexColor }}
                    title={item.colorName}
                  />
                </div>

                {/* Size Selector */}
                <div className="px-2 py-0.5 rounded-md bg-ivory text-plum font-semibold text-[11px] border border-border-light">
                  {(item.size || 'M').split(' ')[0]}
                </div>

                {/* Price */}
                <div className="font-bold text-plum text-[11px] min-w-[45px] text-right">
                  {item.price > 0 ? `${item.currency}${item.price.toFixed(2)}` : 'Free'}
                </div>

                {/* Cart Toggle */}
                <button
                  type="button"
                  onClick={() => toggleCart(item.id)}
                  title={inCart ? 'Remove from try-on cart' : 'Add to try-on cart'}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    inCart 
                      ? 'bg-mint text-teal border-teal/30' 
                      : 'bg-ivory text-plum-muted border-border-light hover:text-plum hover:bg-white'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
