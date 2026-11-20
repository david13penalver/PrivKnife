import {
  BatteryCasePreset,
  BatterySdcardCaseOptions,
  DEFAULT_BATTERY_CASE_OPTIONS,
} from './types';

export const AA_DISPENSER_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'battery_dispenser',
  cellPreset: 'aa',
  stackCount: 10,
  rampAngleDeg: 18,
  mountStyle: 'desk',
  includeViewSlot: true,
  wallThicknessMm: 2.0,
  fitToleranceMm: 0.4,
  labelText: 'AA',
  includeEmbossedLabel: true,
};

export const MIXED_SLIDING_CASE_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'memory_card_case',
  cardCaseStyle: 'sliding_dovetail',
  sdSlots: 4,
  microSdSlots: 8,
  cfExpressSlots: 0,
  switchCartSlots: 0,
  usbASlots: 0,
  usbCSlots: 2,
  wallThicknessMm: 2.2,
  fitToleranceMm: 0.3,
  labelText: 'SD/USB',
  includeEmbossedLabel: true,
};

export const CLAMSHELL_CASE_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'memory_card_case',
  cardCaseStyle: 'snap_clamshell',
  sdSlots: 2,
  microSdSlots: 6,
  cfExpressSlots: 2,
  switchCartSlots: 2,
  usbASlots: 1,
  usbCSlots: 1,
  wallThicknessMm: 2.0,
  fitToleranceMm: 0.35,
  labelText: 'EDC MEDIA',
  includeEmbossedLabel: true,
};

export const OPEN_TRAY_MICROSD_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'memory_card_case',
  cardCaseStyle: 'open_tray',
  sdSlots: 0,
  microSdSlots: 24,
  cfExpressSlots: 0,
  switchCartSlots: 0,
  usbASlots: 0,
  usbCSlots: 0,
  wallThicknessMm: 1.4,
  fitToleranceMm: 0.25,
  labelText: 'uSD x24',
  includeEmbossedLabel: false,
};

export const OVERSIZED_BED_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'battery_dispenser',
  cellPreset: '21700',
  stackCount: 24,
  rampAngleDeg: 25,
  mountStyle: 'wall_keyhole',
  wallThicknessMm: 3.0,
  fitToleranceMm: 0.45,
  labelText: '21700',
};

export const INVALID_ZERO_SLOTS_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'memory_card_case',
  sdSlots: 0,
  microSdSlots: 0,
  cfExpressSlots: 0,
  switchCartSlots: 0,
  usbASlots: 0,
  usbCSlots: 0,
};

export const INVALID_STACK_FIXTURE: BatterySdcardCaseOptions = {
  ...DEFAULT_BATTERY_CASE_OPTIONS,
  mode: 'battery_dispenser',
  stackCount: 2,
};

export const XML_SPECIAL_LABEL_FIXTURE: BatterySdcardCaseOptions = {
  ...MIXED_SLIDING_CASE_FIXTURE,
  labelText: 'A&B <1>',
  includeEmbossedLabel: true,
};

export const BATTERY_CASE_PRESETS: BatteryCasePreset[] = [
  {
    id: 'aa_desk_10',
    name: 'AA Gravity Desk Dispenser (10x)',
    description: '10x AA cells, 18° gravity chute, front feed lip, viewing slot.',
    options: { ...AA_DISPENSER_FIXTURE },
  },
  {
    id: '18650_skadis_8',
    name: '18650 IKEA Skadis Magazine (8x)',
    description: '8x 18650 Li-Ion dispenser with integrated 5mm Skadis pegboard hooks.',
    options: {
      ...DEFAULT_BATTERY_CASE_OPTIONS,
      mode: 'battery_dispenser',
      cellPreset: '18650',
      stackCount: 8,
      rampAngleDeg: 18,
      mountStyle: 'skadis',
      includeViewSlot: true,
      wallThicknessMm: 2.4,
      fitToleranceMm: 0.45,
      labelText: '18650',
      includeEmbossedLabel: true,
    },
  },
  {
    id: 'aaa_wall_16',
    name: 'AAA Wall-Mount Keyhole Rack (16x)',
    description: 'High-capacity 16x AAA stack with rear keyhole screw mounting slots.',
    options: {
      ...DEFAULT_BATTERY_CASE_OPTIONS,
      mode: 'battery_dispenser',
      cellPreset: 'aaa',
      stackCount: 16,
      rampAngleDeg: 16,
      mountStyle: 'wall_keyhole',
      includeViewSlot: true,
      wallThicknessMm: 2.0,
      fitToleranceMm: 0.35,
      labelText: 'AAA',
      includeEmbossedLabel: true,
    },
  },
  {
    id: 'photographer_edc',
    name: 'Photographer SD / CFexpress Case',
    description: 'Sliding dovetail case: 4x SD, 8x MicroSD, 2x CFexpress, 2x USB-C.',
    options: {
      ...DEFAULT_BATTERY_CASE_OPTIONS,
      mode: 'memory_card_case',
      cardCaseStyle: 'sliding_dovetail',
      sdSlots: 4,
      microSdSlots: 8,
      cfExpressSlots: 2,
      switchCartSlots: 0,
      usbASlots: 0,
      usbCSlots: 2,
      wallThicknessMm: 2.2,
      fitToleranceMm: 0.3,
      labelText: 'PHOTO EDC',
      includeEmbossedLabel: true,
    },
  },
  {
    id: 'switch_clamshell',
    name: 'Travel Switch & MicroSD Clamshell',
    description: '8x Switch game carts + 6x MicroSD in a print-ready hinged snap case.',
    options: {
      ...DEFAULT_BATTERY_CASE_OPTIONS,
      mode: 'memory_card_case',
      cardCaseStyle: 'snap_clamshell',
      sdSlots: 0,
      microSdSlots: 6,
      cfExpressSlots: 0,
      switchCartSlots: 8,
      usbASlots: 0,
      usbCSlots: 0,
      wallThicknessMm: 2.0,
      fitToleranceMm: 0.3,
      labelText: 'CARTS',
      includeEmbossedLabel: true,
    },
  },
];
