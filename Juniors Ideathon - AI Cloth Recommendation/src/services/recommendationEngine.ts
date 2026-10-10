import { Garment, MoodType, OccasionType, WeatherData, EquippedOutfit } from '../types/fashion';
import { GARMENTS } from '../data/garments';

export interface RecommendationResult {
  outfit: EquippedOutfit;
  name: string;
  explanation: string;
  vibeScore: number;
  comfortRating: number;
  tags: string[];
}

export function recommendOutfitForMood(
  mood: MoodType,
  occasion: OccasionType = 'casual',
  weather?: WeatherData,
  recentlyWornIds: string[] = []
): RecommendationResult {
  const shirts = GARMENTS.filter(g => g.category === 'shirts' || g.category === 'tops');
  const jackets = GARMENTS.filter(g => g.category === 'jackets' && !g.isNone);
  const bottoms = GARMENTS.filter(g => g.category === 'bottoms');
  const shoes = GARMENTS.filter(g => g.category === 'shoes');
  const accessories = GARMENTS.filter(g => g.category === 'accessories');

  // Scoring function based on affinities, weather suitability, and anti-repeat penalty
  const scoreGarment = (g: Garment): number => {
    let score = 10;

    // Mood match
    if (g.moodAffinity.includes(mood)) {
      score += 25;
    }

    // Occasion match
    if (g.occasionAffinity.includes(occasion)) {
      score += 20;
    }

    // Weather adjustments
    if (weather) {
      if (weather.temp < 16) {
        // Cold: reward heavy layers, jackets, boots
        if (g.id.includes('leather') || g.id.includes('blazer') || g.id.includes('hoodie') || g.id.includes('boot')) score += 18;
        if (g.id.includes('shorts')) score -= 30;
      } else if (weather.temp > 24) {
        // Warm: reward linen, tees, shorts
        if (g.id.includes('tee') || g.id.includes('shorts') || g.id.includes('linen') || g.id.includes('kurta')) score += 18;
        if (g.id.includes('wool') || g.id.includes('leather') || g.id.includes('heavy')) score -= 25;
      }
    }

    // Repeat penalty
    if (recentlyWornIds.includes(g.id)) {
      score -= 15;
    }

    return score;
  };

  const sortedShirts = [...shirts].sort((a, b) => scoreGarment(b) - scoreGarment(a));
  const sortedJackets = [...jackets].sort((a, b) => scoreGarment(b) - scoreGarment(a));
  const sortedBottoms = [...bottoms].sort((a, b) => scoreGarment(b) - scoreGarment(a));
  const sortedShoes = [...shoes].sort((a, b) => scoreGarment(b) - scoreGarment(a));
  const sortedAccessories = [...accessories].sort((a, b) => scoreGarment(b) - scoreGarment(a));

  const selectedShirt = sortedShirts[0] || shirts[0];
  const selectedJacket = (weather && weather.temp < 22) ? (sortedJackets[0] || null) : null;
  const selectedTop = selectedShirt;
  const selectedBottom = sortedBottoms[0] || bottoms[0];
  const selectedShoes = sortedShoes[0] || shoes[0];
  const selectedAccessory = sortedAccessories[0];

  // Generate articulate, editorial explanation
  let name = '';
  let explanation = '';
  let tags: string[] = [];

  switch (mood) {
    case 'happy':
      name = 'Sunny Horizon Ensemble';
      explanation = `Your Happy vibe pairs the ${selectedTop.name} with ${selectedBottom.name} to encourage open, energetic movement and social vibrancy.`;
      tags = ['High Dopamine', 'Light Palette', 'Breezy Fit'];
      break;
    case 'confident':
      name = 'Architectural Focus Silhouette';
      explanation = `Your Confident styling balances the ${selectedTop.name} with structured ${selectedBottom.name} for an effortlessly composed, authoritative presence.`;
      tags = ['Defined Lines', 'Subtle Power', 'High Contrast'];
      break;
    case 'calm':
      name = 'Mineral Serenity Uniform';
      explanation = `Your Calm state calls for the tactile grounding of the ${selectedTop.name} alongside ${selectedBottom.name}, minimizing sensory friction.`;
      tags = ['Low Contrast', 'Slub Cotton', 'Mindful Ease'];
      break;
    case 'tired':
      name = 'Cocoon Fleece Sanctuary';
      explanation = `Your Tired moment leans into the zero-effort cocoon of the ${selectedTop.name} and relaxed ${selectedBottom.name} for soothing comfort.`;
      tags = ['Zero Resistance', 'Thermal Ease', 'Soft French Terry'];
      break;
    case 'chill':
      name = 'Laidback City Cruiser';
      explanation = `Your Chill mood blends the relaxed drop of the ${selectedTop.name} with ${selectedBottom.name} and clean kicks for easy urban wandering.`;
      tags = ['Boxy Cut', 'Vintage Wash', 'Effortless Street'];
      break;
  }

  const weatherNote = weather 
    ? ` Perfectly tuned for ${weather.temp}°C ${weather.conditionLabel.toLowerCase()}.`
    : '';

  return {
    outfit: {
      shirt: selectedShirt,
      jacket: selectedJacket,
      tops: selectedTop,
      bottoms: selectedBottom,
      shoes: selectedShoes,
      accessories: selectedAccessory
    },
    name,
    explanation: explanation + weatherNote,
    vibeScore: 96,
    comfortRating: mood === 'tired' || mood === 'chill' ? 98 : 94,
    tags
  };
}
