import { DEFAULT_DEVICE_CRADLE_OPTIONS, DeviceWallCradleOptions } from './types';

export interface DeviceCradlePresetCard {
  id: string;
  name: string;
  patch: Partial<DeviceWallCradleOptions>;
}

export const DEVICE_CRADLE_PRESET_CARDS: DeviceCradlePresetCard[] = [
  {
    id: 'gan_brick_140w',
    name: '140W USB-C Power Brick',
    patch: { ...DEFAULT_DEVICE_CRADLE_OPTIONS },
  },
  {
    id: 'wide_minipc_rails',
    name: 'Mini-PC / Xbox Slide Rails',
    patch: {
      cradleStyle: 'slide_rails_pair',
      deviceWidthMm: 185,
      deviceThicknessMm: 42,
      mountSpanMm: 110,
      wallThicknessMm: 4.0,
      fitClearanceMm: 0.8,
      railShelfWidthMm: 18,
      includeBackstop: true,
      includeThermalVents: true,
      mountFlangePlacement: 'external_ears',
      screwDiameterMm: 4.2,
    },
  },
  {
    id: 'apple_tv_router',
    name: 'Apple TV / Router Wall Cradle',
    patch: {
      cradleStyle: 'u_wrap_cradle',
      deviceWidthMm: 98,
      deviceThicknessMm: 31,
      mountSpanMm: 58,
      wallThicknessMm: 3.4,
      fitClearanceMm: 0.7,
      includeBackstop: true,
      includeThermalVents: true,
      mountFlangePlacement: 'internal_floor',
      screwDiameterMm: 4.2,
    },
  },
  {
    id: 'remote_wall_pocket',
    name: 'Remote Control Wall Pocket',
    patch: {
      cradleStyle: 'remote_pocket',
      deviceWidthMm: 48,
      deviceThicknessMm: 22,
      mountSpanMm: 115,
      wallThicknessMm: 3.0,
      fitClearanceMm: 1.0,
      includeBackstop: true,
      includeThermalVents: true,
      mountFlangePlacement: 'adhesive_flat',
      screwDiameterMm: 4.0,
    },
  },
];

export const GAN_BRICK_CRADLE_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
};

export const WIDE_MINIPC_RAILS_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  cradleStyle: 'slide_rails_pair',
  deviceWidthMm: 260,
  deviceThicknessMm: 45,
  mountSpanMm: 110,
  wallThicknessMm: 4.0,
  fitClearanceMm: 0.8,
  railShelfWidthMm: 18,
  includeBackstop: true,
  includeThermalVents: true,
  mountFlangePlacement: 'external_ears',
};

export const REMOTE_POCKET_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  ...DEVICE_CRADLE_PRESET_CARDS[3].patch,
};

export const INTERNAL_FLOOR_CRADLE_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  ...DEVICE_CRADLE_PRESET_CARDS[2].patch,
};

export const ADHESIVE_FLAT_CRADLE_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  mountFlangePlacement: 'adhesive_flat',
  includeThermalVents: false,
};

export const OVERSIZED_UCRADLE_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  cradleStyle: 'u_wrap_cradle',
  deviceWidthMm: 240,
  deviceThicknessMm: 40,
  mountSpanMm: 80,
};

export const INVALID_THIN_WALL_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  wallThicknessMm: 1.0,
};

export const INVALID_TINY_DEVICE_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  deviceWidthMm: 10,
};

export const INVALID_NARROW_FLOOR_MOUNT_FIXTURE: DeviceWallCradleOptions = {
  ...DEFAULT_DEVICE_CRADLE_OPTIONS,
  mountFlangePlacement: 'internal_floor',
  deviceWidthMm: 32,
};
