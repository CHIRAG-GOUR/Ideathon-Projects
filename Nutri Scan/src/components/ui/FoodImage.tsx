'use client';

import React, { useState } from 'react';
import type { FoodCategory } from '@/types';
import { emojiForFood } from '@/lib/food/meta';
import { cn } from '@/lib/utils';
import { Emoji3D } from '@/components/ui/Emoji3D';

const TINTS: Record<FoodCategory, string> = {
  dairy: '#E8F3FF', bakery: '#FFF0E4', fruit: '#FFE9EC', vegetable: '#E2F8F1', meat: '#FFE8E4', seafood: '#E2F4FB', eggs: '#FFF8DA',
  grains: '#FBF3E3', snacks: '#FFF3D1', beverages: '#EEEAFF', frozen: '#E6F6FF', condiments: '#FDEBE2', prepared: '#F4EEFF', other: '#EEF2FA',
};

/** Food image with safe fallbacks: saved photo → category illustration. Broken images never show. */
export function FoodImage({
  imageUrl,
  photo,
  category,
  name,
  emoji,
  className,
  rounded = 'rounded-3xl',
}: {
  imageUrl?: string | null;
  photo?: string | null;
  category: FoodCategory;
  name: string;
  emoji?: string;
  className?: string;
  rounded?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? imageUrl || photo : photo;
  return (
    <div className={cn('relative flex flex-none items-center justify-center overflow-hidden', rounded, className)} style={{ background: TINTS[category] }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="flex h-full w-full select-none items-center justify-center text-[2.2em] leading-none drop-shadow-sm" role="img" aria-label={name}>
          <Emoji3D emoji={emoji ?? emojiForFood(name, category)} fill="68%" />
        </span>
      )}
    </div>
  );
}
