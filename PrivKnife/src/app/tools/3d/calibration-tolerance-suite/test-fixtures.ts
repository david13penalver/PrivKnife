import { CalibrationToleranceOptions, DEFAULT_CALIBRATION_OPTIONS } from './types';
export const gauge = DEFAULT_CALIBRATION_OPTIONS;
export const fitBlock: CalibrationToleranceOptions = { ...gauge, mode: 'fastener_fit_block' };
export const overhangs: CalibrationToleranceOptions = {
  ...gauge, mode: 'bridge_overhang_test', includeBridges: false, includeOverhangs: true,
};
export const bridges = { ...overhangs, includeBridges: true, includeOverhangs: false };
export const sheet: CalibrationToleranceOptions = {
  ...gauge, mode: 'first_layer_sheet', bedWidthMm: 256, bedDepthMm: 256, patchCount: 9,
};
