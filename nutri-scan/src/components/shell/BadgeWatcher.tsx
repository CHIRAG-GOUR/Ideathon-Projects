'use client';

import { useEffect } from 'react';
import { useKitchen } from '@/features/food/store';
import { BADGES, earnedBadges } from '@/lib/badges';
import { toast } from '@/components/ui/Toast';
import { feedback } from '@/lib/feedback';

/** Announces newly unlocked badges once, with a small celebration. */
export function BadgeWatcher() {
  useEffect(() => {
    const check = () => {
      const s = useKitchen.getState();
      if (!s.hydrated) return;
      const fresh = earnedBadges(s).filter((id) => !s.seenBadges.includes(id));
      if (!fresh.length) return;
      s.markBadgesSeen(fresh);
      fresh.forEach((id, i) => {
        const b = BADGES.find((x) => x.id === id);
        if (b) setTimeout(() => toast(`${b.emoji} Badge unlocked: ${b.title}`, 'info'), 900 + i * 700);
      });
      setTimeout(() => feedback.celebrate(), 900);
    };
    check();
    return useKitchen.subscribe(check);
  }, []);
  return null;
}
