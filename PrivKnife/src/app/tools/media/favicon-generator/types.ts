export interface FaviconSizeSpec {
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
  platform: 'browser' | 'ios' | 'android' | 'windows';
  purpose?: string;
}

export interface FaviconConfig {
  siteName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  paddingPercent: number;
  generateIco: boolean;
  generateAppleTouch: boolean;
  generateAndroidPwa: boolean;
  generateManifest: boolean;
}

export interface GeneratedIconAsset {
  fileName: string;
  width: number;
  height: number;
  mimeType: string;
  blob: Blob;
  previewUrl?: string;
}

export interface FaviconSuiteResult {
  assets: GeneratedIconAsset[];
  icoBlob?: Blob;
  manifestJson: string;
  htmlSnippet: string;
}

export interface WebManifestData {
  name: string;
  short_name: string;
  icons: {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }[];
  theme_color: string;
  background_color: string;
  display: 'standalone';
}
