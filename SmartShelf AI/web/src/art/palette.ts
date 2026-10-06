// Illustration palette. Artwork colours live here (packaging, food, materials); UI colours live in index.css tokens.
export const ART = {
  ink: '#1E1B16',
  shadow: '#1E1B16',
  white: '#FFFFFF',
  paper: '#FFFCF6',
  cream: '#F4EAD6',
  glass: '#EAF4F1',
  metal: '#C9CED1',
  green: '#0E6B47',
  greenDark: '#0A3D2C',
  greenLight: '#3FAE78',
  mint: '#D6F1E1',
  red: '#D7372B',
  redDark: '#9E2318',
  yellow: '#F5B82E',
  orange: '#E8772E',
  blue: '#3A8DDE',
  sky: '#9ED3F2',
  brown: '#7A4A28',
  coffee: '#6B3F22',
  caramel: '#C98A3E',
  crust: '#C47A2C',
  bun: '#E7B062',
  lettuce: '#6DBE45',
  tomato: '#E2483A',
  cheese: '#F7C948',
  rice: '#F3C64F',
  purple: '#7B4FB8',
  teal: '#2C9C8F',
  wood: '#B98552',
  woodDark: '#8C5E33',
} as const;

/** Mixes a hex colour toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(amt >= 0 ? x + (255 - x) * amt : x * (1 + amt)));
  return `#${c.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('')}`;
}

/** Stable pseudo-random index from a string (gives each product its own packaging colour). */
export function hashIndex(s: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h) % n;
}
