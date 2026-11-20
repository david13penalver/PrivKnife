export type AsciiQrTab = 'ascii_banner' | 'image_ascii' | 'qr_studio' | 'barcode_1d';

export type AsciiBannerFont =
  | 'standard'
  | 'block'
  | 'slant'
  | 'shadow'
  | 'small'
  | 'banner3d';

export type CommentWrapper =
  | 'none'
  | 'js_line'
  | 'js_block'
  | 'hash'
  | 'html'
  | 'sql';

export type ImageAsciiMode = 'ramp_dense' | 'ramp_simple' | 'blocks' | 'braille';

export type QrPayloadType = 'text_url' | 'wifi' | 'vcard' | 'email' | 'sms' | 'geo';

export type QrModuleStyle = 'square' | 'rounded' | 'dots';

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export type Barcode1dFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39' | 'ITF14';

export interface AsciiBannerOptions {
  text: string;
  font: AsciiBannerFont;
  letterSpacing: number; // 0..3
  commentWrapper: CommentWrapper;
}

export interface ImageAsciiOptions {
  mode: ImageAsciiMode;
  columns: number; // 1..160
  contrast: number; // 0.5..2.0
  invertLuminance: boolean;
  ditherBraille: boolean;
}

export interface PixelGridInput {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
}

export interface QrWifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface QrVcardData {
  fullName: string;
  phone: string;
  email: string;
  organization: string;
  website: string;
}

export interface QrEmailData {
  to: string;
  subject: string;
  body: string;
}

export interface QrSmsData {
  phone: string;
  message: string;
}

export interface QrGeoData {
  latitude: string;
  longitude: string;
}

export interface QrStudioOptions {
  payloadType: QrPayloadType;
  rawText: string;
  wifi: QrWifiData;
  vcard: QrVcardData;
  email: QrEmailData;
  sms: QrSmsData;
  geo: QrGeoData;
  errorCorrection: QrErrorCorrection;
  moduleStyle: QrModuleStyle;
  foregroundHex: string;
  backgroundHex: string;
  quietZoneModules: number; // 1..8
  exportSizePx: number; // 256..2048
  logoDataUrl?: string;
  logoScalePercent: number; // 10..22
}

export interface QrContrastCheck {
  ratio: number;
  isScannable: boolean;
  warningKey?: string;
}

export interface QrRenderResult {
  success: boolean;
  payload: string;
  svg: string;
  moduleCount: number;
  effectiveErrorCorrection: QrErrorCorrection;
  contrast: QrContrastCheck;
  error?: string;
}

export interface Barcode1dOptions {
  value: string;
  format: Barcode1dFormat;
  displayValue: boolean;
  lineColor: string;
  background: string;
  barWidth: number; // 1..4
  height: number; // 40..160
}

export interface Barcode1dRenderResult {
  success: boolean;
  svg: string;
  error?: string;
}

export const ASCII_BANNER_FONTS: readonly AsciiBannerFont[] = [
  'standard',
  'block',
  'slant',
  'shadow',
  'small',
  'banner3d',
];

export const COMMENT_WRAPPERS: readonly CommentWrapper[] = [
  'none',
  'js_line',
  'js_block',
  'hash',
  'html',
  'sql',
];

export const IMAGE_ASCII_MODES: readonly ImageAsciiMode[] = [
  'ramp_dense',
  'ramp_simple',
  'blocks',
  'braille',
];

export const QR_PAYLOAD_TYPES: readonly QrPayloadType[] = [
  'text_url',
  'wifi',
  'vcard',
  'email',
  'sms',
  'geo',
];

export const BARCODE_1D_FORMATS: readonly Barcode1dFormat[] = [
  'CODE128',
  'EAN13',
  'UPC',
  'CODE39',
  'ITF14',
];

export const DEFAULT_BANNER_OPTIONS: AsciiBannerOptions = {
  text: 'PRIVKNIFE',
  font: 'standard',
  letterSpacing: 1,
  commentWrapper: 'none',
};

export const DEFAULT_IMAGE_ASCII_OPTIONS: ImageAsciiOptions = {
  mode: 'braille',
  columns: 80,
  contrast: 1.0,
  invertLuminance: false,
  ditherBraille: true,
};

export const DEFAULT_QR_OPTIONS: QrStudioOptions = {
  payloadType: 'text_url',
  rawText: 'https://privknife.app',
  wifi: {
    ssid: 'Home_WiFi',
    password: 'MyLocalPassword',
    encryption: 'WPA',
    hidden: false,
  },
  vcard: {
    fullName: 'Ada Lovelace',
    phone: '+1-555-0199',
    email: 'ada@example.com',
    organization: 'Analytical Engines Inc.',
    website: 'https://example.com',
  },
  email: {
    to: 'security@example.com',
    subject: 'Local Draft',
    body: 'Offline message',
  },
  sms: {
    phone: '+1-555-0199',
    message: 'Hello from PrivKnife',
  },
  geo: {
    latitude: '40.4168',
    longitude: '-3.7038',
  },
  errorCorrection: 'M',
  moduleStyle: 'rounded',
  foregroundHex: '#0f172a',
  backgroundHex: '#ffffff',
  quietZoneModules: 3,
  exportSizePx: 1024,
  logoScalePercent: 18,
};

export const DEFAULT_BARCODE_OPTIONS: Barcode1dOptions = {
  value: 'PRIVKNIFE-128',
  format: 'CODE128',
  displayValue: true,
  lineColor: '#0f172a',
  background: '#ffffff',
  barWidth: 2,
  height: 80,
};
