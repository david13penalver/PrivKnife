import { CableCombClipOptions, DEFAULT_CABLE_TOOL_OPTIONS } from './types';

export interface CablePresetCard {
  id: string;
  name: string;
  patch: Partial<CableCombClipOptions>;
}

export const CABLE_PRESET_CARDS: CablePresetCard[] = [
  {
    id: 'desk_mixed_comb',
    name: 'Desk Mixed Cable Comb (6 Slots)',
    patch: { ...DEFAULT_CABLE_TOOL_OPTIONS },
  },
  {
    id: 'travel_winder_2m',
    name: '2m USB-C Travel Cord Winder',
    patch: {
      mode: 'travel_winder',
      cableDiameterMm: 3.6,
      winderOuterDiameterMm: 78,
      winderCoreDiameterMm: 26,
      winderCordLengthM: 2.0,
    },
  },
  {
    id: 'wall_pclip_batch',
    name: '6× Dual-Channel Wall P-Clips',
    patch: {
      mode: 'p_clip_array',
      cableDiameterMm: 5.5,
      slotCount: 2,
      entryPinchRatio: 0.84,
      mountStyle: 'screw_hole',
      clipQuantity: 6,
      clipDepthMm: 14,
    },
  },
  {
    id: 'thick_ac_comb',
    name: 'Heavy AC Power Brick Comb',
    patch: {
      mode: 'cable_comb',
      cableDiameterMm: 8.0,
      slotCount: 4,
      ascendingSlotGradation: false,
      entryPinchRatio: 0.85,
      mountStyle: 'screw_hole',
      clipDepthMm: 20,
    },
  },
];

export const DESK_COMB_6MM_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'cable_comb',
  cableDiameterMm: 6.0,
  entryPinchRatio: 0.82,
  slotCount: 6,
};

export const TRAVEL_WINDER_2M_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'travel_winder',
  winderOuterDiameterMm: 78,
  winderCoreDiameterMm: 26,
  cableDiameterMm: 3.6,
  winderCordLengthM: 2.0,
};

export const OVERLOADED_TINY_WINDER_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'travel_winder',
  winderOuterDiameterMm: 45,
  winderCoreDiameterMm: 22,
  cableDiameterMm: 8.0,
  winderCordLengthM: 3.0,
};

export const PCLIP_BATCH_6_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'p_clip_array',
  cableDiameterMm: 5.5,
  slotCount: 2,
  clipQuantity: 6,
  clipDepthMm: 14,
};

export const ADHESIVE_COMB_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mountStyle: 'adhesive_flat',
  ascendingSlotGradation: false,
  slotCount: 4,
};

export const INVALID_TINY_CORE_WINDER_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'travel_winder',
  winderCoreDiameterMm: 10,
};

export const INVALID_CRUSHED_ANNULUS_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  mode: 'travel_winder',
  winderOuterDiameterMm: 46,
  winderCoreDiameterMm: 38,
};

export const INVALID_PINCH_RATIO_FIXTURE: CableCombClipOptions = {
  ...DEFAULT_CABLE_TOOL_OPTIONS,
  entryPinchRatio: 1.05,
};
