import { DEFAULT_HARDWARE_OPTIONS, HardwarePartType, WasherSpacerShimOptions } from './types';

export interface HardwarePresetCard {
  id: string;
  partType: HardwarePartType;
  name: string;
  patch: Partial<WasherSpacerShimOptions>;
}

export const HARDWARE_PRESET_CARDS: HardwarePresetCard[] = [
  {
    id: 'flat_m6_washer',
    partType: 'washer_spacer',
    name: 'M6 Washer & Spacer ×4',
    patch: { ...DEFAULT_HARDWARE_OPTIONS },
  },
  {
    id: 'flanged_bushing_m8',
    partType: 'flanged_bushing',
    name: 'M8 Flanged Bushing ×2',
    patch: {
      partType: 'flanged_bushing',
      boltPreset: 'M8',
      outerDiameterMm: 14,
      flangeDiameterMm: 22,
      flangeHeightMm: 2.4,
      innerDiameterMm: 8.4,
      heightMm: 12,
      chamferMm: 0.5,
      holeToleranceMm: 0.2,
      quantity: 2,
      includeBrimTabs: false,
    },
  },
  {
    id: 'vesa_m4_standoff',
    partType: 'hex_standoff',
    name: 'VESA M4 Hex Standoff ×4',
    patch: {
      partType: 'hex_standoff',
      boltPreset: 'M4',
      outerDiameterMm: 11,
      innerDiameterMm: 4.3,
      heightMm: 14,
      chamferMm: 0.4,
      holeToleranceMm: 0.2,
      quantity: 4,
      includeBrimTabs: false,
    },
  },
  {
    id: 'door_leveling_wedge',
    partType: 'leveling_wedge',
    name: 'Door & Cabinet Wedge',
    patch: {
      partType: 'leveling_wedge',
      boltPreset: 'custom',
      outerDiameterMm: 28,
      heightMm: 12,
      wedgeLengthMm: 75,
      wedgeMinHeightMm: 1.0,
      includeWedgeRibs: true,
      includeScrewSlot: true,
      quantity: 2,
      includeBrimTabs: false,
    },
  },
  {
    id: 'cabinet_u_shim',
    partType: 'u_slot_shim',
    name: 'U-Slot Framing Shim ×4',
    patch: {
      partType: 'u_slot_shim',
      boltPreset: 'M6',
      outerDiameterMm: 26,
      innerDiameterMm: 6.4,
      heightMm: 3.0,
      wedgeLengthMm: 36,
      holeToleranceMm: 0.25,
      quantity: 4,
      includeBrimTabs: false,
    },
  },
];

export const M6_WASHER_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
};

export const FLANGED_BUSHING_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  ...HARDWARE_PRESET_CARDS[1].patch,
};

export const HEX_STANDOFF_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  ...HARDWARE_PRESET_CARDS[2].patch,
};

export const LEVELING_WEDGE_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'leveling_wedge',
  boltPreset: 'custom',
  outerDiameterMm: 26,
  heightMm: 12.0,
  wedgeLengthMm: 70,
  wedgeMinHeightMm: 1.0,
  includeWedgeRibs: true,
  includeScrewSlot: true,
  quantity: 1,
};

export const U_SLOT_SHIM_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'u_slot_shim',
  boltPreset: 'M6',
  outerDiameterMm: 24,
  innerDiameterMm: 6.4,
  heightMm: 3.0,
  wedgeLengthMm: 34,
  holeToleranceMm: 0.25,
  quantity: 1,
};

export const LARGE_CHAMFER_CLAMP_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'washer_spacer',
  boltPreset: 'custom',
  outerDiameterMm: 12,
  innerDiameterMm: 6,
  heightMm: 1.5,
  chamferMm: 3.0,
  holeToleranceMm: 0,
  quantity: 1,
};

export const ARRAY_9_PLATE_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  quantity: 9,
};

export const HIGH_ASPECT_TALL_SPACER_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'washer_spacer',
  boltPreset: 'M3',
  outerDiameterMm: 8,
  innerDiameterMm: 3.2,
  heightMm: 36,
  chamferMm: 0.3,
  holeToleranceMm: 0.2,
  quantity: 1,
  includeBrimTabs: true,
};

export const OVERSIZED_PLATE_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'washer_spacer',
  outerDiameterMm: 60,
  innerDiameterMm: 10,
  heightMm: 4,
  quantity: 20,
};

export const INVALID_THIN_WALL_FIXTURE: WasherSpacerShimOptions = {
  ...DEFAULT_HARDWARE_OPTIONS,
  partType: 'washer_spacer',
  outerDiameterMm: 10,
  innerDiameterMm: 9,
  holeToleranceMm: 0,
};

export const INVALID_FLANGE_FIXTURE: WasherSpacerShimOptions = {
  ...FLANGED_BUSHING_FIXTURE,
  outerDiameterMm: 18,
  flangeDiameterMm: 16,
};

export const INVALID_WEDGE_HEIGHT_FIXTURE: WasherSpacerShimOptions = {
  ...LEVELING_WEDGE_FIXTURE,
  heightMm: 5.0,
  wedgeMinHeightMm: 6.0,
};
