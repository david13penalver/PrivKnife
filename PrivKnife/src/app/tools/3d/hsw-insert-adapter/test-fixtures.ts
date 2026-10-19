import { HswInsertAdapterOptions, HswPreset } from './types';

export const DEFAULT_HSW_OPTIONS: HswInsertAdapterOptions = {
  insertType: 'hex_nut_pocket',
  nutSize: 'M4',
  magnetDiameterMm: 8.0,
  magnetDepthMm: 3.0,
  hookLengthMm: 35.0,
  hookAngleDeg: 25.0,
  ringDiameterMm: 30.0,
  tightnessToleranceMm: 0.0,
  retentionTabs: true,
  plugDepthMm: 8.0,
  flangeRim: true,
};

export const MINIMAL_HSW_OPTIONS: HswInsertAdapterOptions = {
  insertType: 'empty_plug',
  nutSize: 'M3',
  magnetDiameterMm: 5.0,
  magnetDepthMm: 1.5,
  hookLengthMm: 15.0,
  hookAngleDeg: 0.0,
  ringDiameterMm: 15.0,
  tightnessToleranceMm: -0.2,
  retentionTabs: false,
  plugDepthMm: 6.0,
  flangeRim: false,
};

export const MAXIMUM_HSW_OPTIONS: HswInsertAdapterOptions = {
  insertType: 'tool_hook',
  nutSize: 'M5',
  magnetDiameterMm: 15.0,
  magnetDepthMm: 5.0,
  hookLengthMm: 70.0,
  hookAngleDeg: 55.0,
  ringDiameterMm: 58.0,
  tightnessToleranceMm: 0.3,
  retentionTabs: true,
  plugDepthMm: 12.0,
  flangeRim: true,
};

export const HSW_PRESETS: HswPreset[] = [
  {
    id: 'm4_captive_nut',
    name: 'M4 Captive Nut Insert',
    description: 'Hex nut pocket with clearance hole to bolt arbitrary tool brackets directly into HSW',
    options: {
      insertType: 'hex_nut_pocket',
      nutSize: 'M4',
      tightnessToleranceMm: 0.0,
      retentionTabs: true,
      flangeRim: true,
    },
  },
  {
    id: 'heavy_tool_hook',
    name: 'Heavy-Duty 40mm Utility Hook',
    description: 'Reinforced cantilever tool hook with 25° upturned lip for hanging calipers, cables, and pliers',
    options: {
      insertType: 'tool_hook',
      hookLengthMm: 40.0,
      hookAngleDeg: 25.0,
      tightnessToleranceMm: 0.05,
      retentionTabs: true,
    },
  },
  {
    id: 'neodymium_magnet_8mm',
    name: '8x3mm Neodymium Magnet Holder',
    description: 'Press-fit pocket for standard N52 disc magnets to snap metal scissors, drill bits, and knives',
    options: {
      insertType: 'magnet_holder',
      magnetDiameterMm: 8.2,
      magnetDepthMm: 3.2,
      tightnessToleranceMm: 0.0,
    },
  },
  {
    id: 'caliper_ring_holder',
    name: '32mm Tool Ring / Can Holder',
    description: 'Rigid cylindrical loop for spray lubricant cans, wire strippers, or hot air gun nozzles',
    options: {
      insertType: 'storage_ring',
      ringDiameterMm: 32.0,
      tightnessToleranceMm: 0.0,
      retentionTabs: true,
    },
  },
  {
    id: 'm3_threaded_standoff',
    name: 'M3 Threaded Post Standoff',
    description: 'Solid forward extrusion with M3 tap pilot hole for custom PCB or electronic sensor mounting',
    options: {
      insertType: 'threaded_post',
      nutSize: 'M3',
      tightnessToleranceMm: 0.0,
    },
  },
  {
    id: 'flush_empty_plug',
    name: 'Decorative Flush Blank Plug',
    description: 'Clean aesthetic wall plug to cover unused honeycomb cells or run hidden wiring through',
    options: {
      insertType: 'empty_plug',
      tightnessToleranceMm: 0.0,
      retentionTabs: true,
      flangeRim: true,
    },
  },
];
