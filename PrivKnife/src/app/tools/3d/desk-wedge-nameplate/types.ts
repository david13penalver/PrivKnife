export type TextMode = 'embossed' | 'debossed';
export type TextAlignment = 'left' | 'center' | 'right';
export type FontFamilyPreset = 'sans' | 'serif' | 'mono' | 'display' | 'geometric';

export interface NameplateConfig {
  primaryText: string; // e.g. "DR. ELEANOR VANCE"
  secondaryText: string; // e.g. "CHIEF SCIENTIFIC OFFICER"
  secondaryEnabled: boolean;
  fontFamily: FontFamilyPreset;
  textMode: TextMode;
  textAlignment: TextAlignment;
  wedgeWidthMm: number; // e.g. 160mm (100-260)
  baseDepthMm: number; // e.g. 38mm (25-60)
  wedgeHeightMm: number; // e.g. 44mm (30-65)
  lipHeightMm: number; // e.g. 4mm (2-8)
  topFlatMm: number; // e.g. 5mm (2-10)
  reliefDepthMm: number; // e.g. 1.2mm (0.6-2.4)
  primaryFontSizeMm: number; // e.g. 16mm (10-24)
  secondaryFontSizeMm: number; // e.g. 8.5mm (6-14)
  baseColor: string; // hex #0F172A
  textColor: string; // hex #F59E0B
}

export interface NameplateMetrics {
  dimensionsMm: {
    width: number;
    height: number;
    depth: number;
  };
  inclineAngleDeg: number;
  faceLengthMm: number;
  estimatedFilamentGrams: number;
  filamentSwapLayer: number; // For single-extruder 0.20mm layer swaps
}

export interface PresetNameplate {
  id: string;
  name: string;
  description: string;
  config: Partial<NameplateConfig>;
}

export interface FilamentPalette {
  name: string;
  baseColor: string;
  textColor: string;
}
