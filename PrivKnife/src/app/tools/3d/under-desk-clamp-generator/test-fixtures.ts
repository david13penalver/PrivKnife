import { UnderDeskClampGeneratorOptions, PresetClamp } from './types';

export const DEFAULT_CLAMP_OPTIONS: UnderDeskClampGeneratorOptions = {
  deskThicknessMm: 25,
  maxClampGapMm: 45,
  throatDepthMm: 60,
  frameThicknessMm: 12,
  frameWidthMm: 36,
  accessoryType: 'headphone_hanger',
  racewaySlots: 3,
  racewaySlotDiameterMm: 8,
  screwDiameterMm: 18,
  screwPitchMm: 4,
  swivelFootPad: true,
  boltClearanceMm: 0.4,
  explodedView: false,
};

export const CABLE_RACEWAY_OPTIONS: UnderDeskClampGeneratorOptions = {
  deskThicknessMm: 30,
  maxClampGapMm: 50,
  throatDepthMm: 75,
  frameThicknessMm: 12,
  frameWidthMm: 45,
  accessoryType: 'cable_raceway',
  racewaySlots: 4,
  racewaySlotDiameterMm: 10,
  screwDiameterMm: 18,
  screwPitchMm: 4,
  swivelFootPad: true,
  boltClearanceMm: 0.4,
  explodedView: false,
};

export const POWER_STRIP_OPTIONS: UnderDeskClampGeneratorOptions = {
  deskThicknessMm: 35,
  maxClampGapMm: 55,
  throatDepthMm: 85,
  frameThicknessMm: 14,
  frameWidthMm: 50,
  accessoryType: 'power_strip_holder',
  racewaySlots: 2,
  racewaySlotDiameterMm: 12,
  screwDiameterMm: 20,
  screwPitchMm: 4,
  swivelFootPad: true,
  boltClearanceMm: 0.4,
  explodedView: false,
};

export const CUP_HOLDER_OPTIONS: UnderDeskClampGeneratorOptions = {
  deskThicknessMm: 25,
  maxClampGapMm: 40,
  throatDepthMm: 65,
  frameThicknessMm: 12,
  frameWidthMm: 40,
  accessoryType: 'cup_holder',
  racewaySlots: 1,
  racewaySlotDiameterMm: 8,
  screwDiameterMm: 18,
  screwPitchMm: 4,
  swivelFootPad: true,
  boltClearanceMm: 0.4,
  explodedView: false,
};

export const INVALID_CLAMP_DESK_TOO_THIN: UnderDeskClampGeneratorOptions = {
  ...DEFAULT_CLAMP_OPTIONS,
  deskThicknessMm: 2, // Minimum is 8-10 mm
};

export const INVALID_CLAMP_GAP_SMALLER_THAN_DESK: UnderDeskClampGeneratorOptions = {
  ...DEFAULT_CLAMP_OPTIONS,
  deskThicknessMm: 50,
  maxClampGapMm: 40, // Gap must be >= deskThickness + 5
};

export const INVALID_CLAMP_FRAME_TOO_THIN: UnderDeskClampGeneratorOptions = {
  ...DEFAULT_CLAMP_OPTIONS,
  frameThicknessMm: 2, // Structural frame must be >= 6 mm
};

export const CLAMP_PRESETS: PresetClamp[] = [
  {
    id: 'headphone_hanger',
    name: 'Headphone Cradle Clamp',
    description: 'Smooth curved under-desk resting hook for studio headphones with 25mm desk clamp.',
    options: {
      deskThicknessMm: 25,
      maxClampGapMm: 45,
      throatDepthMm: 60,
      frameThicknessMm: 12,
      frameWidthMm: 36,
      accessoryType: 'headphone_hanger',
    },
  },
  {
    id: 'cable_raceway',
    name: 'Cable Raceway Organizer',
    description: 'Multi-channel wire routing raceway with snap-in cable retention fingers.',
    options: {
      deskThicknessMm: 30,
      maxClampGapMm: 50,
      throatDepthMm: 75,
      frameThicknessMm: 12,
      frameWidthMm: 45,
      accessoryType: 'cable_raceway',
      racewaySlots: 4,
      racewaySlotDiameterMm: 10,
    },
  },
  {
    id: 'power_strip_holder',
    name: 'Under-Desk Power Strip Cradle',
    description: 'Heavy-duty 50mm wide dual support shelf for mounting power strips & AC adapters.',
    options: {
      deskThicknessMm: 35,
      maxClampGapMm: 55,
      throatDepthMm: 85,
      frameThicknessMm: 14,
      frameWidthMm: 50,
      accessoryType: 'power_strip_holder',
    },
  },
  {
    id: 'cup_holder',
    name: 'Desk Edge Mug & Can Holder',
    description: 'Spill-prevention 80mm circular drink ring that suspends beverages safely off the desk.',
    options: {
      deskThicknessMm: 25,
      maxClampGapMm: 40,
      throatDepthMm: 65,
      frameThicknessMm: 12,
      frameWidthMm: 40,
      accessoryType: 'cup_holder',
    },
  },
];
