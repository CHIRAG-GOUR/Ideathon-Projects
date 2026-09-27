import type { ObjectKind } from '@/types';

/**
 * The controlled set of playful responses for non-food scans. The model only tells us
 * WHAT it sees; the jokes always come from this list, so they stay kind and on-brand.
 */
export const FUN_MESSAGES: Partial<Record<ObjectKind, { emoji: string; title: string; message: string }>> = {
  person: { emoji: '👋', title: 'Nice try!', message: 'They seem pretty sweet… but unfortunately, humans are not on today’s menu. 😄' },
  dog: { emoji: '🐶', title: '10/10 good boy.', message: '0/10 food. Please keep the snacks for yourself. 😄' },
  cat: { emoji: '🐱', title: 'Definitely judging your grocery choices.', message: 'Still not food. 😼' },
  other_animal: { emoji: '🐾', title: 'What a cutie.', message: 'Friends, not food. Let’s scan something from the kitchen instead.' },
  phone: { emoji: '📱', title: 'Very smart. Very useful.', message: 'Absolutely zero calories. Useful for scanning food — not useful as food.' },
  laptop: { emoji: '💻', title: 'Contains lots of data.', message: 'Unfortunately, zero calories.' },
  tablet: { emoji: '📲', title: 'Great screen.', message: 'Terrible snack. Let’s find something edible.' },
  electronics: { emoji: '🔌', title: 'Useful technology.', message: 'Zero nutritional value.' },
  book: { emoji: '📚', title: 'Full of knowledge.', message: 'Not full of nutrients.' },
  shoe: { emoji: '👟', title: 'Great for walking.', message: 'Terrible as a sandwich.' },
  chair: { emoji: '🪑', title: 'Excellent for sitting.', message: 'Please don’t put it in the fridge.' },
  furniture: { emoji: '🛋️', title: 'Comfy, probably.', message: 'Not on the menu, definitely.' },
  plant: { emoji: '🪴', title: 'Now this one depends…', message: 'Some plants are food, some are definitely not. Let’s identify it properly before anyone takes a bite.' },
  bottle: { emoji: '🧴', title: 'Hydrating? Maybe.', message: 'A meal? Not quite.' },
  cup: { emoji: '☕', title: 'Holds great drinks.', message: 'Is not one. Scan what’s inside instead?' },
  toy: { emoji: '🧸', title: 'Fun to play with.', message: 'Please don’t put it on the dinner plate.' },
  pen: { emoji: '🖊️', title: 'Mightier than the sword.', message: 'Weaker than a samosa.' },
  bag: { emoji: '🎒', title: 'Might contain snacks.', message: 'Is not a snack. Open it and scan what’s inside!' },
  clothing: { emoji: '👕', title: 'Looking sharp.', message: 'Tasting terrible, probably.' },
};

const GENERIC = { emoji: '🔎', title: 'Nice try.', message: 'Very interesting. Definitely not dinner. 😄' };

export function funMessageFor(kind: ObjectKind): { emoji: string; title: string; message: string } {
  return FUN_MESSAGES[kind] ?? GENERIC;
}
