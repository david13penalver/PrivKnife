import { DEFAULT_TOOL_HOLDER_OPTIONS, PRESET_DEFAULT_SPECS, ToolBitHolderOptions, ToolHolderPreset } from './types';

export interface ToolHolderPresetCard {
  id: ToolHolderPreset;
  name: string;
  patch: Partial<ToolBitHolderOptions>;
}

export const TOOL_HOLDER_PRESET_CARDS: ToolHolderPresetCard[] = [
  {
    id: 'metric_drills',
    name: 'Metric Drills (1–10mm)',
    patch: {
      preset: 'metric_drills',
      formFactor: 'stepped_bench',
      customSpecText: PRESET_DEFAULT_SPECS.metric_drills,
      rows: 2,
      holeDepthMm: 22,
      slotSpacingMm: 5.0,
      stepRiseMm: 12,
    },
  },
  {
    id: 'imperial_drills',
    name: 'Imperial Drills (1/16–3/8")',
    patch: {
      preset: 'imperial_drills',
      formFactor: 'stepped_bench',
      customSpecText: PRESET_DEFAULT_SPECS.imperial_drills,
      rows: 2,
      holeDepthMm: 22,
      slotSpacingMm: 5.5,
      stepRiseMm: 12,
    },
  },
  {
    id: 'hex_bits_quarter',
    name: '1/4" Hex Screwdriver Bits',
    patch: {
      preset: 'hex_bits_quarter',
      formFactor: 'stepped_bench',
      customSpecText: PRESET_DEFAULT_SPECS.hex_bits_quarter,
      hexBitCount: 12,
      rows: 2,
      holeDepthMm: 15,
      slotSpacingMm: 5.0,
      stepRiseMm: 10,
      includeBottomMagnets: true,
    },
  },
  {
    id: 'allen_keys',
    name: 'Metric Allen Hex Keys',
    patch: {
      preset: 'allen_keys',
      formFactor: 'stepped_bench',
      customSpecText: PRESET_DEFAULT_SPECS.allen_keys,
      rows: 1,
      holeDepthMm: 24,
      slotSpacingMm: 6.0,
      stepRiseMm: 10,
    },
  },
  {
    id: 'printer_nozzles',
    name: 'M6 3D Printer Nozzles',
    patch: {
      preset: 'printer_nozzles',
      formFactor: 'flat_tray',
      customSpecText: PRESET_DEFAULT_SPECS.printer_nozzles,
      rows: 1,
      holeDepthMm: 12,
      slotSpacingMm: 6.5,
      stepRiseMm: 0,
    },
  },
  {
    id: 'custom',
    name: 'Custom Precision Tools',
    patch: {
      preset: 'custom',
      formFactor: 'stepped_bench',
      customSpecText: PRESET_DEFAULT_SPECS.custom,
      rows: 1,
      holeDepthMm: 20,
      slotSpacingMm: 5.5,
      stepRiseMm: 10,
    },
  },
];

export const METRIC_DRILLS_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
};

export const HEX_BITS_12_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'hex_bits_quarter',
  customSpecText: 'PH1, PH2, PZ1, PZ2, T10, T15, T20, T25, H3, H4, H5, H6',
  hexBitCount: 12,
  rows: 2,
  holeToleranceMm: 0.35,
  holeDepthMm: 16,
  includeBottomMagnets: true,
  includeEmbossedLabels: true,
};

export const ALLEN_KEYS_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'allen_keys',
  customSpecText: '1.5, 2, 2.5, 3, 4',
  rows: 1,
  holeDepthMm: 24,
  slotSpacingMm: 6.0,
  stepRiseMm: 0,
};

export const NOZZLE_RACK_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'printer_nozzles',
  formFactor: 'flat_tray',
  customSpecText: PRESET_DEFAULT_SPECS.printer_nozzles,
  rows: 1,
  holeDepthMm: 12,
  slotSpacingMm: 6.5,
  stepRiseMm: 0,
};

export const SKADIS_MAGNET_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'hex_bits_quarter',
  formFactor: 'skadis_wall',
  hexBitCount: 10,
  rows: 2,
  holeDepthMm: 15,
  includeBottomMagnets: true,
  includeEmbossedLabels: true,
};

export const OVERSIZED_RACK_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'custom',
  customSpecText: Array.from({ length: 24 }, (_, i) => (10 + i * 0.5).toFixed(1)).join(', '),
  rows: 1,
  slotSpacingMm: 8.0,
  holeDepthMm: 18,
};

export const XML_SPECIAL_LABEL_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'custom',
  customSpecText: 'M&M<1>:6.0, A>B"2:8.0',
  rows: 1,
  includeEmbossedLabels: true,
};

export const INVALID_EMPTY_CUSTOM_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  preset: 'custom',
  customSpecText: 'abc, -2, xyz',
};

export const INVALID_TOLERANCE_FIXTURE: ToolBitHolderOptions = {
  ...DEFAULT_TOOL_HOLDER_OPTIONS,
  holeToleranceMm: 0.95,
};
