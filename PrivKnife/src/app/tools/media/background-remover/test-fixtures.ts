import { BackgroundRemoverConfig, PresetSampleImage } from './types';

export const DEFAULT_REMOVER_CONFIG: BackgroundRemoverConfig = {
  mode: 'auto-subject',
  tolerance: 32,
  featherRadius: 2,
  defringeRadius: 1,
  targetColor: '#FFFFFF',
  backdropMode: 'transparent',
  backdropColor: '#FFFFFF',
  backdropGradientFrom: '#F1F5F9',
  backdropGradientTo: '#CBD5E1',
  zoomLevel: 1.0,
  splitPosition: 50,
};

// Preset SVGs encoded as Data URIs for instant client-side testing without network calls
export const SAMPLE_IMAGES: PresetSampleImage[] = [
  {
    id: 'product-watch',
    name: 'Luxury Chronograph Watch',
    description: 'E-commerce product shot with pure white studio backdrop.',
    category: 'product',
    width: 400,
    height: 400,
    svgDataUri:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
          <!-- Studio White Background -->
          <rect width="400" height="400" fill="#FFFFFF"/>
          <!-- Watch Strap (Leather Dark Brown) -->
          <rect x="160" y="20" width="80" height="360" rx="10" fill="#451a03"/>
          <line x1="160" y1="90" x2="240" y2="90" stroke="#78350f" stroke-width="3"/>
          <line x1="160" y1="310" x2="240" y2="310" stroke="#78350f" stroke-width="3"/>
          <!-- Watch Case (Gold Circle) -->
          <circle cx="200" cy="200" r="95" fill="#f59e0b" stroke="#b45309" stroke-width="8"/>
          <!-- Dial (Navy Blue) -->
          <circle cx="200" cy="200" r="80" fill="#0f172a"/>
          <!-- Hour Markers & Hands -->
          <circle cx="200" cy="200" r="5" fill="#f59e0b"/>
          <line x1="200" y1="200" x2="200" y2="145" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
          <line x1="200" y1="200" x2="245" y2="200" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
          <line x1="200" y1="200" x2="170" y2="235" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
          <!-- Crown -->
          <rect x="295" y="190" width="14" height="20" rx="3" fill="#b45309"/>
        </svg>
      `),
    recommendedConfig: {
      mode: 'light-bg',
      tolerance: 28,
      featherRadius: 2,
    },
  },
  {
    id: 'chroma-logo',
    name: 'Chroma Key Knife & Shield',
    description: 'Vector emblem against high-saturation green screen (#00FF00).',
    category: 'graphic',
    width: 400,
    height: 400,
    svgDataUri:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
          <!-- Green Screen Backdrop -->
          <rect width="400" height="400" fill="#00FF00"/>
          <!-- Shield Body (Cyan & Indigo) -->
          <path d="M 200,60 L 310,100 C 310,230 200,320 200,340 C 200,320 90,230 90,100 Z" fill="#4338ca" stroke="#6366f1" stroke-width="6"/>
          <!-- Swiss Cross / Knife Blade -->
          <rect x="180" y="130" width="40" height="120" rx="8" fill="#ffffff"/>
          <rect x="140" y="170" width="120" height="40" rx="8" fill="#ffffff"/>
          <circle cx="200" cy="190" r="14" fill="#ef4444"/>
        </svg>
      `),
    recommendedConfig: {
      mode: 'chroma-key',
      targetColor: '#00FF00',
      tolerance: 40,
      featherRadius: 2,
    },
  },
  {
    id: 'portrait-avatar',
    name: 'Profile Headshot Silhouette',
    description: 'Corporate headshot avatar against subtle gray studio backdrop.',
    category: 'portrait',
    width: 400,
    height: 400,
    svgDataUri:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
          <!-- Gray Backdrop -->
          <rect width="400" height="400" fill="#E2E8F0"/>
          <!-- Shoulders / Torso -->
          <path d="M 90,370 C 90,280 140,260 200,260 C 260,260 310,280 310,370 Z" fill="#1e293b"/>
          <path d="M 180,260 L 200,290 L 220,260 Z" fill="#f8fafc"/>
          <!-- Head / Neck -->
          <rect x="182" y="220" width="36" height="50" rx="6" fill="#fbcfe8"/>
          <circle cx="200" cy="165" r="65" fill="#fbcfe8"/>
          <!-- Hair -->
          <path d="M 130,160 C 130,90 270,90 270,160 C 260,110 140,110 130,160 Z" fill="#0f172a"/>
        </svg>
      `),
    recommendedConfig: {
      mode: 'auto-subject',
      tolerance: 30,
      featherRadius: 3,
    },
  },
  {
    id: 'dark-neon-controller',
    name: 'Neon Gaming Device',
    description: 'Cyberpunk console controller isolated against deep dark backdrop.',
    category: 'product',
    width: 400,
    height: 400,
    svgDataUri:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
          <!-- Deep Dark Backdrop -->
          <rect width="400" height="400" fill="#090D16"/>
          <!-- Controller Shell (Vibrant Purple & Cyan) -->
          <path d="M 100,160 C 80,260 110,330 145,330 C 170,330 190,270 200,270 C 210,270 230,330 255,330 C 290,330 320,260 300,160 C 275,130 125,130 100,160 Z" fill="#7c3aed" stroke="#a855f7" stroke-width="4"/>
          <!-- D-pad -->
          <rect x="135" y="195" width="30" height="10" rx="3" fill="#06b6d4"/>
          <rect x="145" y="185" width="10" height="30" rx="3" fill="#06b6d4"/>
          <!-- Buttons -->
          <circle cx="255" cy="190" r="6" fill="#06b6d4"/>
          <circle cx="245" cy="205" r="6" fill="#06b6d4"/>
          <circle cx="265" cy="205" r="6" fill="#06b6d4"/>
          <circle cx="255" cy="220" r="6" fill="#06b6d4"/>
        </svg>
      `),
    recommendedConfig: {
      mode: 'dark-bg',
      tolerance: 35,
      featherRadius: 2,
    },
  },
];
