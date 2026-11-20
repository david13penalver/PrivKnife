import { DEFAULT_JAR_RACK_OPTIONS, JarBottleRackOptions } from './types';

export const stadium = DEFAULT_JAR_RACK_OPTIONS;
export const honeycomb: JarBottleRackOptions = {
  ...stadium, preset: 'vallejo_17ml', topology: 'honeycomb_tray', bottleDiameterMm: 25.2,
  webWallThicknessMm: 2, columns: 4, rows: 3,
};
export const track: JarBottleRackOptions = {
  ...stadium, preset: 'nespresso_original', topology: 'capsule_track', bottleDiameterMm: 37.2,
};
export const thinWeb = { ...honeycomb, webWallThicknessMm: 0.4 };
