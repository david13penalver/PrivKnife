import { KeycapPreset, KeycapSwitchTesterMakerOptions } from './types';

export const DEFAULT_KEYCAP_OPTIONS: KeycapSwitchTesterMakerOptions = {
  itemType: 'keycap',
  keycapProfile: 'cherry',
  keyUnitSize: '1u',
  legendText: 'ESC',
  legendStyle: 'embossed',
  stemToleranceOffsetMm: 0.1,
  dishDepthMm: 0.5,
  wallThicknessMm: 1.4,
  trayRows: 3,
  trayCols: 3,
  trayTiltAngleDeg: 8,
  trayWallThicknessMm: 3.0,
};

export const MINIMAL_KEYCAP_OPTIONS: KeycapSwitchTesterMakerOptions = {
  itemType: 'keycap',
  keycapProfile: 'dsa',
  keyUnitSize: '1u',
  legendText: '',
  legendStyle: 'blank',
  stemToleranceOffsetMm: 0.0,
  dishDepthMm: 0.2,
  wallThicknessMm: 1.0,
  trayRows: 1,
  trayCols: 1,
  trayTiltAngleDeg: 0,
  trayWallThicknessMm: 2.0,
};

export const MAXIMUM_KEYCAP_OPTIONS: KeycapSwitchTesterMakerOptions = {
  itemType: 'keycap',
  keycapProfile: 'sa',
  keyUnitSize: '2.25u',
  legendText: 'ENTER',
  legendStyle: 'inlaid_multicolor',
  stemToleranceOffsetMm: 0.35,
  dishDepthMm: 1.2,
  wallThicknessMm: 2.0,
  trayRows: 6,
  trayCols: 6,
  trayTiltAngleDeg: 15,
  trayWallThicknessMm: 5.0,
};

export const DEFAULT_SWITCH_TESTER_OPTIONS: KeycapSwitchTesterMakerOptions = {
  itemType: 'switch_tester_tray',
  keycapProfile: 'cherry',
  keyUnitSize: '1u',
  legendText: '',
  legendStyle: 'blank',
  stemToleranceOffsetMm: 0.1,
  dishDepthMm: 0.5,
  wallThicknessMm: 1.4,
  trayRows: 3,
  trayCols: 3,
  trayTiltAngleDeg: 8,
  trayWallThicknessMm: 3.0,
};

export const KEYCAP_PRESETS: KeycapPreset[] = [
  {
    id: 'cherry_esc_artisan',
    name: 'Cherry 1U Artisan ESC',
    description: 'Sculpted Cherry R1 profile 1U keycap with embossed ESC legend and MX stem',
    options: {
      itemType: 'keycap',
      keycapProfile: 'cherry',
      keyUnitSize: '1u',
      legendText: 'ESC',
      legendStyle: 'embossed',
    },
  },
  {
    id: 'dsa_minimal_blank',
    name: 'DSA Uniform Minimalist Blank',
    description: 'Uniform spherical dish DSA profile keycap with clean blank top',
    options: {
      itemType: 'keycap',
      keycapProfile: 'dsa',
      keyUnitSize: '1u',
      legendText: '',
      legendStyle: 'blank',
    },
  },
  {
    id: 'oem_modifier_shift',
    name: 'OEM 2.25U Shift / Enter',
    description: 'OEM profile 2.25U modifier with dual stabilizer stems and centered legend',
    options: {
      itemType: 'keycap',
      keycapProfile: 'oem',
      keyUnitSize: '2.25u',
      legendText: 'SHIFT',
      legendStyle: 'inlaid_multicolor',
    },
  },
  {
    id: 'sa_retro_vintage',
    name: 'SA Retro High-Profile',
    description: 'Tall vintage SA profile with deep spherical dish for retro builds',
    options: {
      itemType: 'keycap',
      keycapProfile: 'sa',
      keyUnitSize: '1u',
      legendText: 'FN',
      legendStyle: 'embossed',
    },
  },
  {
    id: 'tester_tray_2x2',
    name: '2×2 Desk Switch Tester Tray',
    description: 'Compact 4-switch tester base with 14mm snap-in MX cutouts and rubber feet holes',
    options: {
      itemType: 'switch_tester_tray',
      trayRows: 2,
      trayCols: 2,
      trayTiltAngleDeg: 6,
    },
  },
  {
    id: 'tester_tray_3x3',
    name: '3×3 Artisan Display Base (9 Switches)',
    description: 'Sturdy 9-switch desktop display tray with angled viewing incline',
    options: {
      itemType: 'switch_tester_tray',
      trayRows: 3,
      trayCols: 3,
      trayTiltAngleDeg: 10,
    },
  },
];
