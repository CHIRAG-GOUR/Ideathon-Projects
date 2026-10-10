import { MoodConfig } from '../types/fashion';

export const MOODS: Record<string, MoodConfig> = {
  happy: {
    id: 'happy',
    name: 'Happy',
    emoji: '✨',
    tagline: 'Radiant, expressive & playful energy',
    color: '#FF8978',
    bgBadge: 'bg-coral-light text-coral-dark',
    borderBadge: 'border-coral/30',
    description: 'Vibrant palettes, light textures and relaxed silhouettes that spark enthusiasm.',
    recommendedColors: ['#FF8978', '#FFF0C7', '#398C83', '#E9E4FF'],
    psychologyNote: 'High dopamine styling: warm tones stimulate serotonin, openness in posture inspires social connection.',
    expression: {
      smile: 0.92,
      open: 0.15,
    },
    posture: {
      headRot: [-0.04, 0.05, 0.02],
      neckRot: [-0.02, 0.02, 0.01],
      spineRot: [0.02, 0.02, 0.0],
      spine1Rot: [0.02, 0.0, 0.01],
      // Open upbeat arms, not straight out
      leftArmRot: [0.15, 0.05, -0.95],
      rightArmRot: [0.15, -0.05, 0.95],
      leftForeArmRot: [-0.55, 0.1, -0.15],
      rightForeArmRot: [-0.55, -0.1, 0.15],
    }
  },
  calm: {
    id: 'calm',
    name: 'Calm',
    emoji: '🌿',
    tagline: 'Serene, centered & mindful balance',
    color: '#398C83',
    bgBadge: 'bg-mint text-teal-dark',
    borderBadge: 'border-teal/30',
    description: 'Earthy slub fabrics, organic linens and gentle neutral tones that ground your focus.',
    recommendedColors: ['#DDF3E7', '#FAF8F4', '#777484', '#398C83'],
    psychologyNote: 'Low visual noise: sage and warm creams lower cortisol and promote deep cognitive ease.',
    expression: {
      smile: 0.18,
      open: 0.02,
    },
    posture: {
      headRot: [0.01, 0.0, 0.0],
      neckRot: [0.0, 0.0, 0.0],
      spineRot: [0.0, 0.0, 0.0],
      spine1Rot: [0.0, 0.0, 0.0],
      // Balanced relaxed arms straight down along body
      leftArmRot: [0.08, 0.02, -1.22],
      rightArmRot: [0.08, -0.02, 1.22],
      leftForeArmRot: [-0.25, 0.0, -0.1],
      rightForeArmRot: [-0.25, 0.0, 0.1],
    }
  },
  confident: {
    id: 'confident',
    name: 'Confident',
    emoji: '⚡',
    tagline: 'Sharp silhouettes, structured poise & intent',
    color: '#29243B',
    bgBadge: 'bg-plum text-white',
    borderBadge: 'border-plum/40',
    description: 'Clean collars, tailored cuts and purposeful contrasts that assert presence with subtlety.',
    recommendedColors: ['#29243B', '#FAF8F4', '#FF8978', '#777484'],
    psychologyNote: 'Architectural lines: high-contrast dark accents and defined shoulders enhance perceived authority.',
    expression: {
      smile: 0.45,
      open: 0.03,
    },
    posture: {
      headRot: [-0.08, -0.03, -0.01],
      neckRot: [-0.04, -0.01, 0.0],
      spineRot: [-0.05, 0.0, 0.0],
      spine1Rot: [-0.03, 0.0, 0.0],
      // High fashion runway pose: left hand poised near hip, right arm clean at side
      leftArmRot: [0.12, 0.1, -1.05],
      rightArmRot: [0.05, -0.08, 1.22],
      leftForeArmRot: [-0.65, 0.3, -0.2],
      rightForeArmRot: [-0.3, -0.05, 0.1],
    }
  },
  tired: {
    id: 'tired',
    name: 'Tired',
    emoji: '☁️',
    tagline: 'Soft enveloping fleece & zero-friction ease',
    color: '#777484',
    bgBadge: 'bg-border-light text-plum-muted',
    borderBadge: 'border-border-light',
    description: 'Plush oversized hoodies, brushed cottons and comforting shapes for effortless rest.',
    recommendedColors: ['#FAF8F4', '#EAE6EE', '#777484', '#E9E4FF'],
    psychologyNote: 'Sensory decompression: cocooning tactile textures offer reassurance on low-battery days.',
    expression: {
      smile: 0.02,
      open: 0.01,
    },
    posture: {
      headRot: [0.14, 0.02, 0.02],
      neckRot: [0.08, 0.01, 0.01],
      spineRot: [0.08, 0.0, 0.0],
      spine1Rot: [0.06, 0.0, 0.0],
      // Loose dangling arms
      leftArmRot: [0.05, 0.0, -1.28],
      rightArmRot: [0.05, 0.0, 1.28],
      leftForeArmRot: [-0.15, 0.0, -0.05],
      rightForeArmRot: [-0.15, 0.0, 0.05],
    }
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    emoji: '🌊',
    tagline: 'Casual streetwear & effortless nonchalance',
    color: '#E9E4FF',
    bgBadge: 'bg-lavender text-plum',
    borderBadge: 'border-lavender-dark/50',
    description: 'Wide-leg jeans, relaxed tees, boxy layers and retro low sneakers for everyday flow.',
    recommendedColors: ['#E9E4FF', '#398C83', '#FAF8F4', '#29243B'],
    psychologyNote: 'Flow state comfort: non-restrictive garments reduce friction and promote spontaneous creativity.',
    expression: {
      smile: 0.32,
      open: 0.04,
    },
    posture: {
      headRot: [-0.02, 0.08, 0.04],
      neckRot: [-0.01, 0.04, 0.01],
      spineRot: [0.02, 0.04, 0.02],
      spine1Rot: [0.01, 0.02, 0.01],
      // Casual streetwear pose: relaxed asymmetrical weight shift
      leftArmRot: [0.08, -0.05, -1.18],
      rightArmRot: [0.18, 0.08, 1.1],
      leftForeArmRot: [-0.4, 0.1, -0.1],
      rightForeArmRot: [-0.6, -0.2, 0.25],
    }
  }
};
