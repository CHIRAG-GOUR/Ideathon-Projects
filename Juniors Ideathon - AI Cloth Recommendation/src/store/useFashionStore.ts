import { useState, useEffect } from 'react';
import { 
  MoodType, 
  OccasionType, 
  WeatherData, 
  EquippedOutfit, 
  Garment, 
  GarmentCategory, 
  SavedLook, 
  WeeklyHistoryItem, 
  AvatarCustomization 
} from '../types/fashion';
import { GARMENTS } from '../data/garments';
import { recommendOutfitForMood, RecommendationResult } from '../services/recommendationEngine';
import { sound } from '../services/audioService';

const STORAGE_KEY_SAVED = 'wearwise_saved_looks_v2';
const STORAGE_KEY_HISTORY = 'wearwise_weekly_history_v2';
const STORAGE_KEY_CUSTOM = 'wearwise_avatar_custom_v2';

// Initial default equipped outfit
const defaultShirt = GARMENTS.find(g => g.id === 'shirt-oxford-white') || GARMENTS[0];
const defaultJacket = GARMENTS.find(g => g.id === 'jacket-navy-blazer') || null;
const defaultBottom = GARMENTS.find(g => g.id === 'bottom-baggy-jeans') || GARMENTS[16];
const defaultShoes = GARMENTS.find(g => g.id === 'shoes-air-jordan') || GARMENTS[21];
const defaultWatch = GARMENTS.find(g => g.id === 'acc-watch-gold');
const defaultGlasses = GARMENTS.find(g => g.id === 'acc-sunglasses-dual');

const initialOutfit: EquippedOutfit = {
  shirt: defaultShirt,
  jacket: defaultJacket,
  tops: defaultShirt,
  bottoms: defaultBottom,
  shoes: defaultShoes,
  accessories: defaultWatch,
  watch: defaultWatch,
  glasses: defaultGlasses,
  headwear: undefined
};

const initialWeather: WeatherData = {
  temp: 21,
  condition: 'partly-cloudy',
  conditionLabel: 'Partly Sunny',
  comfortIndex: 98,
  advice: 'Mild ambient temperature ideal for breathable layers and comfortable tailoring.'
};

const initialWeeklyHistory: WeeklyHistoryItem[] = [
  { day: 'Mon', dateStr: 'Oct 6', outfit: { shirt: GARMENTS[0], bottoms: GARMENTS[16], shoes: GARMENTS[21] }, mood: 'confident', occasion: 'work', isWorn: true },
  { day: 'Tue', dateStr: 'Oct 7', outfit: { shirt: GARMENTS[1], bottoms: GARMENTS[17], shoes: GARMENTS[22] }, mood: 'calm', occasion: 'college', isWorn: true },
  { day: 'Wed', dateStr: 'Oct 8', outfit: { shirt: GARMENTS[2], bottoms: GARMENTS[16], shoes: GARMENTS[21] }, mood: 'happy', occasion: 'casual', isWorn: true },
  { day: 'Thu', dateStr: 'Oct 9', outfit: { shirt: GARMENTS[3], bottoms: GARMENTS[18], shoes: GARMENTS[22] }, mood: 'confident', occasion: 'work', isWorn: true },
  { day: 'Fri', dateStr: 'Oct 10', outfit: initialOutfit, mood: 'chill', occasion: 'casual', isWorn: false },
  { day: 'Sat', dateStr: 'Oct 11', outfit: { shirt: GARMENTS[4], bottoms: GARMENTS[19], shoes: GARMENTS[21] }, mood: 'happy', occasion: 'party', isWorn: false },
  { day: 'Sun', dateStr: 'Oct 12', outfit: { shirt: GARMENTS[1], bottoms: GARMENTS[16], shoes: GARMENTS[21] }, mood: 'tired', occasion: 'home', isWorn: false }
];

export interface FashionStoreState {
  currentMood: MoodType;
  currentOccasion: OccasionType;
  weather: WeatherData;
  equipped: EquippedOutfit;
  savedLooks: SavedLook[];
  weeklyHistory: WeeklyHistoryItem[];
  avatarCustomization: AvatarCustomization;
  activeTab: 'fitting-room' | 'avatar' | 'mood-studio' | 'saved' | 'history' | 'pricing';
  cartItemIds: string[];
  isDragging: boolean;
  draggedGarment: Garment | null;
  cameraView: 'default' | 'closeup' | 'back' | 'low' | 'upper' | 'shoes';
  recommendation: RecommendationResult;
  currentPose: 'runway-stride' | 'hand-on-hip' | 'lapel-check' | 'casual-lean' | 'gq-turn';
  isPoseAutoFlow: boolean;

  // Actions
  setMood: (mood: MoodType, autoEquip?: boolean) => void;
  setOccasion: (occ: OccasionType) => void;
  setWeather: (w: WeatherData) => void;
  equipGarment: (garment: Garment) => void;
  unequipCategory: (category: GarmentCategory) => void;
  removeJacket: () => void;
  resetOutfit: () => void;
  saveCurrentLook: (name?: string) => SavedLook;
  deleteSavedLook: (id: string) => void;
  applySavedLook: (look: SavedLook) => void;
  markDayWorn: (day: string) => void;
  toggleCart: (garmentId: string) => void;
  updateAvatarCustomization: (updates: Partial<AvatarCustomization>) => void;
  setActiveTab: (tab: 'fitting-room' | 'avatar' | 'mood-studio' | 'saved' | 'history' | 'pricing') => void;
  setDraggingGarment: (garment: Garment | null) => void;
  setCameraView: (view: 'default' | 'closeup' | 'back' | 'low' | 'upper' | 'shoes') => void;
  setPose: (pose: 'runway-stride' | 'hand-on-hip' | 'lapel-check' | 'casual-lean' | 'gq-turn') => void;
  togglePoseAutoFlow: () => void;
}

let state: FashionStoreState;
const listeners = new Set<() => void>();

function notify() {
  if (typeof window !== 'undefined') {
    (window as any).__wearwiseStore = state;
  }
  listeners.forEach(fn => fn());
}

const savedFromStorage: SavedLook[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'saved-look-1',
      name: 'Friday Tailored Street',
      timestamp: Date.now() - 86400000,
      mood: 'chill',
      occasion: 'casual',
      equipped: initialOutfit,
      note: 'Signature layered outfit with navy blazer, oxford poplin shirt and light wash jeans.'
    }
  ];
})();

const historyFromStorage: WeeklyHistoryItem[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initialWeeklyHistory;
})();

const customFromStorage: AvatarCustomization = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    skinTone: '#EAC8B0',
    hairColor: '#362B28',
    hairstyle: 'none',
    headwearType: 'none',
    headwearColor: '#1F1E24',
    beardVisible: true,
    beardColor: '#362B28',
    eyeColor: '#4A6984',
    postureBias: 0.1
  };
})();

const initialRec = recommendOutfitForMood('chill', 'casual', initialWeather);

state = {
  currentMood: 'chill',
  currentOccasion: 'casual',
  weather: initialWeather,
  equipped: initialOutfit,
  savedLooks: savedFromStorage,
  weeklyHistory: historyFromStorage,
  avatarCustomization: customFromStorage,
  activeTab: 'fitting-room',
  cartItemIds: ['shirt-oxford-white', 'jacket-navy-blazer', 'bottom-baggy-jeans'],
  isDragging: false,
  draggedGarment: null,
  cameraView: 'default',
  recommendation: initialRec,
  currentPose: 'runway-stride',
  isPoseAutoFlow: false,

  setMood: (mood: MoodType, autoEquip = false) => {
    sound.playClick();
    const rec = recommendOutfitForMood(mood, state.currentOccasion, state.weather);
    state = {
      ...state,
      currentMood: mood,
      recommendation: rec,
      equipped: autoEquip ? rec.outfit : state.equipped
    };
    notify();
  },

  setOccasion: (occ: OccasionType) => {
    sound.playClick();
    const rec = recommendOutfitForMood(state.currentMood, occ, state.weather);
    state = {
      ...state,
      currentOccasion: occ,
      recommendation: rec
    };
    notify();
  },

  setWeather: (w: WeatherData) => {
    const rec = recommendOutfitForMood(state.currentMood, state.currentOccasion, w);
    state = {
      ...state,
      weather: w,
      recommendation: rec
    };
    notify();
  },

  equipGarment: (garment: Garment) => {
    sound.playEquip();
    const updated = { ...state.equipped };

    if (garment.category === 'shirts') {
      updated.shirt = garment;
      updated.tops = garment; // keep tops in sync
    } else if (garment.category === 'jackets') {
      if (garment.isNone || garment.id === 'jacket-none') {
        updated.jacket = null;
      } else {
        updated.jacket = garment;
      }
    } else if (garment.category === 'tops') {
      updated.shirt = garment;
      updated.tops = garment;
    } else if (garment.category === 'bottoms') {
      updated.bottoms = garment;
    } else if (garment.category === 'shoes') {
      updated.shoes = garment;
    } else if (garment.category === 'accessories') {
      if (garment.subcategory === 'Watch') {
        updated.watch = garment;
        updated.accessories = garment;
      } else if (garment.subcategory === 'Glasses') {
        if (garment.isNone) {
          delete updated.glasses;
        } else {
          updated.glasses = garment;
        }
      } else if (garment.subcategory === 'Headwear') {
        if (garment.isNone || garment.id === 'acc-headwear-none') {
          delete updated.headwear;
        } else {
          updated.headwear = garment;
        }
      } else {
        updated.accessories = garment;
      }
    }

    state = {
      ...state,
      equipped: updated,
      isDragging: false,
      draggedGarment: null
    };
    notify();
  },

  removeJacket: () => {
    sound.playClick();
    const updated = { ...state.equipped };
    updated.jacket = null;
    state = {
      ...state,
      equipped: updated
    };
    notify();
  },

  unequipCategory: (category: GarmentCategory) => {
    sound.playClick();
    const updated = { ...state.equipped };
    if (category === 'jackets') {
      updated.jacket = null;
    } else if (category === 'shirts' || category === 'tops') {
      delete updated.shirt;
      delete updated.tops;
    } else if (category === 'bottoms') {
      delete updated.bottoms;
    } else if (category === 'shoes') {
      delete updated.shoes;
    } else if (category === 'accessories') {
      delete updated.accessories;
      delete updated.watch;
      delete updated.glasses;
      delete updated.headwear;
    }
    state = {
      ...state,
      equipped: updated
    };
    notify();
  },

  resetOutfit: () => {
    sound.playClick();
    state = {
      ...state,
      equipped: initialOutfit
    };
    notify();
  },

  saveCurrentLook: (name?: string) => {
    sound.playChime();
    const newLook: SavedLook = {
      id: `saved-${Date.now()}`,
      name: name || `${state.currentMood.toUpperCase()} · ${state.equipped.jacket?.name || state.equipped.shirt?.name || 'Look'}`,
      timestamp: Date.now(),
      mood: state.currentMood,
      occasion: state.currentOccasion,
      equipped: { ...state.equipped }
    };

    const nextSaved = [newLook, ...state.savedLooks];
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(nextSaved));
    } catch {}

    state = {
      ...state,
      savedLooks: nextSaved
    };
    notify();
    return newLook;
  },

  deleteSavedLook: (id: string) => {
    sound.playClick();
    const nextSaved = state.savedLooks.filter(s => s.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(nextSaved));
    } catch {}
    state = {
      ...state,
      savedLooks: nextSaved
    };
    notify();
  },

  applySavedLook: (look: SavedLook) => {
    sound.playEquip();
    state = {
      ...state,
      equipped: { ...look.equipped },
      currentMood: look.mood,
      currentOccasion: look.occasion
    };
    notify();
  },

  markDayWorn: (day: string) => {
    sound.playClick();
    const nextHistory = state.weeklyHistory.map(item => 
      item.day === day ? { ...item, isWorn: !item.isWorn } : item
    );
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
    } catch {}
    state = {
      ...state,
      weeklyHistory: nextHistory
    };
    notify();
  },

  toggleCart: (garmentId: string) => {
    sound.playClick();
    const exists = state.cartItemIds.includes(garmentId);
    const next = exists 
      ? state.cartItemIds.filter(id => id !== garmentId)
      : [...state.cartItemIds, garmentId];
    state = {
      ...state,
      cartItemIds: next
    };
    notify();
  },

  updateAvatarCustomization: (updates: Partial<AvatarCustomization>) => {
    const nextCustom = { ...state.avatarCustomization, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(nextCustom));
    } catch {}
    state = {
      ...state,
      avatarCustomization: nextCustom
    };
    notify();
  },

  setActiveTab: (tab) => {
    sound.playClick();
    state = { ...state, activeTab: tab };
    notify();
  },

  setDraggingGarment: (garment: Garment | null) => {
    state = {
      ...state,
      isDragging: !!garment,
      draggedGarment: garment
    };
    notify();
  },

  setCameraView: (view) => {
    sound.playClick();
    state = { ...state, cameraView: view };
    notify();
  },

  setPose: (pose) => {
    sound.playClick();
    state = { ...state, currentPose: pose, isPoseAutoFlow: false };
    notify();
  },

  togglePoseAutoFlow: () => {
    sound.playClick();
    state = { ...state, isPoseAutoFlow: !state.isPoseAutoFlow };
    notify();
  }
};

if (typeof window !== 'undefined') {
  (window as any).__wearwiseStore = state;
}

export function useFashionStore(): FashionStoreState {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick(t => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return state;
}
