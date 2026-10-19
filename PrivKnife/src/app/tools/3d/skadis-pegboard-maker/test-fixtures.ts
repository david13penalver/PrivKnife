import { PresetHolder, SkadisPegboardMakerOptions } from './types';

export const DEFAULT_SKADIS_OPTIONS: SkadisPegboardMakerOptions = {
  pegboardSystem: 'ikea_skadis',
  holderStyle: 'single_hook',
  hookLengthMm: 50,
  hookAngleDeg: 10,
  lipHeightMm: 12,
  bracketWidthMm: 24,
  toolDiameterMm: 20,
  reinforceRib: true,
  lockingWedge: true,
  wallMountPreview: true,
};

export const SKADIS_DUAL_PRONG_OPTIONS: SkadisPegboardMakerOptions = {
  pegboardSystem: 'ikea_skadis',
  holderStyle: 'dual_prong',
  hookLengthMm: 60,
  hookAngleDeg: 5,
  lipHeightMm: 10,
  bracketWidthMm: 45,
  toolDiameterMm: 25,
  reinforceRib: true,
  lockingWedge: true,
  wallMountPreview: true,
};

export const PEGBOARD_SHELF_OPTIONS: SkadisPegboardMakerOptions = {
  pegboardSystem: 'standard_pegboard_1_inch',
  holderStyle: 'shelf_bracket',
  hookLengthMm: 90,
  hookAngleDeg: 0,
  lipHeightMm: 8,
  bracketWidthMm: 30,
  toolDiameterMm: 25,
  reinforceRib: true,
  lockingWedge: false,
  wallMountPreview: true,
};

export const SKADIS_TOOL_HOLSTER_OPTIONS: SkadisPegboardMakerOptions = {
  pegboardSystem: 'ikea_skadis',
  holderStyle: 'tool_holster',
  hookLengthMm: 35,
  hookAngleDeg: 0,
  lipHeightMm: 15,
  bracketWidthMm: 36,
  toolDiameterMm: 30,
  reinforceRib: true,
  lockingWedge: true,
  wallMountPreview: true,
};

export const SKADIS_CYLINDER_CUP_OPTIONS: SkadisPegboardMakerOptions = {
  pegboardSystem: 'ikea_skadis',
  holderStyle: 'cylinder_cup',
  hookLengthMm: 70, // cup height
  hookAngleDeg: 0,
  lipHeightMm: 5,
  bracketWidthMm: 50,
  toolDiameterMm: 50, // cup diameter
  reinforceRib: true,
  lockingWedge: true,
  wallMountPreview: true,
};

export const INVALID_OPTIONS_HOOK_ZERO: SkadisPegboardMakerOptions = {
  ...DEFAULT_SKADIS_OPTIONS,
  hookLengthMm: 0,
};

export const INVALID_OPTIONS_ANGLE_EXTREME: SkadisPegboardMakerOptions = {
  ...DEFAULT_SKADIS_OPTIONS,
  hookAngleDeg: 65, // Max 45 degrees
};

export const SKADIS_PRESETS: PresetHolder[] = [
  {
    id: 'skadis_single_hook',
    name: 'Skådis Heavy-Duty Utility Hook',
    description: '50mm angled hook with 12mm anti-slip lip for cables, headphones, or bags on IKEA Skådis.',
    options: {
      pegboardSystem: 'ikea_skadis',
      holderStyle: 'single_hook',
      hookLengthMm: 50,
      hookAngleDeg: 10,
      lipHeightMm: 12,
      reinforceRib: true,
      lockingWedge: true,
    },
  },
  {
    id: 'skadis_dual_prong',
    name: 'Skådis Dual Hammer & Pliers Prong',
    description: '60mm dual support prongs (45mm span) designed for pliers, hammers, and power tools.',
    options: {
      pegboardSystem: 'ikea_skadis',
      holderStyle: 'dual_prong',
      hookLengthMm: 60,
      hookAngleDeg: 5,
      lipHeightMm: 10,
      bracketWidthMm: 45,
      reinforceRib: true,
      lockingWedge: true,
    },
  },
  {
    id: 'pegboard_shelf_bracket',
    name: 'Standard Pegboard Shelf Bracket',
    description: '90mm triangular support bracket for 1-inch pegboards to support wood or acrylic shelves.',
    options: {
      pegboardSystem: 'standard_pegboard_1_inch',
      holderStyle: 'shelf_bracket',
      hookLengthMm: 90,
      hookAngleDeg: 0,
      lipHeightMm: 8,
      bracketWidthMm: 30,
      reinforceRib: true,
    },
  },
  {
    id: 'skadis_caliper_holster',
    name: 'Skådis Digital Caliper & Tool Holster',
    description: 'Slotted cradle holster for digital vernier calipers, screwdrivers, or precision rulers.',
    options: {
      pegboardSystem: 'ikea_skadis',
      holderStyle: 'tool_holster',
      hookLengthMm: 35,
      hookAngleDeg: 0,
      lipHeightMm: 15,
      bracketWidthMm: 36,
      toolDiameterMm: 30,
      lockingWedge: true,
    },
  },
  {
    id: 'skadis_parts_cup',
    name: 'Skådis Pen & Screwdriver Cup',
    description: '50mm round container cup (70mm tall) for pens, markers, tweezers, or hex drivers.',
    options: {
      pegboardSystem: 'ikea_skadis',
      holderStyle: 'cylinder_cup',
      hookLengthMm: 70,
      toolDiameterMm: 50,
      bracketWidthMm: 50,
      lockingWedge: true,
    },
  },
];
