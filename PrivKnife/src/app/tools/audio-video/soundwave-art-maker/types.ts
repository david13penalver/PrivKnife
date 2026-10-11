export type WaveformStyle = 'mirrored' | 'bottom' | 'radial';

export type ArtThemePreset =
  | 'dark-indigo'
  | 'classic-black'
  | 'minimal-white'
  | 'midnight-gold'
  | 'sunset-rose'
  | 'nordic-teal';

export interface ArtTheme {
  id: ArtThemePreset;
  name: string;
  backgroundColor: string;
  waveColor: string;
  textColor: string;
  accentColor: string;
}

export interface SoundwaveConfig {
  barCount: number; // 20 to 120 (default 50)
  barWidth: number; // 2 to 12 (default 6)
  barSpacing: number; // 1 to 8 (default 3)
  cornerRadius: number; // 0 to 10 (default 4)
  style: WaveformStyle;
  themePreset: ArtThemePreset;
  customBackgroundColor?: string;
  customWaveColor?: string;
  customTextColor?: string;
  title: string;
  subtitle: string;
  spotifyLinkOrUri: string;
  showSpotifyCode: boolean;
  paperSize: 'a4' | 'letter' | 'square';
  orientation: 'portrait' | 'landscape';
}

export interface ThreeDPrintConfig {
  baseWidthMm: number; // e.g. 100mm
  baseHeightMm: number; // e.g. 35mm
  baseThicknessMm: number; // e.g. 2.0mm
  waveThicknessMm: number; // e.g. 1.5mm (total height = 3.5mm)
  hasKeychainHole: boolean;
  keychainHoleDiameterMm: number; // e.g. 4.0mm
}

export interface SpotifyCodeData {
  uri: string;
  trackId: string;
  bars: number[]; // 23 standard Spotify Code bar heights normalized [0.15, 1.0]
}
