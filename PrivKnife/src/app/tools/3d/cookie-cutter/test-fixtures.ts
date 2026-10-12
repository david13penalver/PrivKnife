import { CookieCutterConfig, PresetShape } from './types';

export const DEFAULT_COOKIE_CUTTER_CONFIG: CookieCutterConfig = {
  targetSizeMm: 75,
  bladeHeightMm: 15,
  bladeWallMm: 1.0,
  flangeWidthMm: 5.0,
  flangeThicknessMm: 2.5,
  stampBaseThicknessMm: 2.5,
  stampDetailHeightMm: 2.0,
  stampClearanceMm: 1.0,
  stampHandleEnabled: true,
  threshold: 128,
  invertImage: false,
  cutterColor: '#E11D48',
  stampColor: '#F59E0B',
};

// Normalized polygon presets in [-50, 50] coordinate space
export const SAMPLE_COOKIE_PRESETS: PresetShape[] = [
  {
    id: 'gingerbread-man',
    name: 'Gingerbread Man',
    icon: '🍪',
    description: 'Classic holiday gingerbread figure with face and button impressions.',
    outerContour: [
      { x: 0, y: 48 }, // Head top
      { x: 14, y: 45 },
      { x: 18, y: 32 },
      { x: 12, y: 22 }, // Neck right
      { x: 26, y: 20 },
      { x: 44, y: 10 }, // Right arm
      { x: 42, y: -2 },
      { x: 24, y: 6 }, // Armpit right
      { x: 20, y: -8 }, // Hip right
      { x: 30, y: -38 }, // Right foot
      { x: 16, y: -48 },
      { x: 6, y: -22 }, // Inseam
      { x: -6, y: -22 },
      { x: -16, y: -48 }, // Left foot
      { x: -30, y: -38 },
      { x: -20, y: -8 }, // Hip left
      { x: -24, y: 6 }, // Armpit left
      { x: -42, y: -2 }, // Left arm
      { x: -44, y: 10 },
      { x: -26, y: 20 },
      { x: -12, y: 22 }, // Neck left
      { x: -18, y: 32 },
      { x: -14, y: 45 },
    ],
    innerDetails: [
      // Left eye
      [
        { x: -7, y: 38 },
        { x: -5, y: 38 },
        { x: -5, y: 34 },
        { x: -7, y: 34 },
      ],
      // Right eye
      [
        { x: 5, y: 38 },
        { x: 7, y: 38 },
        { x: 7, y: 34 },
        { x: 5, y: 34 },
      ],
      // Smile
      [
        { x: -8, y: 28 },
        { x: -4, y: 25 },
        { x: 4, y: 25 },
        { x: 8, y: 28 },
      ],
      // Button 1
      [
        { x: -3, y: 12 },
        { x: 3, y: 12 },
        { x: 3, y: 7 },
        { x: -3, y: 7 },
      ],
      // Button 2
      [
        { x: -3, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: -5 },
        { x: -3, y: -5 },
      ],
    ],
  },
  {
    id: 'five-star',
    name: 'Festive Star',
    icon: '⭐',
    description: 'Crisp 5-pointed holiday star with center star impression.',
    outerContour: [
      { x: 0, y: 48 },
      { x: 14, y: 16 },
      { x: 48, y: 15 },
      { x: 21, y: -6 },
      { x: 30, y: -40 },
      { x: 0, y: -20 },
      { x: -30, y: -40 },
      { x: -21, y: -6 },
      { x: -48, y: 15 },
      { x: -14, y: 16 },
    ],
    innerDetails: [
      [
        { x: 0, y: 24 },
        { x: 7, y: 8 },
        { x: 24, y: 8 },
        { x: 10, y: -3 },
        { x: 15, y: -20 },
        { x: 0, y: -10 },
        { x: -15, y: -20 },
        { x: -10, y: -3 },
        { x: -24, y: 8 },
        { x: -7, y: 8 },
      ],
    ],
  },
  {
    id: 'sweet-heart',
    name: 'Sweet Heart',
    icon: '❤️',
    description: 'Romantic heart cutter with elegant inner monogram border.',
    outerContour: [
      { x: 0, y: 20 },
      { x: 12, y: 38 },
      { x: 28, y: 44 },
      { x: 44, y: 32 },
      { x: 48, y: 14 },
      { x: 38, y: -8 },
      { x: 22, y: -28 },
      { x: 0, y: -48 },
      { x: -22, y: -28 },
      { x: -38, y: -8 },
      { x: -48, y: 14 },
      { x: -44, y: 32 },
      { x: -28, y: 44 },
      { x: -12, y: 38 },
    ],
    innerDetails: [
      [
        { x: 0, y: 10 },
        { x: 8, y: 24 },
        { x: 20, y: 28 },
        { x: 30, y: 20 },
        { x: 25, y: -4 },
        { x: 0, y: -30 },
        { x: -25, y: -4 },
        { x: -30, y: 20 },
        { x: -20, y: 28 },
        { x: -8, y: 24 },
      ],
    ],
  },
  {
    id: 'playful-cat',
    name: 'Playful Cat',
    icon: '🐱',
    description: 'Silhouette cat head with pointed ears and whisker impressions.',
    outerContour: [
      { x: 0, y: 28 },
      { x: 18, y: 28 },
      { x: 36, y: 46 }, // Right ear tip
      { x: 38, y: 20 },
      { x: 46, y: 4 }, // Cheek right
      { x: 42, y: -18 },
      { x: 26, y: -36 },
      { x: 0, y: -42 }, // Chin
      { x: -26, y: -36 },
      { x: -42, y: -18 },
      { x: -46, y: 4 }, // Cheek left
      { x: -38, y: 20 },
      { x: -36, y: 46 }, // Left ear tip
      { x: -18, y: 28 },
    ],
    innerDetails: [
      // Left eye
      [
        { x: -18, y: 8 },
        { x: -10, y: 12 },
        { x: -12, y: 4 },
      ],
      // Right eye
      [
        { x: 18, y: 8 },
        { x: 10, y: 12 },
        { x: 12, y: 4 },
      ],
      // Nose
      [
        { x: -4, y: -4 },
        { x: 4, y: -4 },
        { x: 0, y: -8 },
      ],
      // Left whisker
      [
        { x: -14, y: -10 },
        { x: -34, y: -12 },
      ],
      // Right whisker
      [
        { x: 14, y: -10 },
        { x: 34, y: -12 },
      ],
    ],
  },
];
