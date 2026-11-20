import * as THREE from 'three';

export type BatteryCaseMode = 'battery_dispenser' | 'memory_card_case';

export type BatteryCellPreset = 'aaa' | 'aa' | 'c' | 'cr2032' | '9v' | '18650' | '21700';

export type DispenserMountStyle = 'desk' | 'wall_keyhole' | 'skadis' | 'magnetic';

export type CardCaseStyle = 'sliding_dovetail' | 'snap_clamshell' | 'open_tray';

export interface BatterySdcardCaseOptions {
  mode: BatteryCaseMode;
  // Battery Dispenser
  cellPreset: BatteryCellPreset;
  stackCount: number; // 4..24
  rampAngleDeg: number; // 12..30
  mountStyle: DispenserMountStyle;
  includeViewSlot: boolean;
  // Memory Card Case
  cardCaseStyle: CardCaseStyle;
  sdSlots: number; // 0..16
  microSdSlots: number; // 0..24
  cfExpressSlots: number; // 0..8
  switchCartSlots: number; // 0..12
  usbASlots: number; // 0..8
  usbCSlots: number; // 0..8
  // Common Fabrication
  wallThicknessMm: number; // 1.4..4.0
  fitToleranceMm: number; // 0.15..0.60
  labelText: string;
  includeEmbossedLabel: boolean;
  bodyColorHex: string;
  accentColorHex: string;
}

export interface BatteryCaseMetrics {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedVolumeCm3: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
}

export interface BatteryCellSpec {
  id: BatteryCellPreset;
  label: string;
  diameterMm: number;
  lengthMm: number;
  stackPitchMm: number;
  chuteDepthMm: number;
  chuteSpanMm: number;
  shape: 'cylinder' | 'coin' | 'rectangular';
}

export const BATTERY_CELL_SPECS: Record<BatteryCellPreset, BatteryCellSpec> = {
  aaa: {
    id: 'aaa',
    label: 'AAA (10.5 x 44.5 mm)',
    diameterMm: 10.5,
    lengthMm: 44.5,
    stackPitchMm: 10.5,
    chuteDepthMm: 10.5,
    chuteSpanMm: 44.5,
    shape: 'cylinder',
  },
  aa: {
    id: 'aa',
    label: 'AA (14.5 x 50.5 mm)',
    diameterMm: 14.5,
    lengthMm: 50.5,
    stackPitchMm: 14.5,
    chuteDepthMm: 14.5,
    chuteSpanMm: 50.5,
    shape: 'cylinder',
  },
  c: {
    id: 'c',
    label: 'C Cell (26.2 x 50.0 mm)',
    diameterMm: 26.2,
    lengthMm: 50.0,
    stackPitchMm: 26.2,
    chuteDepthMm: 26.2,
    chuteSpanMm: 50.0,
    shape: 'cylinder',
  },
  cr2032: {
    id: 'cr2032',
    label: 'CR2032 Coin (20.0 x 3.2 mm)',
    diameterMm: 20.0,
    lengthMm: 3.2,
    stackPitchMm: 3.6,
    chuteDepthMm: 20.0,
    chuteSpanMm: 20.0,
    shape: 'coin',
  },
  '9v': {
    id: '9v',
    label: '9V Block (26.5 x 17.5 x 48.5 mm)',
    diameterMm: 17.5,
    lengthMm: 48.5,
    stackPitchMm: 17.5,
    chuteDepthMm: 26.5,
    chuteSpanMm: 48.5,
    shape: 'rectangular',
  },
  '18650': {
    id: '18650',
    label: '18650 Li-Ion (18.6 x 65.2 mm)',
    diameterMm: 18.6,
    lengthMm: 65.2,
    stackPitchMm: 18.6,
    chuteDepthMm: 18.6,
    chuteSpanMm: 65.2,
    shape: 'cylinder',
  },
  '21700': {
    id: '21700',
    label: '21700 Li-Ion (21.7 x 70.5 mm)',
    diameterMm: 21.7,
    lengthMm: 70.5,
    stackPitchMm: 21.7,
    chuteDepthMm: 21.7,
    chuteSpanMm: 70.5,
    shape: 'cylinder',
  },
};

export interface MediaSlotSpec {
  id: 'sd' | 'microSd' | 'cfExpress' | 'switchCart' | 'usbA' | 'usbC';
  label: string;
  widthMm: number;
  thicknessMm: number;
  depthMm: number;
}

export const MEDIA_SLOT_SPECS: Record<MediaSlotSpec['id'], MediaSlotSpec> = {
  sd: {
    id: 'sd',
    label: 'SD Card',
    widthMm: 24.0,
    thicknessMm: 2.1,
    depthMm: 20.0,
  },
  microSd: {
    id: 'microSd',
    label: 'MicroSD',
    widthMm: 11.0,
    thicknessMm: 1.0,
    depthMm: 10.5,
  },
  cfExpress: {
    id: 'cfExpress',
    label: 'CFexpress B',
    widthMm: 29.6,
    thicknessMm: 3.8,
    depthMm: 24.0,
  },
  switchCart: {
    id: 'switchCart',
    label: 'Switch Cart',
    widthMm: 21.2,
    thicknessMm: 3.2,
    depthMm: 20.0,
  },
  usbA: {
    id: 'usbA',
    label: 'USB-A',
    widthMm: 12.0,
    thicknessMm: 4.5,
    depthMm: 16.0,
  },
  usbC: {
    id: 'usbC',
    label: 'USB-C',
    widthMm: 8.5,
    thicknessMm: 3.2,
    depthMm: 12.0,
  },
};

export const STANDARD_BED_SIZE_MM = 220;

export const DEFAULT_BATTERY_CASE_OPTIONS: BatterySdcardCaseOptions = {
  mode: 'battery_dispenser',
  cellPreset: 'aa',
  stackCount: 10,
  rampAngleDeg: 18,
  mountStyle: 'desk',
  includeViewSlot: true,
  cardCaseStyle: 'sliding_dovetail',
  sdSlots: 4,
  microSdSlots: 8,
  cfExpressSlots: 0,
  switchCartSlots: 0,
  usbASlots: 2,
  usbCSlots: 2,
  wallThicknessMm: 2.0,
  fitToleranceMm: 0.4,
  labelText: 'AA',
  includeEmbossedLabel: true,
  bodyColorHex: '#2563eb',
  accentColorHex: '#f8fafc',
};

export interface BatteryCaseLayoutMeta {
  innerChuteWidthMm?: number;
  chuteChannelDepthMm?: number;
  minDividerWallMm?: number;
  totalSlots?: number;
  estimatedVolumeCm3: number;
  lidOffsetXMm: number;
}

export interface BatteryCaseParts {
  bodyGeometry: THREE.BufferGeometry;
  lidGeometry: THREE.BufferGeometry | null;
  labelGeometry: THREE.BufferGeometry | null;
  layoutMeta: BatteryCaseLayoutMeta;
  dispose: () => void;
}

export interface BatteryCaseValidationResult {
  valid: boolean;
  error?: string;
}

export interface BatteryCasePreset {
  id: string;
  name: string;
  description: string;
  options: BatterySdcardCaseOptions;
}

export interface BatteryCaseWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: BatterySdcardCaseOptions;
}

export interface BatteryCaseWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: BatteryCaseMetrics;
  error?: string;
}
