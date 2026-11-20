import {
  DEFAULT_RUGGED_BOX_OPTIONS,
  RuggedBoxPreset,
  RuggedHingedBoxOptions,
} from './types';

export const STANDARD_BOX_FIXTURE: RuggedHingedBoxOptions = {
  ...DEFAULT_RUGGED_BOX_OPTIONS,
  innerLengthMm: 120,
  innerWidthMm: 80,
  baseDepthMm: 35,
  lidDepthMm: 18,
  wallThicknessMm: 3.0,
  cornerRadiusMm: 6.0,
  ribCountPerSide: 2,
  hingeType: 'print_in_place',
  hingeClearanceMm: 0.35,
  latchType: 'snap_compliant',
  includeGasketChannel: false,
  dividerMode: 'none',
  dividerCols: 1,
  dividerRows: 1,
  frontLabelText: 'TOOLS',
  previewOpen: true,
};

export const WIDE_TWO_LATCH_GASKET_FIXTURE: RuggedHingedBoxOptions = {
  ...DEFAULT_RUGGED_BOX_OPTIONS,
  innerLengthMm: 160,
  innerWidthMm: 100,
  baseDepthMm: 40,
  lidDepthMm: 22,
  wallThicknessMm: 3.2,
  cornerRadiusMm: 8.0,
  ribCountPerSide: 4,
  hingeType: 'm3_screw',
  hingeClearanceMm: 0.3,
  latchType: 'snap_compliant',
  includeGasketChannel: true,
  dividerMode: 'removable_tray',
  dividerCols: 4,
  dividerRows: 3,
  frontLabelText: 'M3 HARDWARE',
  previewOpen: true,
};

export const M3_SCREW_HINGE_FIXTURE: RuggedHingedBoxOptions = {
  ...STANDARD_BOX_FIXTURE,
  hingeType: 'm3_screw',
};

export const FILAMENT_PIN_HINGE_FIXTURE: RuggedHingedBoxOptions = {
  ...STANDARD_BOX_FIXTURE,
  hingeType: 'filament_pin',
};

export const OVERSIZED_BOX_FIXTURE: RuggedHingedBoxOptions = {
  ...DEFAULT_RUGGED_BOX_OPTIONS,
  innerLengthMm: 220,
  innerWidthMm: 180,
  baseDepthMm: 80,
  lidDepthMm: 35,
  wallThicknessMm: 4.0,
  cornerRadiusMm: 10.0,
  ribCountPerSide: 4,
  includeGasketChannel: true,
  dividerMode: 'removable_tray',
  dividerCols: 6,
  dividerRows: 4,
  frontLabelText: 'FIELD KIT',
};

export const INVALID_SMALL_LENGTH_FIXTURE: RuggedHingedBoxOptions = {
  ...STANDARD_BOX_FIXTURE,
  innerLengthMm: 20,
};

export const INVALID_THIN_WALL_FIXTURE: RuggedHingedBoxOptions = {
  ...STANDARD_BOX_FIXTURE,
  wallThicknessMm: 0.5,
};

export const XML_SPECIAL_BOX_LABEL_FIXTURE: RuggedHingedBoxOptions = {
  ...WIDE_TWO_LATCH_GASKET_FIXTURE,
  frontLabelText: 'M3 & M4 <KIT>',
};

export const RUGGED_BOX_PRESETS: RuggedBoxPreset[] = [
  {
    id: 'm3_fastener_case',
    name: 'M3 Fastener Organizer (4x2)',
    description: '120x80x35mm M3 screw-hinge case, 4x2 molded dividers, TPU seal.',
    options: { ...DEFAULT_RUGGED_BOX_OPTIONS },
  },
  {
    id: 'waterproof_camera_box',
    name: 'Waterproof Field Filter Case',
    description: '140x95x45mm rugged box, twin front latches, 2.4mm TPU gasket channel.',
    options: {
      ...DEFAULT_RUGGED_BOX_OPTIONS,
      innerLengthMm: 140,
      innerWidthMm: 95,
      baseDepthMm: 45,
      lidDepthMm: 22,
      wallThicknessMm: 3.4,
      cornerRadiusMm: 8.0,
      ribCountPerSide: 3,
      hingeType: 'm3_screw',
      latchType: 'snap_compliant',
      includeGasketChannel: true,
      dividerMode: 'removable_tray',
      dividerCols: 3,
      dividerRows: 2,
      frontLabelText: 'FILTERS',
    },
  },
  {
    id: 'print_in_place_edc',
    name: 'Compact EDC Pocket Box',
    description: '90x65x26mm print-in-place hinge box, single snap latch, zero hardware.',
    options: {
      ...DEFAULT_RUGGED_BOX_OPTIONS,
      innerLengthMm: 90,
      innerWidthMm: 65,
      baseDepthMm: 26,
      lidDepthMm: 14,
      wallThicknessMm: 2.6,
      cornerRadiusMm: 6.0,
      ribCountPerSide: 1,
      hingeType: 'print_in_place',
      hingeClearanceMm: 0.35,
      latchType: 'snap_compliant',
      includeGasketChannel: false,
      dividerMode: 'none',
      dividerCols: 1,
      dividerRows: 1,
      frontLabelText: 'EDC KIT',
    },
  },
  {
    id: 'multimeter_field_case',
    name: 'Multimeter & Leads Caddy',
    description: '185x105x50mm heavy ribbed bench case with removable divider tray.',
    options: {
      ...DEFAULT_RUGGED_BOX_OPTIONS,
      innerLengthMm: 185,
      innerWidthMm: 105,
      baseDepthMm: 50,
      lidDepthMm: 24,
      wallThicknessMm: 3.6,
      cornerRadiusMm: 9.0,
      ribCountPerSide: 4,
      hingeType: 'filament_pin',
      hingeClearanceMm: 0.3,
      latchType: 'snap_compliant',
      includeGasketChannel: true,
      dividerMode: 'removable_tray',
      dividerCols: 2,
      dividerRows: 1,
      frontLabelText: 'METER',
    },
  },
  {
    id: 'mini_first_aid',
    name: 'First-Aid & Medical Pouch',
    description: '110x75x32mm friction-slide latch case with sealed TPU perimeter groove.',
    options: {
      ...DEFAULT_RUGGED_BOX_OPTIONS,
      innerLengthMm: 110,
      innerWidthMm: 75,
      baseDepthMm: 32,
      lidDepthMm: 16,
      wallThicknessMm: 2.8,
      cornerRadiusMm: 7.0,
      ribCountPerSide: 2,
      hingeType: 'm3_screw',
      latchType: 'friction_slide',
      includeGasketChannel: true,
      dividerMode: 'molded_fixed',
      dividerCols: 3,
      dividerRows: 2,
      frontLabelText: 'FIRST AID',
    },
  },
];
