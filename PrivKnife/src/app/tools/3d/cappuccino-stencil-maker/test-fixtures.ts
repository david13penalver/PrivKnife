import { CappuccinoStencilMakerOptions, StencilPreset } from './types';

export const DEFAULT_STENCIL_OPTIONS: CappuccinoStencilMakerOptions = {
  stencilDiameterMm: 95.0, // Standard 3.75" cappuccino mug rim
  stencilThicknessMm: 1.2, // Lightweight flexible food-safe disk
  handleType: 'thumb_tab',
  handleHole: true,
  handleLengthMm: 30.0,
  motif: 'heart',
  customText: 'COFFEE',
  contrastThreshold: 128,
  autoBridgeIslands: true,
  bridgeWidthMm: 1.8,
  invertCutout: false,
  rimBevel: true,
};

export const MINIMAL_STENCIL_OPTIONS: CappuccinoStencilMakerOptions = {
  stencilDiameterMm: 60.0,
  stencilThicknessMm: 0.8,
  handleType: 'thumb_tab',
  handleHole: false,
  handleLengthMm: 15.0,
  motif: 'coffee_bean',
  customText: '',
  contrastThreshold: 80,
  autoBridgeIslands: false,
  bridgeWidthMm: 1.0,
  invertCutout: false,
  rimBevel: false,
};

export const MAXIMUM_STENCIL_OPTIONS: CappuccinoStencilMakerOptions = {
  stencilDiameterMm: 140.0,
  stencilThicknessMm: 3.0,
  handleType: 'extended_rod',
  handleHole: true,
  handleLengthMm: 70.0,
  motif: 'custom_text',
  customText: 'BARISTA #1',
  contrastThreshold: 180,
  autoBridgeIslands: true,
  bridgeWidthMm: 3.5,
  invertCutout: true,
  rimBevel: true,
};

export const STENCIL_PRESETS: StencilPreset[] = [
  {
    id: 'barista_heart',
    name: 'Classic Latte Art Heart',
    description: 'Iconic cafe heart stencil sized for 95mm cups with ergonomic thumb tab',
    options: {
      motif: 'heart',
      handleType: 'thumb_tab',
      stencilDiameterMm: 95.0,
      stencilThicknessMm: 1.2,
    },
  },
  {
    id: 'roasted_coffee_bean',
    name: 'Roasted Coffee Bean',
    description: 'Realistic coffee bean with curved center crease',
    options: {
      motif: 'coffee_bean',
      handleType: 'thumb_tab',
      stencilDiameterMm: 90.0,
      stencilThicknessMm: 1.2,
    },
  },
  {
    id: 'steaming_cup',
    name: 'Steaming Coffee Mug',
    description: 'Hot espresso cup with aromatic steam curls silhouette',
    options: {
      motif: 'coffee_cup',
      handleType: 'extended_rod',
      stencilDiameterMm: 100.0,
      handleLengthMm: 50.0,
    },
  },
  {
    id: 'fern_rosetta',
    name: 'Barista Rosetta Leaf',
    description: 'Intricate multi-tier fern leaf latte art design',
    options: {
      motif: 'leaf_rosetta',
      handleType: 'thumb_tab',
      stencilDiameterMm: 95.0,
    },
  },
  {
    id: 'cat_paw_artisan',
    name: 'Cute Cat Paw Print',
    description: 'Adorable 4-toed pet paw print for cocoa or cinnamon dusting',
    options: {
      motif: 'cat_paw',
      handleType: 'dual_ear',
      stencilDiameterMm: 90.0,
    },
  },
  {
    id: 'custom_monogram_text',
    name: 'Custom Name / Monogram',
    description: 'Custom text stencil with automated island bridges (no falling letter centers)',
    options: {
      motif: 'custom_text',
      customText: 'COFFEE',
      autoBridgeIslands: true,
      bridgeWidthMm: 1.8,
      handleType: 'extended_rod',
    },
  },
];
