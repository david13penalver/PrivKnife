import { LithophaneMakerOptions, PresetLithophane } from './types';

export function createSyntheticImageBuffer(
  width = 64,
  height = 64,
  pattern: 'gradient' | 'checker' | 'circle' = 'gradient'
): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let val = 128;

      if (pattern === 'gradient') {
        val = Math.floor((x / (width - 1)) * 255);
      } else if (pattern === 'checker') {
        const cx = Math.floor(x / 8);
        const cy = Math.floor(y / 8);
        val = (cx + cy) % 2 === 0 ? 255 : 30;
      } else if (pattern === 'circle') {
        const dx = x - width / 2;
        const dy = y - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.min(width, height) / 2;
        val = Math.max(0, Math.min(255, Math.floor((1 - dist / maxDist) * 255)));
      }

      data[idx] = val; // R
      data[idx + 1] = val; // G
      data[idx + 2] = val; // B
      data[idx + 3] = 255; // Alpha
    }
  }

  return { width, height, data };
}

export const DEFAULT_LITHOPHANE_OPTIONS: LithophaneMakerOptions = {
  geometryType: 'flat',
  arcDegrees: 90,
  widthMm: 100,
  heightMm: 80,
  minThicknessMm: 0.8,
  maxThicknessMm: 2.8,
  frameBorderWidthMm: 3.0,
  frameBorderDepthMm: 3.0,
  invertLuminance: false,
  contrastFactor: 1.0,
  baseStandSlot: false,
  baseStandWidthMm: 12,
  resolution: 60,
  imageData: createSyntheticImageBuffer(60, 48, 'gradient'),
};

export const CURVED_ARC_OPTIONS: LithophaneMakerOptions = {
  geometryType: 'curve_arc',
  arcDegrees: 120,
  widthMm: 120,
  heightMm: 90,
  minThicknessMm: 0.8,
  maxThicknessMm: 3.0,
  frameBorderWidthMm: 3.0,
  frameBorderDepthMm: 3.2,
  invertLuminance: false,
  contrastFactor: 1.1,
  baseStandSlot: true,
  baseStandWidthMm: 15,
  resolution: 60,
  imageData: createSyntheticImageBuffer(60, 45, 'circle'),
};

export const CYLINDER_OPTIONS: LithophaneMakerOptions = {
  geometryType: 'cylinder',
  arcDegrees: 360,
  widthMm: 100, // becomes circumference or diameter
  heightMm: 120,
  minThicknessMm: 0.8,
  maxThicknessMm: 2.8,
  frameBorderWidthMm: 4.0,
  frameBorderDepthMm: 3.0,
  invertLuminance: false,
  contrastFactor: 1.0,
  baseStandSlot: false,
  resolution: 64,
  imageData: createSyntheticImageBuffer(64, 64, 'checker'),
};

export const NIGHTLIGHT_OPTIONS: LithophaneMakerOptions = {
  geometryType: 'nightlight_panel',
  arcDegrees: 90,
  widthMm: 75,
  heightMm: 100,
  minThicknessMm: 0.8,
  maxThicknessMm: 2.6,
  frameBorderWidthMm: 2.5,
  frameBorderDepthMm: 2.8,
  invertLuminance: false,
  contrastFactor: 1.0,
  baseStandSlot: true,
  baseStandWidthMm: 18,
  resolution: 60,
  imageData: createSyntheticImageBuffer(60, 80, 'gradient'),
};

export const INVALID_OPTIONS_MIN_MAX: LithophaneMakerOptions = {
  ...DEFAULT_LITHOPHANE_OPTIONS,
  minThicknessMm: 3.0,
  maxThicknessMm: 1.0,
};

export const INVALID_OPTIONS_ZERO_WIDTH: LithophaneMakerOptions = {
  ...DEFAULT_LITHOPHANE_OPTIONS,
  widthMm: 0,
};

export const LITHOPHANE_PRESETS: PresetLithophane[] = [
  {
    id: 'curved_desk',
    name: 'Curved Desk Portrait',
    description: '120° self-standing arc lithophane with built-in foot. Perfect for desktops and mantels.',
    geometryType: 'curve_arc',
    options: {
      geometryType: 'curve_arc',
      arcDegrees: 120,
      widthMm: 110,
      heightMm: 85,
      minThicknessMm: 0.8,
      maxThicknessMm: 3.0,
      frameBorderWidthMm: 3.0,
      frameBorderDepthMm: 3.2,
      baseStandSlot: true,
    },
  },
  {
    id: 'classic_flat',
    name: 'Classic Flat Photo Frame',
    description: 'Flat rectangular panel with solid reinforced frame for window mounts and lightboxes.',
    geometryType: 'flat',
    options: {
      geometryType: 'flat',
      widthMm: 100,
      heightMm: 75,
      minThicknessMm: 0.8,
      maxThicknessMm: 2.8,
      frameBorderWidthMm: 3.5,
      frameBorderDepthMm: 3.0,
      baseStandSlot: false,
    },
  },
  {
    id: 'cylinder_lamp',
    name: '360° Cylinder Lampshade',
    description: 'Continuous 360° cylindrical wrap that slips over standard lamp fittings or LED tea lights.',
    geometryType: 'cylinder',
    options: {
      geometryType: 'cylinder',
      arcDegrees: 360,
      widthMm: 95,
      heightMm: 110,
      minThicknessMm: 0.8,
      maxThicknessMm: 2.6,
      frameBorderWidthMm: 3.0,
      frameBorderDepthMm: 2.8,
      baseStandSlot: false,
    },
  },
  {
    id: 'nightlight_panel',
    name: 'LED Night Light Panel',
    description: 'Standard 75x100mm portrait with bottom plug-in slot for off-the-shelf LED night light plugs.',
    geometryType: 'nightlight_panel',
    options: {
      geometryType: 'nightlight_panel',
      widthMm: 75,
      heightMm: 100,
      minThicknessMm: 0.8,
      maxThicknessMm: 2.6,
      frameBorderWidthMm: 2.5,
      frameBorderDepthMm: 2.8,
      baseStandSlot: true,
    },
  },
];
