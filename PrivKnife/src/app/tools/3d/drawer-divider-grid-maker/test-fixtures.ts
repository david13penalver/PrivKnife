import {
  DEFAULT_DRAWER_GRID_OPTIONS,
  DrawerDividerGridOptions,
  DrawerGridPreset,
} from './types';

export const STANDARD_DESK_DRAWER_FIXTURE: DrawerDividerGridOptions = {
  ...DEFAULT_DRAWER_GRID_OPTIONS,
  drawerWidthMm: 280,
  drawerDepthMm: 200,
  dividerHeightMm: 45,
  bladeThicknessMm: 3.0,
  edgeClearanceMm: 1.0,
  notchClearanceMm: 0.25,
  colCount: 3,
  rowCount: 2,
  customColRatios: '',
  customRowRatios: '',
  printerBedMm: 256,
  includeBaseFeet: false,
  includePieceLabels: true,
  viewMode: 'assembled',
};

export const UNEQUAL_RATIOS_FIXTURE: DrawerDividerGridOptions = {
  ...STANDARD_DESK_DRAWER_FIXTURE,
  customColRatios: '1,2,1',
  customRowRatios: '25,75',
};

export const OVERSIZED_SPLIT_FIXTURE: DrawerDividerGridOptions = {
  ...DEFAULT_DRAWER_GRID_OPTIONS,
  drawerWidthMm: 500,
  drawerDepthMm: 380,
  dividerHeightMm: 55,
  bladeThicknessMm: 3.2,
  edgeClearanceMm: 1.0,
  notchClearanceMm: 0.25,
  colCount: 3,
  rowCount: 3,
  customColRatios: '1,1,1',
  customRowRatios: '1,1,1',
  printerBedMm: 220,
  includeBaseFeet: true,
  includePieceLabels: true,
  viewMode: 'flat_plates',
};

export const MALFORMED_RATIOS_FIXTURE: DrawerDividerGridOptions = {
  ...STANDARD_DESK_DRAWER_FIXTURE,
  customColRatios: 'abc, -3, NaN',
  customRowRatios: ',,',
};

export const INVALID_TINY_DRAWER_FIXTURE: DrawerDividerGridOptions = {
  ...STANDARD_DESK_DRAWER_FIXTURE,
  drawerWidthMm: 20,
};

export const INVALID_SINGLE_CELL_FIXTURE: DrawerDividerGridOptions = {
  ...STANDARD_DESK_DRAWER_FIXTURE,
  colCount: 1,
  rowCount: 1,
  customColRatios: '',
  customRowRatios: '',
};

export const DRAWER_GRID_PRESETS: DrawerGridPreset[] = [
  {
    id: 'kitchen_cutlery_500',
    name: 'Oversized Kitchen Cutlery (500mm Split)',
    description: '500x380mm drawer with auto dovetail bed splits on a 220mm printer.',
    options: { ...OVERSIZED_SPLIT_FIXTURE, viewMode: 'assembled' },
  },
  {
    id: 'ikea_alex_desk',
    name: 'Studio Desk Drawer (1:2:1 Asymmetric)',
    description: '280x200x45mm asymmetrical stationery grid with embossed slat IDs.',
    options: { ...DEFAULT_DRAWER_GRID_OPTIONS },
  },
  {
    id: 'toolbox_wrench_rack',
    name: 'Mechanic Toolbox Deep Grid (5x3)',
    description: '580x360x70mm heavy 3.8mm blades with stabilizing T-feet & 256mm splits.',
    options: {
      ...DEFAULT_DRAWER_GRID_OPTIONS,
      drawerWidthMm: 580,
      drawerDepthMm: 360,
      dividerHeightMm: 70,
      bladeThicknessMm: 3.8,
      colCount: 5,
      rowCount: 3,
      customColRatios: '1,1,1.5,1.5,2',
      customRowRatios: '1,1,1',
      printerBedMm: 256,
      includeBaseFeet: true,
    },
  },
  {
    id: 'sock_dresser_grid',
    name: 'Clothing Dresser Organizer (4x4)',
    description: '420x320x95mm deep fabric drawer partitions, split for 220mm beds.',
    options: {
      ...DEFAULT_DRAWER_GRID_OPTIONS,
      drawerWidthMm: 420,
      drawerDepthMm: 320,
      dividerHeightMm: 95,
      bladeThicknessMm: 3.0,
      colCount: 4,
      rowCount: 4,
      customColRatios: '',
      customRowRatios: '',
      printerBedMm: 220,
      includeBaseFeet: true,
    },
  },
  {
    id: 'compact_mini_bed_180',
    name: 'Prusa Mini 180mm Compact Caddy',
    description: '220x165x40mm craft drawer neatly split into 180mm bed-safe segments.',
    options: {
      ...DEFAULT_DRAWER_GRID_OPTIONS,
      drawerWidthMm: 220,
      drawerDepthMm: 165,
      dividerHeightMm: 40,
      bladeThicknessMm: 2.8,
      colCount: 3,
      rowCount: 2,
      customColRatios: '25, 50, 25',
      customRowRatios: '1, 1',
      printerBedMm: 180,
      includeBaseFeet: false,
    },
  },
];
