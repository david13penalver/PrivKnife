import {
  ArtTheme,
  SoundwaveConfig,
  ThreeDPrintConfig,
} from './types';

export const ART_THEMES: Record<string, ArtTheme> = {
  'dark-indigo': {
    id: 'dark-indigo',
    name: 'Dark Studio Indigo',
    backgroundColor: '#0F172A',
    waveColor: '#6366F1',
    textColor: '#F8FAFC',
    accentColor: '#818CF8',
  },
  'classic-black': {
    id: 'classic-black',
    name: 'Classic Monochrome',
    backgroundColor: '#09090B',
    waveColor: '#FFFFFF',
    textColor: '#FFFFFF',
    accentColor: '#A1A1AA',
  },
  'minimal-white': {
    id: 'minimal-white',
    name: 'Minimal Gallery White',
    backgroundColor: '#FFFFFF',
    waveColor: '#18181B',
    textColor: '#18181B',
    accentColor: '#71717A',
  },
  'midnight-gold': {
    id: 'midnight-gold',
    name: 'Midnight & Gold',
    backgroundColor: '#0A0E1A',
    waveColor: '#F59E0B',
    textColor: '#FDE68A',
    accentColor: '#D97706',
  },
  'sunset-rose': {
    id: 'sunset-rose',
    name: 'Sunset Rose',
    backgroundColor: '#1E1B2E',
    waveColor: '#F43F5E',
    textColor: '#FFE4E6',
    accentColor: '#FB7185',
  },
  'nordic-teal': {
    id: 'nordic-teal',
    name: 'Nordic Teal',
    backgroundColor: '#06282E',
    waveColor: '#14B8A6',
    textColor: '#CCFBF1',
    accentColor: '#2DD4BF',
  },
};

export const DEFAULT_SOUNDWAVE_CONFIG: SoundwaveConfig = {
  barCount: 50,
  barWidth: 6,
  barSpacing: 3,
  cornerRadius: 3,
  style: 'mirrored',
  themePreset: 'dark-indigo',
  title: 'Can’t Help Falling in Love',
  subtitle: 'Elvis Presley • Our Anniversary • June 15, 2024',
  spotifyLinkOrUri: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
  showSpotifyCode: true,
  paperSize: 'a4',
  orientation: 'landscape',
};

export const DEFAULT_3D_PRINT_CONFIG: ThreeDPrintConfig = {
  baseWidthMm: 100,
  baseHeightMm: 35,
  baseThicknessMm: 2.0,
  waveThicknessMm: 1.5,
  hasKeychainHole: true,
  keychainHoleDiameterMm: 4.0,
};

// 50 precomputed normalized bar amplitudes simulating an acoustic song
export const SAMPLE_NORMALIZED_BARS = [
  0.15, 0.22, 0.35, 0.5, 0.68, 0.82, 0.95, 0.88, 0.72, 0.6,
  0.45, 0.38, 0.52, 0.65, 0.78, 0.9, 1.0, 0.92, 0.75, 0.58,
  0.42, 0.3, 0.25, 0.38, 0.55, 0.7, 0.85, 0.98, 0.89, 0.74,
  0.62, 0.48, 0.36, 0.28, 0.44, 0.61, 0.77, 0.91, 0.84, 0.69,
  0.53, 0.4, 0.32, 0.24, 0.35, 0.48, 0.6, 0.72, 0.5, 0.2,
];

/**
 * Generates a synthetic voice memo PCM buffer ("I love you" speech envelope).
 */
export function createSyntheticVoiceMemoPcm(sampleRate = 22050): Float32Array {
  const durationSec = 2.5;
  const total = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    // 3 syllables burst
    const syl1 = Math.exp(-Math.pow((t - 0.5) / 0.15, 2));
    const syl2 = Math.exp(-Math.pow((t - 1.2) / 0.2, 2));
    const syl3 = Math.exp(-Math.pow((t - 1.9) / 0.25, 2));
    const envelope = syl1 * 0.8 + syl2 * 0.95 + syl3 * 0.9;
    const voiceCarrier =
      Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t);
    buffer[i] = voiceCarrier * envelope * 0.8;
  }

  return buffer;
}
