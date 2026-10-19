import { GridfinityBinGeneratorOptions, PresetGridfinityBin } from './types';

export const DEFAULT_GRIDFINITY_OPTIONS: GridfinityBinGeneratorOptions = {
  gridX: 1,
  gridY: 1,
  heightUnits: 3, // 3U = 21mm
  subdivisionsX: 1,
  subdivisionsY: 1,
  lipStyle: 'standard',
  fingerScoop: true,
  fingerScoopRadiusMm: 10,
  labelTab: true,
  labelTabWidthMm: 24,
  labelAngleDeg: 45,
  baseMagnetHoles: true,
  baseScrewHoles: false,
  wallThicknessMm: 1.2,
};

export const GRIDFINITY_2X1_OPTIONS: GridfinityBinGeneratorOptions = {
  gridX: 2,
  gridY: 1,
  heightUnits: 6, // 6U = 42mm
  subdivisionsX: 2,
  subdivisionsY: 1,
  lipStyle: 'standard',
  fingerScoop: true,
  fingerScoopRadiusMm: 12,
  labelTab: true,
  labelTabWidthMm: 36,
  labelAngleDeg: 45,
  baseMagnetHoles: true,
  baseScrewHoles: true,
  wallThicknessMm: 1.2,
};

export const GRIDFINITY_3X3_OPTIONS: GridfinityBinGeneratorOptions = {
  gridX: 3,
  gridY: 3,
  heightUnits: 6,
  subdivisionsX: 3,
  subdivisionsY: 3,
  lipStyle: 'flat',
  fingerScoop: false,
  fingerScoopRadiusMm: 10,
  labelTab: false,
  labelTabWidthMm: 20,
  labelAngleDeg: 45,
  baseMagnetHoles: false,
  baseScrewHoles: false,
  wallThicknessMm: 1.4,
};

export const INVALID_GRIDFINITY_GRID_ZERO: GridfinityBinGeneratorOptions = {
  ...DEFAULT_GRIDFINITY_OPTIONS,
  gridX: 0,
};

export const INVALID_GRIDFINITY_HEIGHT_LOW: GridfinityBinGeneratorOptions = {
  ...DEFAULT_GRIDFINITY_OPTIONS,
  heightUnits: 0,
};

export const GRIDFINITY_PRESETS: PresetGridfinityBin[] = [
  {
    id: '1x1_standard',
    name: '1×1 Small Parts Bin (3U)',
    description: 'Compact 42×42mm bin with finger scoop and label tab for screws, nuts, and washers.',
    options: {
      gridX: 1,
      gridY: 1,
      heightUnits: 3,
      subdivisionsX: 1,
      subdivisionsY: 1,
      lipStyle: 'standard',
      fingerScoop: true,
      labelTab: true,
      baseMagnetHoles: true,
    },
  },
  {
    id: '1x2_divided',
    name: '1×2 Dual Compartment (4U)',
    description: '84×42mm bin with center divider wall and dual finger scoops for paired hardware.',
    options: {
      gridX: 2,
      gridY: 1,
      heightUnits: 4,
      subdivisionsX: 2,
      subdivisionsY: 1,
      lipStyle: 'standard',
      fingerScoop: true,
      labelTab: true,
      baseMagnetHoles: true,
    },
  },
  {
    id: '2x2_deep',
    name: '2×2 Deep Storage (6U)',
    description: 'Generous 84×84×42mm deep bin for tools, modules, and bulk hardware components.',
    options: {
      gridX: 2,
      gridY: 2,
      heightUnits: 6,
      subdivisionsX: 1,
      subdivisionsY: 1,
      lipStyle: 'standard',
      fingerScoop: false,
      labelTab: true,
      baseMagnetHoles: true,
    },
  },
  {
    id: '3x1_low_profile',
    name: '3×1 Low-Profile Tool Tray (2U)',
    description: '126×42×14mm slim tray for tweezers, calipers, hex keys, and long tools.',
    options: {
      gridX: 3,
      gridY: 1,
      heightUnits: 2,
      subdivisionsX: 1,
      subdivisionsY: 1,
      lipStyle: 'flat',
      fingerScoop: true,
      labelTab: false,
      baseMagnetHoles: false,
    },
  },
  {
    id: '2x3_organizer',
    name: '2×3 6-Pocket Organizer (6U)',
    description: '84×126mm bin with 6 internal compartments for sorting electronics and precision fasteners.',
    options: {
      gridX: 2,
      gridY: 3,
      heightUnits: 6,
      subdivisionsX: 2,
      subdivisionsY: 3,
      lipStyle: 'standard',
      fingerScoop: true,
      labelTab: true,
      baseMagnetHoles: true,
    },
  },
];
