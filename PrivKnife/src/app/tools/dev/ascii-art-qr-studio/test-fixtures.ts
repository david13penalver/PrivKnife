import { DEFAULT_QR_OPTIONS, PixelGridInput, QrStudioOptions } from './types';

export function createSolidPixelPatch(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): PixelGridInput {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

export function createSingleDotBraillePatch(
  dotX: 0 | 1,
  dotY: 0 | 1 | 2 | 3,
): PixelGridInput {
  const patch = createSolidPixelPatch(2, 4, 255, 255, 255, 255);
  const idx = (dotY * 2 + dotX) * 4;
  patch.data[idx] = 0;
  patch.data[idx + 1] = 0;
  patch.data[idx + 2] = 0;
  return patch;
}

export const WIFI_ESCAPE_FIXTURE: QrStudioOptions = {
  ...DEFAULT_QR_OPTIONS,
  payloadType: 'wifi',
  wifi: {
    ssid: 'Home;Net',
    password: 'p:a\\s,s',
    encryption: 'WPA',
    hidden: false,
  },
};

export const VALID_TINY_LOGO_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
