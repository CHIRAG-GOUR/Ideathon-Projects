export type MoodType = 'happy' | 'calm' | 'confident' | 'tired' | 'chill';

export type GarmentCategory = 'shirts' | 'jackets' | 'bottoms' | 'shoes' | 'accessories' | 'tops';

export interface GarmentPBR {
  color: string;
  roughness: number;
  metalness: number;
  pattern?: 'solid' | 'knit' | 'denim' | 'stripes' | 'corduroy' | 'graphic' | 'leather';
  specularColor?: string;
  sheen?: number;
  clearcoat?: number;
  scaleOffset?: [number, number, number];
}

export interface Garment {
  id: string;
  name: string;
  category: GarmentCategory;
  subcategory?: string;
  brand: string;
  price: number;
  currency: string;
  colorName: string;
  hexColor: string;
  size: string;
  availableSizes: string[];
  fabric: string;
  description: string;
  moodAffinity: MoodType[];
  occasionAffinity: string[];
  pbr: GarmentPBR;
  thumbnailUrl: string;
  is3dModel?: boolean;
  modelUrl?: string;
  isNone?: boolean;
}

export interface EquippedOutfit {
  shirt?: Garment;
  jacket?: Garment | null;
  tops?: Garment;
  bottoms?: Garment;
  shoes?: Garment;
  accessories?: Garment;
  watch?: Garment;
  glasses?: Garment;
  headwear?: Garment;
}

export type OccasionType = 
  | 'college' 
  | 'work' 
  | 'casual' 
  | 'party' 
  | 'sports' 
  | 'home' 
  | 'special';

export interface OccasionInfo {
  id: OccasionType;
  label: string;
  iconName: string;
  description: string;
}

export interface WeatherData {
  temp: number;
  condition: 'sunny' | 'partly-cloudy' | 'rainy' | 'breezy' | 'cold';
  conditionLabel: string;
  comfortIndex: number; // 0 - 100%
  advice: string;
}

export interface SavedLook {
  id: string;
  name: string;
  timestamp: number;
  mood: MoodType;
  occasion: OccasionType;
  equipped: EquippedOutfit;
  note?: string;
}

export interface WeeklyHistoryItem {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  dateStr: string;
  outfit: EquippedOutfit;
  mood: MoodType;
  occasion: OccasionType;
  isWorn: boolean;
}

export interface AvatarCustomization {
  skinTone: string;
  hairColor?: string;
  hairstyle?: string;
  headwearType: 'none' | 'fedora';
  headwearColor?: string;
  beardVisible: boolean;
  beardColor: string;
  eyeColor: string;
  postureBias: number; // -1 (slouched) to 1 (upright)
}

export interface MoodConfig {
  id: MoodType;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
  bgBadge: string;
  borderBadge: string;
  description: string;
  recommendedColors: string[];
  psychologyNote: string;
  expression: {
    smile: number;
    open: number;
    browInnerUp?: number;
    eyeBlinkLeft?: number;
    eyeBlinkRight?: number;
  };
  posture: {
    headRot: [number, number, number];
    neckRot: [number, number, number];
    spineRot: [number, number, number];
    spine1Rot: [number, number, number];
    leftArmRot: [number, number, number];
    rightArmRot: [number, number, number];
    leftForeArmRot: [number, number, number];
    rightForeArmRot: [number, number, number];
    hipsOffset?: [number, number, number];
  };
}
