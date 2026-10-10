import { Garment } from '../types/fashion';

// High-fidelity vector fashion render SVG generator
export const makeGarmentSVG = (type: string, color: string, secondary = '#ffffff', label = '', accent = ''): string => {
  let shapeSvg = '';

  if (type === 'none') {
    shapeSvg = `
      <!-- None / Empty Slot Icon -->
      <circle cx="60" cy="60" r="28" fill="none" stroke="#B8B5C4" stroke-width="2" stroke-dasharray="4,4"/>
      <line x1="42" y1="42" x2="78" y2="78" stroke="#FF8978" stroke-width="2.5" stroke-linecap="round"/>
      <text x="60" y="64" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#777484">NONE</text>
    `;
  } else if (type === 'hoodie') {
    shapeSvg = `
      <path d="M38,32 L60,25 L82,32 L100,50 L88,62 L78,55 L78,96 L42,96 L42,55 L32,62 L20,50 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M48,27 C50,15 70,15 72,27" fill="${color}" stroke="#29243B" stroke-width="2"/>
      <path d="M52,28 C56,38 64,38 68,28" fill="none" stroke="#29243B" stroke-width="2"/>
      <path d="M48,68 L72,68 L76,88 L44,88 Z" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <line x1="42" y1="92" x2="78" y2="92" stroke="#29243B" stroke-width="1.8" stroke-dasharray="2,2"/>
    `;
  } else if (type === 'leather_jacket') {
    shapeSvg = `
      <path d="M36,28 L60,24 L84,28 L100,46 L88,58 L78,52 L78,96 L42,96 L42,52 L32,58 L20,46 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Asymmetric biker zip -->
      <line x1="50" y1="36" x2="66" y2="96" stroke="#D8DCE0" stroke-width="2.5"/>
      <!-- Biker collar lapels with silver snaps -->
      <polygon points="46,30 58,48 46,54" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <polygon points="74,30 62,48 74,54" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <circle cx="48" cy="38" r="1.5" fill="#FFFFFF"/>
      <circle cx="72" cy="38" r="1.5" fill="#FFFFFF"/>
      <!-- Belted bottom band -->
      <rect x="42" y="88" width="36" height="8" fill="#141317" stroke="#29243B" stroke-width="1.5"/>
      <rect x="56" y="87" width="8" height="10" fill="#D8DCE0" stroke="#29243B" stroke-width="1.2"/>
    `;
  } else if (type === 'denim_jacket') {
    shapeSvg = `
      <path d="M38,30 L60,25 L82,30 L98,46 L86,56 L76,50 L76,95 L44,95 L44,50 L34,56 L22,46 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="60,25 50,38 60,34 70,38" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <!-- Pointed chest flap pockets with copper rivets -->
      <polygon points="46,46 56,46 56,58 51,62 46,58" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <polygon points="64,46 74,46 74,58 69,62 64,58" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <circle cx="51" cy="50" r="1.3" fill="#D4A359"/>
      <circle cx="69" cy="50" r="1.3" fill="#D4A359"/>
      <line x1="60" y1="34" x2="60" y2="95" stroke="#D4A359" stroke-width="1.5" stroke-dasharray="3,2"/>
    `;
  } else if (type === 'bomber') {
    shapeSvg = `
      <path d="M38,32 L60,27 L82,32 L98,48 L86,58 L76,52 L76,94 L44,94 L44,52 L34,58 L22,48 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Ribbed Baseball Collar -->
      <path d="M48,30 C54,38 66,38 72,30" fill="none" stroke="#29243B" stroke-width="2.5"/>
      <!-- Center Gold Zip -->
      <line x1="60" y1="34" x2="60" y2="94" stroke="#D4AF37" stroke-width="2"/>
      <!-- Utility Sleeve Pocket on arm -->
      <rect x="22" y="54" width="7" height="12" rx="1.5" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <line x1="22" y1="58" x2="29" y2="58" stroke="#D4AF37" stroke-width="1"/>
      <!-- Ribbed Waistband -->
      <rect x="44" y="90" width="32" height="6" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
    `;
  } else if (type === 'blazer') {
    shapeSvg = `
      <path d="M38,30 L60,25 L82,30 L98,46 L86,56 L76,50 L76,96 L44,96 L44,50 L34,56 L22,46 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Notched Lapels with inner shirt/tie reveal -->
      <polygon points="60,25 50,45 60,65 52,50" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <polygon points="60,25 70,45 60,65 68,50" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <polygon points="60,26 56,38 60,45 64,38" fill="#FFFFFF"/>
      <rect x="46" y="74" width="12" height="4" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <rect x="62" y="74" width="12" height="4" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <circle cx="60" cy="70" r="2" fill="#D4AF37"/>
    `;
  } else if (type === 'shirt' || type === 'oxford') {
    shapeSvg = `
      <path d="M42,30 L60,26 L78,30 L96,44 L86,54 L76,48 L76,96 L44,96 L44,48 L34,54 L24,44 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="60,26 52,38 60,34 68,38" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <line x1="60" y1="34" x2="60" y2="96" stroke="#29243B" stroke-width="1.8"/>
      <circle cx="60" cy="46" r="1.5" fill="#29243B"/>
      <circle cx="60" cy="60" r="1.5" fill="#29243B"/>
      <circle cx="60" cy="74" r="1.5" fill="#29243B"/>
      <rect x="48" y="48" width="8" height="10" rx="1" fill="${secondary}" stroke="#29243B" stroke-width="1"/>
    `;
  } else if (type === 'tee') {
    shapeSvg = `
      <path d="M42,32 L60,27 L78,32 L94,45 L84,54 L76,48 L76,95 L44,95 L44,48 L36,54 L26,45 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M52,29 C56,36 64,36 68,29" fill="none" stroke="#29243B" stroke-width="2"/>
    `;
  } else if (type === 'vneck') {
    shapeSvg = `
      <path d="M42,32 L60,27 L78,32 L94,45 L84,54 L76,48 L76,95 L44,95 L44,48 L36,54 L26,45 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- V-neck cut -->
      <polygon points="52,28 60,42 68,28" fill="#FAF8F4" stroke="#29243B" stroke-width="1.8"/>
    `;
  } else if (type === 'polo') {
    shapeSvg = `
      <path d="M42,32 L60,27 L78,32 L94,45 L84,54 L76,48 L76,95 L44,95 L44,48 L36,54 L26,45 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Structured ribbed polo collar and placket -->
      <polygon points="60,27 50,38 60,34 70,38" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <rect x="57" y="34" width="6" height="24" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <circle cx="60" cy="40" r="1.2" fill="#29243B"/>
      <circle cx="60" cy="48" r="1.2" fill="#29243B"/>
    `;
  } else if (type === 'kurta') {
    shapeSvg = `
      <!-- Contemporary Short Kurta -->
      <path d="M42,28 L60,24 L78,28 L94,44 L84,54 L76,48 L78,102 L42,102 L44,48 L36,54 L26,44 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Mandarin band collar -->
      <path d="M52,26 C56,22 64,22 68,26" fill="none" stroke="#29243B" stroke-width="2.2"/>
      <!-- Front placket with wooden buttons -->
      <line x1="60" y1="26" x2="60" y2="68" stroke="#29243B" stroke-width="1.8"/>
      <circle cx="60" cy="36" r="1.4" fill="#C8A97E"/>
      <circle cx="60" cy="48" r="1.4" fill="#C8A97E"/>
      <circle cx="60" cy="60" r="1.4" fill="#C8A97E"/>
      <!-- Side slits -->
      <line x1="44" y1="88" x2="44" y2="102" stroke="#29243B" stroke-width="1.5"/>
      <line x1="76" y1="88" x2="76" y2="102" stroke="#29243B" stroke-width="1.5"/>
    `;
  } else if (type === 'henley') {
    shapeSvg = `
      <path d="M42,32 L60,27 L78,32 L94,45 L84,54 L76,48 L76,95 L44,95 L44,48 L36,54 L26,45 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Crew collar with 3-button placket -->
      <path d="M52,29 C56,36 64,36 68,29" fill="none" stroke="#29243B" stroke-width="2"/>
      <rect x="57" y="34" width="6" height="22" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <circle cx="60" cy="38" r="1" fill="#29243B"/>
      <circle cx="60" cy="45" r="1" fill="#29243B"/>
      <circle cx="60" cy="52" r="1" fill="#29243B"/>
    `;
  } else if (type === 'flannel') {
    shapeSvg = `
      <path d="M42,30 L60,26 L78,30 L96,44 L86,54 L76,48 L76,96 L44,96 L44,48 L34,54 L24,44 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Plaid cross checks -->
      <line x1="44" y1="50" x2="76" y2="50" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="4,3"/>
      <line x1="44" y1="68" x2="76" y2="68" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="4,3"/>
      <line x1="44" y1="84" x2="76" y2="84" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="4,3"/>
      <line x1="52" y1="34" x2="52" y2="96" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="4,3"/>
      <line x1="68" y1="34" x2="68" y2="96" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="4,3"/>
      <!-- Collar & buttons -->
      <polygon points="60,26 52,38 60,34 68,38" fill="${secondary}" stroke="#29243B" stroke-width="1.8"/>
      <circle cx="60" cy="46" r="1.5" fill="#29243B"/>
      <circle cx="60" cy="62" r="1.5" fill="#29243B"/>
      <circle cx="60" cy="78" r="1.5" fill="#29243B"/>
    `;
  } else if (type === 'jeans') {
    shapeSvg = `
      <path d="M38,24 L82,24 L88,96 L64,96 L60,52 L56,96 L32,96 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="38" y1="32" x2="82" y2="32" stroke="#29243B" stroke-width="1.8"/>
      <path d="M46,32 Q53,42 60,32 Q67,42 74,32" fill="none" stroke="#D4A359" stroke-width="1.5"/>
      <line x1="60" y1="24" x2="60" y2="50" stroke="#29243B" stroke-width="2"/>
      <circle cx="44" cy="35" r="1.2" fill="#D4A359"/>
      <circle cx="76" cy="35" r="1.2" fill="#D4A359"/>
    `;
  } else if (type === 'trousers') {
    shapeSvg = `
      <path d="M40,24 L80,24 L84,96 L63,96 L60,54 L57,96 L36,96 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="40" y1="31" x2="80" y2="31" stroke="#29243B" stroke-width="1.8"/>
      <line x1="49" y1="34" x2="47" y2="96" stroke="#29243B" stroke-width="1.5"/>
      <line x1="71" y1="34" x2="73" y2="96" stroke="#29243B" stroke-width="1.5"/>
    `;
  } else if (type === 'cargos') {
    shapeSvg = `
      <path d="M38,24 L82,24 L86,96 L64,96 L60,52 L56,96 L34,96 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="30" y="52" width="7" height="14" rx="2" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <rect x="83" y="52" width="7" height="14" rx="2" fill="${secondary}" stroke="#29243B" stroke-width="1.5"/>
      <line x1="38" y1="32" x2="82" y2="32" stroke="#29243B" stroke-width="1.8"/>
    `;
  } else if (type === 'shorts') {
    shapeSvg = `
      <!-- Relaxed Shorts (Pants) -->
      <path d="M36,26 L84,26 L88,68 L64,68 L60,46 L56,68 L32,68 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="36" y1="34" x2="84" y2="34" stroke="#29243B" stroke-width="1.8"/>
      <line x1="58" y1="34" x2="56" y2="44" stroke="#FFFFFF" stroke-width="1.5"/>
      <line x1="62" y1="34" x2="64" y2="44" stroke="#FFFFFF" stroke-width="1.5"/>
    `;
  } else if (type === 'sneaker' || type === 'jordan') {
    shapeSvg = `
      <!-- Retro Sneaker (Jordan) -->
      <path d="M22,70 C22,60 30,55 45,55 L65,58 L85,62 C96,65 98,72 96,78 L22,78 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M78,63 L88,64 C94,67 96,72 96,78 L76,78 Z" fill="#1E1C21" stroke="#29243B" stroke-width="1.5"/>
      <path d="M22,70 C22,62 26,58 35,58 L35,78 L22,78 Z" fill="${accent || '#FF8978'}" stroke="#29243B" stroke-width="1.5"/>
      <path d="M20,78 L98,78 L98,84 L20,84 Z" fill="#FFFFFF" stroke="#29243B" stroke-width="2"/>
    `;
  } else if (type === 'running_shoe' || type === 'adidas') {
    shapeSvg = `
      <!-- Adidas Ultraboost Runner -->
      <path d="M20,72 C22,58 36,54 52,56 L72,60 L88,64 C98,67 100,74 96,79 L20,79 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Signature Three Stripes -->
      <line x1="52" y1="58" x2="48" y2="76" stroke="${secondary}" stroke-width="2.5"/>
      <line x1="58" y1="59" x2="54" y2="76" stroke="${secondary}" stroke-width="2.5"/>
      <line x1="64" y1="60" x2="60" y2="76" stroke="${secondary}" stroke-width="2.5"/>
      <!-- Boost Pebble Sole -->
      <path d="M18,79 L98,79 L96,85 L18,85 Z" fill="#FFFFFF" stroke="#29243B" stroke-width="2"/>
    `;
  } else if (type === 'oxford_shoe') {
    shapeSvg = `
      <!-- Formal Oxford Dress Shoe -->
      <path d="M22,72 C22,62 30,58 46,58 L68,60 L88,64 C98,66 99,72 96,78 L22,78 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- Closed lacing placket -->
      <polygon points="48,58 58,58 56,68 50,68" fill="${secondary}" stroke="#29243B" stroke-width="1.2"/>
      <!-- Wooden/stacked leather heel & sole -->
      <path d="M20,78 L98,78 L98,83 L20,83 Z" fill="#3D2B1F" stroke="#29243B" stroke-width="2"/>
      <rect x="20" y="83" width="16" height="4" fill="#1E1C21"/>
    `;
  } else if (type === 'minimal_shoe') {
    shapeSvg = `
      <path d="M22,70 C22,60 30,55 45,55 L65,58 L85,62 C96,65 98,72 96,78 L22,78 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M20,78 L98,78 L98,84 L20,84 Z" fill="${secondary}" stroke="#29243B" stroke-width="2"/>
    `;
  } else if (type === 'boot') {
    shapeSvg = `
      <path d="M30,42 L48,42 L52,60 L78,64 C88,66 92,72 90,78 L28,78 L28,48 Z" fill="${color}" stroke="#29243B" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="36,42 46,42 44,62 38,62" fill="#29243B"/>
      <path d="M26,78 L92,78 L92,84 L26,84 Z" fill="#4A3B2C" stroke="#29243B" stroke-width="2"/>
    `;
  } else if (type === 'watch') {
    shapeSvg = `
      <rect x="52" y="18" width="16" height="84" rx="3" fill="${secondary}" stroke="#29243B" stroke-width="2"/>
      <circle cx="60" cy="60" r="24" fill="${color}" stroke="#29243B" stroke-width="3"/>
      <circle cx="60" cy="60" r="19" fill="#1E1C21"/>
      <line x1="60" y1="60" x2="60" y2="47" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="60" y1="60" x2="71" y2="60" stroke="#FF8978" stroke-width="2" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="2" fill="${color}"/>
    `;
  } else if (type === 'glasses') {
    shapeSvg = `
      <!-- Dual-Lens Designer Eyewear with Sculpted Rims -->
      <rect x="20" y="46" width="36" height="26" rx="8" fill="${color}" stroke="#29243B" stroke-width="2.2"/>
      <rect x="64" y="46" width="36" height="26" rx="8" fill="${color}" stroke="#29243B" stroke-width="2.2"/>
      <rect x="24" y="50" width="28" height="18" rx="4" fill="${secondary}" opacity="0.75"/>
      <rect x="68" y="50" width="28" height="18" rx="4" fill="${secondary}" opacity="0.75"/>
      <!-- Metallic Arched Bridge -->
      <path d="M56,56 Q60,51 64,56" fill="none" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/>
      <!-- Front Rivet Accents -->
      <circle cx="24" cy="50" r="1.2" fill="#D4AF37"/>
      <circle cx="96" cy="50" r="1.2" fill="#D4AF37"/>
      <!-- Temples -->
      <path d="M20,50 L12,47" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <path d="M100,50 L108,47" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    `;
  } else if (type === 'cap') {
    shapeSvg = `
      <!-- Baseball Cap -->
      <path d="M34,60 C34,36 50,28 66,28 C82,28 88,36 88,60 Z" fill="${color}" stroke="#29243B" stroke-width="2.5"/>
      <!-- Curved Visor -->
      <path d="M30,60 C40,68 85,68 98,62 C94,56 82,56 30,60 Z" fill="${secondary}" stroke="#29243B" stroke-width="2.2"/>
      <circle cx="62" cy="28" r="2.5" fill="#29243B"/>
    `;
  } else if (type === 'fedora') {
    shapeSvg = `
      <!-- Fedora Hat -->
      <path d="M38,48 C38,30 48,22 60,22 C72,22 82,30 82,48 Z" fill="${color}" stroke="#29243B" stroke-width="2.5"/>
      <!-- Indented Crown Crease -->
      <path d="M48,26 Q60,34 72,26" fill="none" stroke="#29243B" stroke-width="2"/>
      <!-- Brim -->
      <ellipse cx="60" cy="52" rx="38" ry="8" fill="${secondary}" stroke="#29243B" stroke-width="2.2"/>
      <rect x="42" y="44" width="36" height="4" fill="#1E1C21"/>
    `;
  } else if (type === 'beanie') {
    shapeSvg = `
      <!-- Beanie -->
      <path d="M40,58 C40,32 50,22 60,22 C70,22 80,32 80,58 Z" fill="${color}" stroke="#29243B" stroke-width="2.5"/>
      <!-- Ribbed Folded Cuff -->
      <rect x="36" y="54" width="48" height="12" rx="3" fill="${secondary}" stroke="#29243B" stroke-width="2"/>
      <line x1="44" y1="54" x2="44" y2="66" stroke="#29243B" stroke-width="1.2"/>
      <line x1="52" y1="54" x2="52" y2="66" stroke="#29243B" stroke-width="1.2"/>
      <line x1="60" y1="54" x2="60" y2="66" stroke="#29243B" stroke-width="1.2"/>
      <line x1="68" y1="54" x2="68" y2="66" stroke="#29243B" stroke-width="1.2"/>
    `;
  } else {
    shapeSvg = `<circle cx="60" cy="60" r="30" fill="${color}" stroke="#29243B" stroke-width="2"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
    <rect width="120" height="120" rx="20" fill="#FAF8F4"/>
    <ellipse cx="60" cy="98" rx="35" ry="7" fill="#EAE6EE" opacity="0.6"/>
    ${shapeSvg}
    ${label ? `<text x="60" y="112" font-size="8" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#777484">${label}</text>` : ''}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const GARMENTS: Garment[] = [
  // ==========================================
  // 1. SHIRTS & T-SHIRTS (10 Items Required)
  // ==========================================
  {
    id: 'shirt-oxford-white',
    name: 'Classic Oxford Poplin Shirt',
    category: 'shirts',
    subcategory: 'Shirt',
    brand: 'Atelier Sartorial',
    price: 45.00,
    currency: '£',
    colorName: 'Crisp Chalk White',
    hexColor: '#FAF9F5',
    size: 'M',
    availableSizes: ['S', 'M', 'L', 'XL'],
    fabric: '120/2 Egyptian Giza Cotton Poplin',
    description: 'Mother-of-pearl buttons, structured spread collar, and French placket.',
    moodAffinity: ['confident', 'happy', 'calm'],
    occasionAffinity: ['work', 'special', 'college'],
    pbr: {
      color: '#FAF9F5',
      roughness: 0.42,
      metalness: 0.0,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('oxford', '#FAF9F5', '#EAE6EE', 'M · OXFORD')
  },
  {
    id: 'shirt-crew-black',
    name: 'Heavyweight Cotton Crewneck Tee',
    category: 'shirts',
    subcategory: 'T-Shirt',
    brand: 'FitMe Raw',
    price: 24.50,
    currency: '£',
    colorName: 'Obsidian Black',
    hexColor: '#1E1C21',
    size: 'L',
    availableSizes: ['S', 'M', 'L', 'XL'],
    fabric: '280gsm Combed Slub Jersey',
    description: 'Vintage pigment wash, drop shoulder cut, and reinforced double-needle neckband.',
    moodAffinity: ['confident', 'chill', 'tired'],
    occasionAffinity: ['casual', 'home', 'sports'],
    pbr: {
      color: '#1E1C21',
      roughness: 0.82,
      metalness: 0.02,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('tee', '#1E1C21', '#141317', 'L · CREW')
  },
  {
    id: 'shirt-vneck-olive',
    name: 'Relaxed Drape V-Neck T-Shirt',
    category: 'shirts',
    subcategory: 'V-Neck T-Shirt',
    brand: 'Studio Organic',
    price: 26.00,
    currency: '£',
    colorName: 'Muted Olive Green',
    hexColor: '#535E4B',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: 'Bamboo Cotton Blend',
    description: 'Ultra-soft relaxed fit with clean-edged mitered V-neck collar.',
    moodAffinity: ['calm', 'chill'],
    occasionAffinity: ['casual', 'home', 'sports'],
    pbr: {
      color: '#535E4B',
      roughness: 0.85,
      metalness: 0.02,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('vneck', '#535E4B', '#3E4638', 'M · V-NECK')
  },
  {
    id: 'shirt-polo-navy',
    name: 'Structured Piqué Polo T-Shirt',
    category: 'shirts',
    subcategory: 'Polo T-Shirt',
    brand: 'Maritime Club',
    price: 38.00,
    currency: '£',
    colorName: 'Midnight Navy',
    hexColor: '#1B2438',
    size: 'M',
    availableSizes: ['S', 'M', 'L', 'XL'],
    fabric: 'Double Mercerized Honeycomb Piqué',
    description: 'Tailored fit with ribbed collar, twin horn buttons, and tennis tail vent.',
    moodAffinity: ['confident', 'happy'],
    occasionAffinity: ['work', 'college', 'casual'],
    pbr: {
      color: '#1B2438',
      roughness: 0.55,
      metalness: 0.04,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('polo', '#1B2438', '#121928', 'M · POLO')
  },
  {
    id: 'shirt-kurta-cream',
    name: 'Contemporary Linen Short Kurta',
    category: 'shirts',
    subcategory: 'Short Kurta',
    brand: 'Komorebi Heritage',
    price: 49.00,
    currency: '£',
    colorName: 'Raw Ivory',
    hexColor: '#F5EFE0',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: 'Pure Washed European Flax Linen',
    description: 'Mandarin band collar with natural coconut shell buttons and side seam slits.',
    moodAffinity: ['calm', 'happy', 'chill'],
    occasionAffinity: ['casual', 'special', 'party'],
    pbr: {
      color: '#F5EFE0',
      roughness: 0.78,
      metalness: 0.02,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('kurta', '#F5EFE0', '#DDD3BD', 'L · KURTA')
  },
  {
    id: 'shirt-henley-oatmeal',
    name: 'Waffle Knit Henley T-Shirt',
    category: 'shirts',
    subcategory: 'Henley T-Shirt',
    brand: 'Nordic Craft',
    price: 32.00,
    currency: '£',
    colorName: 'Oatmeal Heather',
    hexColor: '#D8CEBE',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: 'Thermal Waffle Textured Cotton',
    description: 'Three-button bound placket with ribbed cuffs for easy seasonal layering.',
    moodAffinity: ['calm', 'tired', 'chill'],
    occasionAffinity: ['casual', 'home'],
    pbr: {
      color: '#D8CEBE',
      roughness: 0.90,
      metalness: 0.01,
      pattern: 'knit'
    },
    thumbnailUrl: makeGarmentSVG('henley', '#D8CEBE', '#BAAE9C', 'M · HENLEY')
  },
  {
    id: 'shirt-linen-sage',
    name: 'Airy Mediterranean Linen Shirt',
    category: 'shirts',
    subcategory: 'Linen Shirt',
    brand: 'Mediterranean Studio',
    price: 52.00,
    currency: '£',
    colorName: 'Earthy Sage Green',
    hexColor: '#68826F',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: '100% Breathable Washed Linen',
    description: 'Camp collar resort silhouette designed for warm breezy afternoons.',
    moodAffinity: ['happy', 'calm', 'chill'],
    occasionAffinity: ['casual', 'party', 'special'],
    pbr: {
      color: '#68826F',
      roughness: 0.80,
      metalness: 0.02,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('shirt', '#68826F', '#4C6352', 'M · LINEN')
  },
  {
    id: 'shirt-denim-western',
    name: 'Vintage Washed Denim Workshirt',
    category: 'shirts',
    subcategory: 'Denim Shirt',
    brand: 'FitMe Denim',
    price: 58.00,
    currency: '£',
    colorName: 'Faded Stonewash Indigo',
    hexColor: '#5D7C99',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: '7.5oz Japanese Kuroki Chambray Denim',
    description: 'Western yoke detailing, pearl snap buttons, and dual front envelope pockets.',
    moodAffinity: ['chill', 'confident'],
    occasionAffinity: ['casual', 'college'],
    pbr: {
      color: '#5D7C99',
      roughness: 0.75,
      metalness: 0.04,
      pattern: 'denim'
    },
    thumbnailUrl: makeGarmentSVG('shirt', '#5D7C99', '#425C75', 'L · DENIM')
  },
  {
    id: 'shirt-mandarin-terracotta',
    name: 'Mandarin Collar Casual Shirt',
    category: 'shirts',
    subcategory: 'Mandarin Shirt',
    brand: 'Atelier Sartorial',
    price: 46.00,
    currency: '£',
    colorName: 'Sunbaked Terracotta',
    hexColor: '#B85D3E',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: 'Fine Cotton Twill',
    description: 'Minimalist band collar with concealed front placket and curved hem.',
    moodAffinity: ['confident', 'happy'],
    occasionAffinity: ['work', 'special', 'casual'],
    pbr: {
      color: '#B85D3E',
      roughness: 0.58,
      metalness: 0.02,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('shirt', '#B85D3E', '#8E3F24', 'M · BAND')
  },
  {
    id: 'shirt-flannel-check',
    name: 'Brushed Cotton Flannel Shirt',
    category: 'shirts',
    subcategory: 'Flannel Shirt',
    brand: 'Nordic Heritage',
    price: 48.00,
    currency: '£',
    colorName: 'Forest Pine Plaid',
    hexColor: '#364F42',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: 'Double-Brushed Heavyweight Flannel',
    description: 'Classic lumberjack buffalo plaid with tortoiseshell buttons and warm hand-feel.',
    moodAffinity: ['calm', 'tired', 'chill'],
    occasionAffinity: ['casual', 'college', 'home'],
    pbr: {
      color: '#364F42',
      roughness: 0.88,
      metalness: 0.02,
      pattern: 'stripes'
    },
    thumbnailUrl: makeGarmentSVG('flannel', '#364F42', '#21332A', 'L · PLAID')
  },

  // ==========================================
  // 2. JACKETS & OUTERWEAR (5 Types + "None")
  // ==========================================
  {
    id: 'jacket-none',
    name: 'No Jacket (Shirt Only)',
    category: 'jackets',
    subcategory: 'None',
    brand: 'WearWise Studio',
    price: 0,
    currency: '£',
    colorName: 'Natural',
    hexColor: '#B8B5C4',
    size: 'N/A',
    availableSizes: ['Universal'],
    fabric: 'Bare Layer',
    description: 'Remove jacket layer to display your equipped shirt or t-shirt on its own.',
    moodAffinity: ['happy', 'calm', 'chill', 'tired', 'confident'],
    occasionAffinity: ['casual', 'home', 'work', 'sports', 'party'],
    pbr: {
      color: '#B8B5C4',
      roughness: 0.5,
      metalness: 0.0
    },
    thumbnailUrl: makeGarmentSVG('none', '#B8B5C4', '#FFFFFF', 'NO JACKET'),
    isNone: true
  },
  {
    id: 'jacket-leather-biker',
    name: 'Lambskin Leather Biker Jacket',
    category: 'jackets',
    subcategory: 'Leather Jacket',
    brand: 'Atelier Rebel',
    price: 185.00,
    currency: '£',
    colorName: 'Midnight Noir Leather',
    hexColor: '#16151A',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: 'Supple Full-Grain Lambskin with Silver Hardware',
    description: 'Iconic asymmetrical front zip, snap-down notch lapels, and quilted kidney panel.',
    moodAffinity: ['confident', 'chill'],
    occasionAffinity: ['party', 'special', 'casual'],
    pbr: {
      color: '#16151A',
      roughness: 0.28,
      metalness: 0.35,
      clearcoat: 0.4,
      pattern: 'leather',
      scaleOffset: [1.06, 1.02, 1.06]
    },
    thumbnailUrl: makeGarmentSVG('leather_jacket', '#16151A', '#2E2B38', 'L · LEATHER')
  },
  {
    id: 'jacket-denim-trucker',
    name: 'Vintage Washed Denim Trucker Jacket',
    category: 'jackets',
    subcategory: 'Denim Jacket',
    brand: 'FitMe Denim',
    price: 78.00,
    currency: '£',
    colorName: 'Classic Stonewash Indigo',
    hexColor: '#4A6A8A',
    size: 'L',
    availableSizes: ['S', 'M', 'L', 'XL'],
    fabric: '13.5oz Kuroki Rigid Denim with Copper Shanks',
    description: 'Standard boxy fit with front button placket and twin pointed chest flap pockets.',
    moodAffinity: ['chill', 'happy'],
    occasionAffinity: ['casual', 'college'],
    pbr: {
      color: '#4A6A8A',
      roughness: 0.82,
      metalness: 0.05,
      pattern: 'denim',
      scaleOffset: [1.05, 1.02, 1.05]
    },
    thumbnailUrl: makeGarmentSVG('denim_jacket', '#4A6A8A', '#314A63', 'L · TRUCKER')
  },
  {
    id: 'jacket-bomber-olive',
    name: 'MA-1 Flight Bomber Jacket',
    category: 'jackets',
    subcategory: 'Bomber Jacket',
    brand: 'Tactical Studio',
    price: 89.00,
    currency: '£',
    colorName: 'Satin Military Olive',
    hexColor: '#434A38',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: 'Flight Satin Nylon with Reversible Emergency Orange Lining',
    description: 'Ribbed knit collar and cuffs with signature zippered sleeve utility pocket.',
    moodAffinity: ['chill', 'confident'],
    occasionAffinity: ['casual', 'college', 'party'],
    pbr: {
      color: '#434A38',
      roughness: 0.45,
      metalness: 0.15,
      pattern: 'solid',
      scaleOffset: [1.06, 1.02, 1.06]
    },
    thumbnailUrl: makeGarmentSVG('bomber', '#434A38', '#2D3325', 'L · BOMBER')
  },
  {
    id: 'jacket-navy-blazer',
    name: 'Tailored Midnight Navy Suit Blazer',
    category: 'jackets',
    subcategory: 'Suit Blazer',
    brand: 'Savile Modern',
    price: 135.00,
    currency: '£',
    colorName: 'Midnight Navy',
    hexColor: '#1A2138',
    size: 'L',
    availableSizes: ['M', 'L', 'XL'],
    fabric: 'Italian Wool Twill with Silk Bemberg Lining',
    description: 'Precision cut single-breasted jacket with sculpted notch lapels and dual vents.',
    moodAffinity: ['confident'],
    occasionAffinity: ['work', 'special'],
    pbr: {
      color: '#1A2138',
      roughness: 0.35,
      metalness: 0.08,
      clearcoat: 0.3,
      scaleOffset: [1.06, 1.03, 1.06]
    },
    thumbnailUrl: makeGarmentSVG('blazer', '#1A2138', '#111728', 'L · SUIT')
  },
  {
    id: 'jacket-zip-hoodie',
    name: 'Heavy French Terry Zip-Up Hoodie',
    category: 'jackets',
    subcategory: 'Zip Hoodie',
    brand: 'FitMe Core',
    price: 62.00,
    currency: '£',
    colorName: 'Charcoal Heather',
    hexColor: '#28272E',
    size: 'L',
    availableSizes: ['S', 'M', 'L', 'XL'],
    fabric: '450gsm Heavyweight Combed Cotton Fleece',
    description: 'Double-layered structured hood with two-way silver zipper and split kangaroo pocket.',
    moodAffinity: ['chill', 'tired', 'calm'],
    occasionAffinity: ['casual', 'college', 'home'],
    pbr: {
      color: '#28272E',
      roughness: 0.88,
      metalness: 0.05,
      scaleOffset: [1.07, 1.03, 1.07]
    },
    thumbnailUrl: makeGarmentSVG('hoodie', '#28272E', '#19181D', 'L · FLEECE')
  },

  // ==========================================
  // 3. BOTTOMS (Jeans, Trousers, Cargos, Shorts)
  // ==========================================
  {
    id: 'bottom-baggy-jeans',
    name: 'Vintage Light Wash Baggy Jeans',
    category: 'bottoms',
    subcategory: 'Jeans',
    brand: 'FitMe Denim',
    price: 115.00,
    currency: '£',
    colorName: 'Sky Blue Wash',
    hexColor: '#98B8D1',
    size: '18 (32W)',
    availableSizes: ['16 (30W)', '18 (32W)', '20 (34W)'],
    fabric: '13.5oz Rigid Kuroki Selvedge Denim',
    description: 'Wide relaxed straight leg with subtle whisker fading and authentic copper rivets.',
    moodAffinity: ['chill', 'happy', 'tired'],
    occasionAffinity: ['casual', 'college', 'party'],
    pbr: {
      color: '#98B8D1',
      roughness: 0.82,
      metalness: 0.02,
      pattern: 'denim'
    },
    thumbnailUrl: makeGarmentSVG('jeans', '#98B8D1', '#7298B8', '32 · SELVEDGE')
  },
  {
    id: 'bottom-charcoal-trousers',
    name: 'Charcoal Pleated Suit Trousers',
    category: 'bottoms',
    subcategory: 'Trousers',
    brand: 'Atelier Sartorial',
    price: 85.00,
    currency: '£',
    colorName: 'Deep Graphite',
    hexColor: '#26252C',
    size: '32',
    availableSizes: ['30', '32', '34', '36'],
    fabric: 'Tropical Wool with Comfort Elastane Stretch',
    description: 'Single reverse pleat, clean tapered hem, and internal curtain waistband.',
    moodAffinity: ['confident', 'calm'],
    occasionAffinity: ['work', 'special', 'college'],
    pbr: {
      color: '#26252C',
      roughness: 0.65,
      metalness: 0.05,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('trousers', '#26252C', '#1A191E', '32 · PLEAT')
  },
  {
    id: 'bottom-cargo-olive',
    name: 'Relaxed Military Utility Cargos',
    category: 'bottoms',
    subcategory: 'Cargos',
    brand: 'Tactical Studio',
    price: 68.00,
    currency: '£',
    colorName: 'Field Olive',
    hexColor: '#474C3D',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: 'Ripstop Cotton with DWR Water Repellent',
    description: 'Ergonomic articulated knees with 6-pocket cargo system and adjustable cuff cords.',
    moodAffinity: ['chill', 'confident'],
    occasionAffinity: ['casual', 'sports', 'college'],
    pbr: {
      color: '#474C3D',
      roughness: 0.85,
      metalness: 0.04,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('cargos', '#474C3D', '#363A2E', 'M · CARGO')
  },
  {
    id: 'bottom-sand-shorts',
    name: 'Sand Relaxed Linen Walk Shorts',
    category: 'bottoms',
    subcategory: 'Shorts (Pants)',
    brand: 'Mediterranean Studio',
    price: 42.00,
    currency: '£',
    colorName: 'Warm Sandstone',
    hexColor: '#D2C5A0',
    size: 'M',
    availableSizes: ['S', 'M', 'L'],
    fabric: 'Linen Cotton Slub Blend',
    description: 'Elastic drawcord waist with 7-inch inseam walk shorts for warm weather comfort.',
    moodAffinity: ['happy', 'chill'],
    occasionAffinity: ['casual', 'home', 'sports'],
    pbr: {
      color: '#D2C5A0',
      roughness: 0.88,
      metalness: 0.01,
      pattern: 'solid'
    },
    thumbnailUrl: makeGarmentSVG('shorts', '#D2C5A0', '#B5A67E', 'M · SHORTS')
  },
  {
    id: 'bottom-raw-indigo',
    name: 'Raw Indigo Rigid Selvedge Jeans',
    category: 'bottoms',
    subcategory: 'Jeans',
    brand: 'FitMe Denim',
    price: 120.00,
    currency: '£',
    colorName: 'Deep Raw Indigo',
    hexColor: '#1F2A38',
    size: '32',
    availableSizes: ['30', '32', '34'],
    fabric: '15oz Unwashed Japanese Selvedge',
    description: 'Classic mid-rise straight leg cut with red selvedge ID ticking and button fly.',
    moodAffinity: ['confident', 'chill'],
    occasionAffinity: ['work', 'college', 'casual'],
    pbr: {
      color: '#1F2A38',
      roughness: 0.70,
      metalness: 0.03,
      pattern: 'denim'
    },
    thumbnailUrl: makeGarmentSVG('jeans', '#1F2A38', '#141C26', '32 · RAW')
  },

  // ==========================================
  // 4. SHOES (5 Types Required)
  // ==========================================
  {
    id: 'shoes-air-jordan',
    name: 'Air Jordan 1 Retro Low OG',
    category: 'shoes',
    subcategory: 'Jordans',
    brand: 'Jordan Core',
    price: 110.00,
    currency: '£',
    colorName: 'White / Black / Soft Coral',
    hexColor: '#F4F4F6',
    size: '38EU (UK 5)',
    availableSizes: ['38EU', '40EU', '42EU', '44EU'],
    fabric: 'Full-Grain Leather & Air-Cushioned Rubber Cupsole',
    description: 'Iconic encapsulated Air cushioning, stitched Swoosh, and padded low-cut collar.',
    moodAffinity: ['happy', 'chill', 'confident'],
    occasionAffinity: ['casual', 'college', 'sports'],
    pbr: {
      color: '#F4F4F6',
      roughness: 0.42,
      metalness: 0.08
    },
    thumbnailUrl: makeGarmentSVG('jordan', '#F4F4F6', '#1E1C21', '38EU · JORDAN', '#FF8978')
  },
  {
    id: 'shoes-adidas-ultraboost',
    name: 'Adidas Ultraboost Primeknit',
    category: 'shoes',
    subcategory: 'Adidas Runners',
    brand: 'Adidas Originals',
    price: 130.00,
    currency: '£',
    colorName: 'Core Black / Metallic',
    hexColor: '#232226',
    size: '42EU (UK 8)',
    availableSizes: ['40EU', '41EU', '42EU', '43EU', '44EU'],
    fabric: 'Primeknit Textile Upper & Continental Rubber Grip',
    description: 'High-energy return Boost midsole, lace cage stability, and molded heel counter.',
    moodAffinity: ['happy', 'chill', 'tired'],
    occasionAffinity: ['sports', 'casual', 'college'],
    pbr: {
      color: '#232226',
      roughness: 0.75,
      metalness: 0.12
    },
    thumbnailUrl: makeGarmentSVG('adidas', '#232226', '#FFFFFF', '42EU · ADIDAS')
  },
  {
    id: 'shoes-minimal-white',
    name: 'Minimalist Italian Leather Lows',
    category: 'shoes',
    subcategory: 'Sneakers',
    brand: 'Common Ground',
    price: 89.00,
    currency: '£',
    colorName: 'Monochrome Off-White',
    hexColor: '#F5F4F0',
    size: '42EU (UK 8)',
    availableSizes: ['40EU', '41EU', '42EU', '43EU', '44EU'],
    fabric: 'Italian Nappa Calfskin with Margom Rubber Sole',
    description: 'Gold-embossed serial stamp, tonal stitching, and vegetable-tanned lining.',
    moodAffinity: ['calm', 'confident'],
    occasionAffinity: ['work', 'special', 'casual'],
    pbr: {
      color: '#F5F4F0',
      roughness: 0.35,
      metalness: 0.05
    },
    thumbnailUrl: makeGarmentSVG('minimal_shoe', '#F5F4F0', '#FFFFFF', '42EU · NAPPA')
  },
  {
    id: 'shoes-formal-oxford',
    name: 'Handcrafted Leather Oxford Shoes',
    category: 'shoes',
    subcategory: 'Formal Shoes',
    brand: 'Churchill Sartorial',
    price: 165.00,
    currency: '£',
    colorName: 'Burnished Deep Mahogany',
    hexColor: '#4A2B1D',
    size: '42EU (UK 8)',
    availableSizes: ['41EU', '42EU', '43EU', '44EU'],
    fabric: 'Burnished French Box Calfskin & Goodyear Welted Leather Sole',
    description: 'Closed-lacing formal silhouette with perforated cap-toe brogue detailing.',
    moodAffinity: ['confident'],
    occasionAffinity: ['work', 'special'],
    pbr: {
      color: '#4A2B1D',
      roughness: 0.28,
      metalness: 0.15
    },
    thumbnailUrl: makeGarmentSVG('oxford_shoe', '#4A2B1D', '#2B170E', '42EU · OXFORD')
  },
  {
    id: 'shoes-chelsea-sand',
    name: 'Suede Chelsea Boots in Sand',
    category: 'shoes',
    subcategory: 'Boots',
    brand: 'Nordic Heritage',
    price: 135.00,
    currency: '£',
    colorName: 'Warm Camel Suede',
    hexColor: '#B08C62',
    size: '42EU (UK 8)',
    availableSizes: ['41EU', '42EU', '43EU'],
    fabric: 'Waterproof Oiled Suede with Natural Crepe Sole',
    description: 'Elasticated side gusset with woven pull tabs and comfortable crepe cushioning.',
    moodAffinity: ['confident', 'calm'],
    occasionAffinity: ['work', 'special', 'party'],
    pbr: {
      color: '#B08C62',
      roughness: 0.92,
      metalness: 0.02
    },
    thumbnailUrl: makeGarmentSVG('boot', '#B08C62', '#29243B', '42EU · SUEDE')
  },

  // ==========================================
  // 5. ACCESSORIES (Watches: 4 finishes, Glasses, Headwear)
  // ==========================================
  {
    id: 'acc-watch-silver',
    name: 'Silver Oystersteel Chronograph Watch',
    category: 'accessories',
    subcategory: 'Watch',
    brand: 'Geneva Horology',
    price: 260.00,
    currency: '£',
    colorName: 'Brushed Silver Steel',
    hexColor: '#D8DCE0',
    size: '40mm',
    availableSizes: ['38mm', '40mm', '42mm'],
    fabric: '904L Stainless Steel & Scratch-Resistant Sapphire Crystal',
    description: 'Brushed oystersteel bracelet with high-contrast monochrome panda dial and silver bezel.',
    moodAffinity: ['confident', 'calm'],
    occasionAffinity: ['work', 'special', 'casual'],
    pbr: {
      color: '#D8DCE0',
      roughness: 0.20,
      metalness: 0.95
    },
    thumbnailUrl: makeGarmentSVG('watch', '#D8DCE0', '#A8B0B8', '40mm · SILVER'),
    is3dModel: true
  },
  {
    id: 'acc-watch-gold',
    name: '18K Yellow Gold Luxury Chronograph',
    category: 'accessories',
    subcategory: 'Watch',
    brand: 'Geneva Horology',
    price: 320.00,
    currency: '£',
    colorName: '18K Yellow Gold',
    hexColor: '#D4AF37',
    size: '40mm',
    availableSizes: ['38mm', '40mm', '42mm'],
    fabric: 'Solid 18K Gold Fluted Bezel & Sapphire Glass',
    description: 'Fluted gold bezel, champagne sunburst dial, and triple-lock screw-down crown.',
    moodAffinity: ['confident', 'happy'],
    occasionAffinity: ['party', 'special', 'work'],
    pbr: {
      color: '#D4AF37',
      roughness: 0.18,
      metalness: 0.96
    },
    thumbnailUrl: makeGarmentSVG('watch', '#D4AF37', '#8E731F', '40mm · GOLD'),
    is3dModel: true
  },
  {
    id: 'acc-watch-black',
    name: 'Stealth Matte Black PVD Chronograph',
    category: 'accessories',
    subcategory: 'Watch',
    brand: 'Tactical Horology',
    price: 245.00,
    currency: '£',
    colorName: 'Stealth Matte Black',
    hexColor: '#18191C',
    size: '42mm',
    availableSizes: ['40mm', '42mm'],
    fabric: 'Diamond-Like Carbon (DLC) Coated Steel',
    description: 'Matte black case with gunmetal dial markers and crimson red chronograph needle.',
    moodAffinity: ['confident', 'chill'],
    occasionAffinity: ['casual', 'sports', 'college'],
    pbr: {
      color: '#18191C',
      roughness: 0.35,
      metalness: 0.85
    },
    thumbnailUrl: makeGarmentSVG('watch', '#18191C', '#33353B', '42mm · BLACK'),
    is3dModel: true
  },
  {
    id: 'acc-watch-rosegold',
    name: 'Everose Rose Gold Chronograph',
    category: 'accessories',
    subcategory: 'Watch',
    brand: 'Geneva Horology',
    price: 340.00,
    currency: '£',
    colorName: 'Everose Rose Gold',
    hexColor: '#C97D68',
    size: '40mm',
    availableSizes: ['38mm', '40mm', '42mm'],
    fabric: 'Warm Rose Gold Alloy with Ceramic Bezel',
    description: 'Rich warm copper-rose finish with chocolate dial and luminescent indices.',
    moodAffinity: ['confident', 'calm', 'happy'],
    occasionAffinity: ['special', 'party', 'work'],
    pbr: {
      color: '#C97D68',
      roughness: 0.18,
      metalness: 0.95
    },
    thumbnailUrl: makeGarmentSVG('watch', '#C97D68', '#8A4F3E', '40mm · ROSE GOLD'),
    is3dModel: true
  },
  {
    id: 'acc-glasses-none',
    name: 'None (No Glasses)',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Studio Wardrobe',
    price: 0,
    currency: '£',
    colorName: 'Clear View',
    hexColor: '#B8B5C4',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'No eyewear equipped',
    description: 'Remove eyewear and reveal natural face and eye clarity.',
    moodAffinity: ['happy', 'chill', 'calm', 'confident', 'tired'],
    occasionAffinity: ['casual', 'work', 'party', 'sports', 'home', 'college', 'special'],
    pbr: {
      color: '#FFFFFF',
      roughness: 1,
      metalness: 0
    },
    thumbnailUrl: makeGarmentSVG('none', '#B8B5C4', '#FFFFFF', 'NO GLASSES'),
    isNone: true
  },
  {
    id: 'acc-sunglasses-dual',
    name: 'Designer Dual-Lens Acetate Wayfarer',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Sun Studio',
    price: 45.00,
    currency: '£',
    colorName: 'Onyx Black / G-15 Green',
    hexColor: '#18171B',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'Hand-beveled bio-acetate with UV400 polarized bottle-green lenses',
    description: 'Custom sculpted acetate frame with beveled rims, 5-barrel hinges, gold bridge, and semi-transparent lenses.',
    moodAffinity: ['happy', 'chill', 'confident'],
    occasionAffinity: ['casual', 'party', 'sports'],
    pbr: {
      color: '#18171B',
      roughness: 0.18,
      metalness: 0.2
    },
    thumbnailUrl: makeGarmentSVG('glasses', '#18171B', '#15241C', 'WAYFARER · G-15')
  },
  {
    id: 'acc-glasses-aviator',
    name: '18K Gold Double-Bridge Aviator',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Aerolux Paris',
    price: 68.00,
    currency: '£',
    colorName: 'Brushed Gold / Amber Gradient',
    hexColor: '#D4AF37',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'Ultra-lightweight titanium alloy with 18k gold plate and amber gradient lenses',
    description: 'Iconic teardrop aviator silhouette with brow bar, adjustable silicone nose pads, and bayonet temples.',
    moodAffinity: ['confident', 'happy'],
    occasionAffinity: ['casual', 'party', 'special'],
    pbr: {
      color: '#D4AF37',
      roughness: 0.15,
      metalness: 0.95
    },
    thumbnailUrl: makeGarmentSVG('glasses', '#D4AF37', '#2A1F14', 'AVIATOR · 18K GOLD')
  },
  {
    id: 'acc-glasses-clubmaster',
    name: 'Retro Browline Clubmaster Specs',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Heritage Eyewear',
    price: 52.00,
    currency: '£',
    colorName: 'Obsidian & Silver / Smoke Grey',
    hexColor: '#1A181C',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'Italian cellulose acetate browline with polished silver monel eyewire',
    description: 'Mid-century intellectual styling with silver wire rims, platinum rivets, and smoke tinted lenses.',
    moodAffinity: ['confident', 'calm'],
    occasionAffinity: ['work', 'college', 'special'],
    pbr: {
      color: '#1A181C',
      roughness: 0.16,
      metalness: 0.2
    },
    thumbnailUrl: makeGarmentSVG('glasses', '#1A181C', '#1C1D24', 'CLUBMASTER')
  },
  {
    id: 'acc-glasses-tortoise-round',
    name: 'Havana Tortoise Round Panto Spectacles',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Sartorial Optics',
    price: 48.00,
    currency: '£',
    colorName: 'Warm Tortoise / Blue-Light Filter',
    hexColor: '#5C3822',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'Custom acetate with keyhole bridge and blue-light anti-reflective optical glass',
    description: 'Round panto profile with keyhole bridge, clear anti-reflective lenses, and tortoiseshell acetate.',
    moodAffinity: ['chill', 'calm', 'tired'],
    occasionAffinity: ['work', 'college', 'home'],
    pbr: {
      color: '#5C3822',
      roughness: 0.22,
      metalness: 0.1
    },
    thumbnailUrl: makeGarmentSVG('glasses', '#5C3822', '#EBF4F8', 'ROUND · CLEAR AR')
  },
  {
    id: 'acc-glasses-minimal',
    name: 'Gunmetal Titanium Minimalist Frames',
    category: 'accessories',
    subcategory: 'Glasses',
    brand: 'Nordic Minimal',
    price: 60.00,
    currency: '£',
    colorName: 'Matte Gunmetal / Crystal Clear',
    hexColor: '#3A3C42',
    size: 'Universal',
    availableSizes: ['Universal'],
    fabric: 'Japanese beta-titanium wire rim with ultra-clear scratch-resistant lenses',
    description: 'Featherlight minimalist rectangular profile with clean geometric lines and zero eye obstruction.',
    moodAffinity: ['calm', 'confident'],
    occasionAffinity: ['work', 'college', 'casual'],
    pbr: {
      color: '#3A3C42',
      roughness: 0.3,
      metalness: 0.9
    },
    thumbnailUrl: makeGarmentSVG('glasses', '#3A3C42', '#EDF6FA', 'TITANIUM · CLEAR')
  },
  {
    id: 'acc-fedora-olive',
    name: 'Classic Felt Fedora Hat',
    category: 'accessories',
    subcategory: 'Headwear',
    brand: 'Atelier Sartorial',
    price: 55.00,
    currency: '£',
    colorName: 'Vintage Olive Felt',
    hexColor: '#3B4536',
    size: '58cm',
    availableSizes: ['56cm', '58cm', '60cm'],
    fabric: '100% Wool Felt with Grosgrain Ribbon Band',
    description: 'Structured teardrop crown with snap-brim edge and internal moisture ribbon.',
    moodAffinity: ['confident', 'calm'],
    occasionAffinity: ['special', 'party', 'work'],
    pbr: {
      color: '#3B4536',
      roughness: 0.90,
      metalness: 0.02
    },
    thumbnailUrl: makeGarmentSVG('fedora', '#3B4536', '#262D23', 'WOOL FEDORA')
  },
  {
    id: 'acc-headwear-none',
    name: 'No Headwear / Natural Hair',
    category: 'accessories',
    subcategory: 'Headwear',
    brand: 'WearWise Studio',
    price: 0,
    currency: '£',
    colorName: 'Natural',
    hexColor: '#B8B5C4',
    size: 'N/A',
    availableSizes: ['Universal'],
    fabric: 'Bare Head',
    description: 'Display your chosen hairstyle naturally without any cap or hat.',
    moodAffinity: ['happy', 'calm', 'chill', 'tired', 'confident'],
    occasionAffinity: ['casual', 'work', 'college', 'party'],
    pbr: {
      color: '#B8B5C4',
      roughness: 0.5,
      metalness: 0.0
    },
    thumbnailUrl: makeGarmentSVG('none', '#B8B5C4', '#FFFFFF', 'NO HAT'),
    isNone: true
  }
];
