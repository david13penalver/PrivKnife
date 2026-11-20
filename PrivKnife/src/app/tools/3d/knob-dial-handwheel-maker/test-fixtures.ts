import { DEFAULT_KNOB_OPTIONS, KnobDialHandwheelOptions } from './types';

export interface KnobPresetCard {
  id: string;
  name: string;
  patch: Partial<KnobDialHandwheelOptions>;
}

export const KNOB_PRESET_CARDS: KnobPresetCard[] = [
  {
    id: 'pot_dshaft_6mm',
    name: '6mm Potentiometer D-Shaft',
    patch: { ...DEFAULT_KNOB_OPTIONS },
  },
  {
    id: 'fluted_appliance_dial',
    name: 'Fluted Appliance Dial',
    patch: {
      gripStyle: 'fluted',
      gripDiameterMm: 44,
      gripHeightMm: 20,
      neckDiameterMm: 20,
      neckHeightMm: 6,
      knurlOrLobeCount: 8,
      topBevelMm: 1.6,
      driveType: 'd_shaft',
      shaftDiameterMm: 6.0,
      dFlatThicknessMm: 4.5,
      flatRotationDeg: 0,
      socketDepthMm: 18,
      fitToleranceMm: 0.25,
      includeIndicatorMark: true,
    },
  },
  {
    id: 'star_m6_handwheel',
    name: '5-Lobe M6 Star Handwheel',
    patch: {
      gripStyle: 'star_handwheel',
      gripDiameterMm: 48,
      gripHeightMm: 16,
      neckDiameterMm: 20,
      neckHeightMm: 5,
      knurlOrLobeCount: 5,
      topBevelMm: 1.4,
      driveType: 'captive_hex_nut',
      hardwarePreset: 'M6',
      socketDepthMm: 16,
      fitToleranceMm: 0.25,
      sacrificialBridgeLayer: true,
      includeIndicatorMark: false,
    },
  },
  {
    id: 'splined_t18_synth',
    name: 'T18 Splined Guitar / Synth Knob',
    patch: {
      gripStyle: 'knurled',
      gripDiameterMm: 22,
      gripHeightMm: 16,
      neckDiameterMm: 15,
      neckHeightMm: 2,
      knurlOrLobeCount: 24,
      topBevelMm: 1.2,
      driveType: 'splined',
      shaftDiameterMm: 6.0,
      splineTeethCount: 18,
      socketDepthMm: 14,
      fitToleranceMm: 0.2,
      includeIndicatorMark: true,
    },
  },
  {
    id: 'tripod_quarter20_wing',
    name: '1/4"-20 Tripod Bolt Wing',
    patch: {
      gripStyle: 'pointer_wing',
      gripDiameterMm: 30,
      gripHeightMm: 14,
      neckDiameterMm: 20,
      neckHeightMm: 5,
      knurlOrLobeCount: 3,
      topBevelMm: 1.2,
      driveType: 'captive_hex_bolt',
      hardwarePreset: 'quarter_20',
      socketDepthMm: 14,
      fitToleranceMm: 0.25,
      sacrificialBridgeLayer: true,
      includeIndicatorMark: true,
    },
  },
];

export const POTENTIOMETER_DSHAFT_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
};

export const FLUTED_APPLIANCE_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  ...KNOB_PRESET_CARDS[1].patch,
};

export const M6_STAR_NUT_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  ...KNOB_PRESET_CARDS[2].patch,
};

export const TRIPOD_BOLT_WING_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  ...KNOB_PRESET_CARDS[4].patch,
};

export const SPLINED_T18_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  ...KNOB_PRESET_CARDS[3].patch,
};

export const SET_SCREW_ROUND_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  gripStyle: 'knurled',
  gripDiameterMm: 26,
  gripHeightMm: 18,
  neckDiameterMm: 16,
  neckHeightMm: 4,
  driveType: 'set_screw_round',
  shaftDiameterMm: 6.35,
  socketDepthMm: 14,
  fitToleranceMm: 0.2,
};

export const INVALID_THIN_HUB_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  driveType: 'd_shaft',
  gripDiameterMm: 10,
  neckDiameterMm: 10,
  shaftDiameterMm: 8,
  fitToleranceMm: 0.2,
};

export const INVALID_DFLAT_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  driveType: 'd_shaft',
  shaftDiameterMm: 6.0,
  dFlatThicknessMm: 6.5,
};

export const INVALID_SOCKET_DEPTH_FIXTURE: KnobDialHandwheelOptions = {
  ...DEFAULT_KNOB_OPTIONS,
  gripHeightMm: 14,
  neckHeightMm: 2,
  socketDepthMm: 16,
};
