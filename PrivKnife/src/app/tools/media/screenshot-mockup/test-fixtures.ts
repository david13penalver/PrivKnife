import {
  CanvasDimensions,
  CanvasSizePreset,
  ChassisColor,
  DeviceDimensions,
  DeviceType,
  GradientPreset,
  MockupConfig,
} from './types';

export const DEFAULT_MOCKUP_CONFIG: MockupConfig = {
  deviceType: 'phone',
  anglePreset: 'front',
  chassisColor: 'midnight',
  backgroundStyle: 'gradient',
  gradientPreset: 'sunset',
  customBgColor: '#0f172a',
  canvasSizePreset: 'twitter-landscape',
  imageFit: 'cover',
  shadowIntensity: 65,
  shadowBlur: 40,
  shadowOffsetY: 30,
  glareOpacity: 25,
  deviceScale: 0.9,
  exportScale: 2,
  exportFormat: 'png',
};

export const DEVICE_SPECS: Record<DeviceType, DeviceDimensions> = {
  phone: {
    width: 390,
    height: 844,
    bezelWidth: 14,
    cornerRadius: 48,
    aspectRatio: 390 / 844,
    hasDynamicIsland: true,
  },
  tablet: {
    width: 820,
    height: 1180,
    bezelWidth: 20,
    cornerRadius: 32,
    aspectRatio: 820 / 1180,
  },
  laptop: {
    width: 1200,
    height: 800,
    bezelWidth: 16,
    cornerRadius: 18,
    aspectRatio: 1200 / 800,
    hasNotch: true,
  },
  browser: {
    width: 1000,
    height: 700,
    bezelWidth: 12,
    cornerRadius: 12,
    aspectRatio: 1000 / 700,
    hasTrafficLights: true,
  },
};

export const CANVAS_SIZES: Record<CanvasSizePreset, CanvasDimensions> = {
  'twitter-landscape': { width: 1920, height: 1080, aspectRatio: 1920 / 1080 },
  'social-square': { width: 1200, height: 1200, aspectRatio: 1 },
  'app-store-portrait': { width: 1080, height: 1920, aspectRatio: 1080 / 1920 },
  'dribbble': { width: 1600, height: 1200, aspectRatio: 1600 / 1200 },
  'product-hunt': { width: 1270, height: 760, aspectRatio: 1270 / 760 },
};

export interface ChassisPalette {
  body: string;
  rim: string;
  bezel: string;
  innerBorder: string;
  glare: string;
}

export const CHASSIS_PALETTES: Record<ChassisColor, ChassisPalette> = {
  midnight: {
    body: '#1c1d22',
    rim: '#2c2d35',
    bezel: '#0a0a0c',
    innerBorder: '#343640',
    glare: 'rgba(255, 255, 255, 0.12)',
  },
  silver: {
    body: '#e6e7eb',
    rim: '#f8f9fa',
    bezel: '#1a1a1c',
    innerBorder: '#cbd0d8',
    glare: 'rgba(255, 255, 255, 0.25)',
  },
  gold: {
    body: '#e8dcbe',
    rim: '#f6edda',
    bezel: '#1e1c18',
    innerBorder: '#d3c49e',
    glare: 'rgba(255, 255, 255, 0.20)',
  },
  'deep-purple': {
    body: '#2d243a',
    rim: '#3e3250',
    bezel: '#120d18',
    innerBorder: '#514269',
    glare: 'rgba(255, 255, 255, 0.15)',
  },
  'cyber-black': {
    body: '#08080a',
    rim: '#16161a',
    bezel: '#020203',
    innerBorder: '#23232a',
    glare: 'rgba(255, 255, 255, 0.08)',
  },
};

export interface GradientDefinition {
  angleDeg: number;
  stops: { offset: number; color: string }[];
}

export const GRADIENT_PALETTES: Record<GradientPreset, GradientDefinition> = {
  sunset: {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#ff5e62' },
      { offset: 1, color: '#ff9966' },
    ],
  },
  aurora: {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#00c6ff' },
      { offset: 1, color: '#0072ff' },
    ],
  },
  cyberpunk: {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#f72585' },
      { offset: 0.5, color: '#7209b7' },
      { offset: 1, color: '#4cc9f0' },
    ],
  },
  'hyper-purple': {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#6a11cb' },
      { offset: 1, color: '#2575fc' },
    ],
  },
  'minimal-light': {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#f8fafc' },
      { offset: 1, color: '#e2e8f0' },
    ],
  },
  'dark-slate': {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#0f172a' },
      { offset: 1, color: '#1e293b' },
    ],
  },
  emerald: {
    angleDeg: 135,
    stops: [
      { offset: 0, color: '#10b981' },
      { offset: 1, color: '#047857' },
    ],
  },
};

export interface SamplePreset {
  id: string;
  name: string;
  deviceType: DeviceType;
  gradientPreset: GradientPreset;
  title: string;
  primaryColor: string;
  secondaryColor: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'fintech-portfolio',
    name: 'Fintech Portfolio & Cards',
    deviceType: 'phone',
    gradientPreset: 'dark-slate',
    title: 'Nova Wallet',
    primaryColor: '#6366f1',
    secondaryColor: '#10b981',
  },
  {
    id: 'health-tracker',
    name: 'Fitness & Sleep Tracker',
    deviceType: 'phone',
    gradientPreset: 'sunset',
    title: 'PulseFit Pro',
    primaryColor: '#f43f5e',
    secondaryColor: '#fb923c',
  },
  {
    id: 'analytics-dashboard',
    name: 'Cloud SaaS Analytics',
    deviceType: 'laptop',
    gradientPreset: 'aurora',
    title: 'HyperMetric Cloud',
    primaryColor: '#0ea5e9',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'developer-terminal',
    name: 'Dev Tools & API Gateway',
    deviceType: 'browser',
    gradientPreset: 'cyberpunk',
    title: 'Nexus API Studio',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
  },
];

/**
 * Creates an SVG Data URL representing a high-fidelity synthetic app screenshot for testing & fallback previews.
 */
export function createSyntheticScreenshotDataUrl(preset: SamplePreset): string {
  const isMobile = preset.deviceType === 'phone' || preset.deviceType === 'tablet';
  const width = isMobile ? 390 : 1200;
  const height = isMobile ? 844 : 800;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${preset.primaryColor}" />
        <stop offset="100%" stop-color="${preset.secondaryColor}" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    
    <!-- Top Nav Bar -->
    <rect x="${width * 0.08}" y="${isMobile ? 54 : 32}" width="${width * 0.84}" height="${isMobile ? 40 : 50}" rx="12" fill="rgba(255,255,255,0.06)" />
    <text x="${width * 0.12}" y="${isMobile ? 78 : 64}" font-family="system-ui, sans-serif" font-size="${isMobile ? 16 : 20}" font-weight="700" fill="#ffffff">${preset.title}</text>
    
    <!-- Hero Hero Metric Card -->
    <rect x="${width * 0.08}" y="${isMobile ? 116 : 100}" width="${width * 0.84}" height="${isMobile ? 180 : 240}" rx="20" fill="url(#cardGrad)" opacity="0.9" />
    <text x="${width * 0.14}" y="${isMobile ? 160 : 160}" font-family="system-ui, sans-serif" font-size="${isMobile ? 14 : 18}" fill="rgba(255,255,255,0.8)">Total Net Balance</text>
    <text x="${width * 0.14}" y="${isMobile ? 210 : 220}" font-family="system-ui, sans-serif" font-size="${isMobile ? 36 : 48}" font-weight="800" fill="#ffffff">$142,850.40</text>
    <text x="${width * 0.14}" y="${isMobile ? 245 : 270}" font-family="system-ui, sans-serif" font-size="${isMobile ? 13 : 16}" font-weight="600" fill="#a7f3d0">+28.4% this month</text>
    
    <!-- Secondary List Items -->
    <g transform="translate(0, ${isMobile ? 320 : 370})">
      <rect x="${width * 0.08}" y="0" width="${width * 0.84}" height="${isMobile ? 68 : 80}" rx="16" fill="rgba(255,255,255,0.04)" />
      <circle cx="${width * 0.16}" cy="${isMobile ? 34 : 40}" r="${isMobile ? 18 : 22}" fill="${preset.primaryColor}" opacity="0.3" />
      <text x="${width * 0.25}" y="${isMobile ? 40 : 46}" font-family="system-ui, sans-serif" font-size="${isMobile ? 15 : 18}" font-weight="600" fill="#ffffff">Platform Revenue</text>
      <text x="${width * 0.82}" y="${isMobile ? 40 : 46}" font-family="system-ui, sans-serif" font-size="${isMobile ? 15 : 18}" font-weight="700" fill="#34d399">+$9,240</text>

      <rect x="${width * 0.08}" y="${isMobile ? 84 : 96}" width="${width * 0.84}" height="${isMobile ? 68 : 80}" rx="16" fill="rgba(255,255,255,0.04)" />
      <circle cx="${width * 0.16}" cy="${isMobile ? 118 : 136}" r="${isMobile ? 18 : 22}" fill="${preset.secondaryColor}" opacity="0.3" />
      <text x="${width * 0.25}" y="${isMobile ? 124 : 142}" font-family="system-ui, sans-serif" font-size="${isMobile ? 15 : 18}" font-weight="600" fill="#ffffff">Active Subscriptions</text>
      <text x="${width * 0.82}" y="${isMobile ? 124 : 142}" font-family="system-ui, sans-serif" font-size="${isMobile ? 15 : 18}" font-weight="700" fill="#ffffff">1,482</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
