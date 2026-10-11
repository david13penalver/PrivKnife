import { FaviconConfig, FaviconSizeSpec } from './types';

export const STANDARD_FAVICON_SPECS: FaviconSizeSpec[] = [
  {
    fileName: 'favicon-16x16.png',
    width: 16,
    height: 16,
    mimeType: 'image/png',
    platform: 'browser',
  },
  {
    fileName: 'favicon-32x32.png',
    width: 32,
    height: 32,
    mimeType: 'image/png',
    platform: 'browser',
  },
  {
    fileName: 'favicon-48x48.png',
    width: 48,
    height: 48,
    mimeType: 'image/png',
    platform: 'browser',
  },
  {
    fileName: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    mimeType: 'image/png',
    platform: 'ios',
  },
  {
    fileName: 'android-chrome-192x192.png',
    width: 192,
    height: 192,
    mimeType: 'image/png',
    platform: 'android',
    purpose: 'maskable any',
  },
  {
    fileName: 'android-chrome-512x512.png',
    width: 512,
    height: 512,
    mimeType: 'image/png',
    platform: 'android',
    purpose: 'maskable any',
  },
];

export const DEFAULT_FAVICON_CONFIG: FaviconConfig = {
  siteName: 'My Web Application',
  shortName: 'WebApp',
  themeColor: '#0f172a',
  backgroundColor: '#ffffff',
  paddingPercent: 0,
  generateIco: true,
  generateAppleTouch: true,
  generateAndroidPwa: true,
  generateManifest: true,
};

export function createMockImageFile(
  name = 'logo-source.png',
  type = 'image/png',
  sizeBytes = 2048
): File {
  const content = new Uint8Array(sizeBytes);
  content[0] = 0x89;
  content[1] = 0x50;
  content[2] = 0x4e;
  content[3] = 0x47;
  return new File([content], name, { type });
}
