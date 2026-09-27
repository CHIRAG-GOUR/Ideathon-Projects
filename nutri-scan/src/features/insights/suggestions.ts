import type { FoodItem } from '@/types';

/** Simple, rule-based recipe ideas (no AI needed) for food that should be used soon. */
interface Rule {
  title: string;
  emoji: string;
  needs: RegExp[]; // every group must match at least one item
}

const RULES: Rule[] = [
  { title: 'Make a Smoothie', emoji: '🥤', needs: [/milk|yog(h)?urt|curd|dahi/i, /banana|mango|berr|apple|fruit/i] },
  { title: 'Make a Toastie', emoji: '🥪', needs: [/bread|bun|pav/i, /cheese|paneer/i] },
  { title: 'Make Fried Rice', emoji: '🍛', needs: [/rice/i, /veg|carrot|peas|beans|capsicum|onion|egg/i] },
  { title: 'Make French Toast', emoji: '🍞', needs: [/bread/i, /milk|egg/i] },
  { title: 'Make Kheer', emoji: '🍚', needs: [/rice/i, /milk/i] },
  { title: 'Make Paneer Bhurji', emoji: '🍳', needs: [/paneer/i] },
  { title: 'Make Raita', emoji: '🥣', needs: [/yog(h)?urt|curd|dahi/i] },
  { title: 'Make Banana Pancakes', emoji: '🥞', needs: [/banana/i] },
  { title: 'Make an Omelette', emoji: '🍳', needs: [/egg/i] },
  { title: 'Make a Fruit Chaat', emoji: '🍉', needs: [/apple|banana|orange|papaya|grape|fruit/i] },
  { title: 'Make a Vegetable Soup', emoji: '🍲', needs: [/tomato|carrot|spinach|veg|onion|potato/i] },
];

export interface Suggestion {
  title: string;
  emoji: string;
  uses: string[];
}

export function suggestRecipes(items: FoodItem[], max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  for (const rule of RULES) {
    const uses: string[] = [];
    const ok = rule.needs.every((re) => {
      const hit = items.find((i) => re.test(i.name) && !uses.includes(i.name));
      if (hit) uses.push(hit.name);
      return Boolean(hit);
    });
    if (ok) out.push({ title: rule.title, emoji: rule.emoji, uses });
    if (out.length >= max) break;
  }
  return out;
}
