export type DeviceType = 'phone' | 'tablet' | 'laptop' | 'browser';

export type AnglePreset =
  | 'front'
  | 'isometric-left'
  | 'isometric-right'
  | 'tilt-dynamic'
  | 'float';

export type ChassisColor =
  | 'midnight'
  | 'silver'
  | 'gold'
  | 'deep-purple'
  | 'cyber-black';

export type BackgroundStyle = 'transparent' | 'solid' | 'gradient';

export type GradientPreset =
  | 'sunset'
  | 'aurora'
  | 'cyberpunk'
  | 'hyper-purple'
  | 'minimal-light'
  | 'dark-slate'
  | 'emerald';

export type CanvasSizePreset =
  | 'twitter-landscape'
  | 'social-square'
  | 'app-store-portrait'
  | 'dribbble'
  | 'product-hunt';

export type ImageFitMode = 'contain' | 'cover' | 'stretch';

export type ExportScale = 1 | 2 | 4;

export type ExportFormat = 'png' | 'webp';

export interface MockupConfig {
  deviceType: DeviceType;
  anglePreset: AnglePreset;
  chassisColor: ChassisColor;
  customChassisColor?: string;
  backgroundStyle: BackgroundStyle;
  gradientPreset: GradientPreset;
  customBgColor: string;
  canvasSizePreset: CanvasSizePreset;
  imageFit: ImageFitMode;
  shadowIntensity: number; // 0 - 100
  shadowBlur: number; // 0 - 100
  shadowOffsetY: number; // 0 - 100
  glareOpacity: number; // 0 - 100
  deviceScale: number; // 0.5 - 1.5
  exportScale: ExportScale;
  exportFormat: ExportFormat;
}

export interface DeviceDimensions {
  width: number;
  height: number;
  bezelWidth: number;
  cornerRadius: number;
  aspectRatio: number;
  hasDynamicIsland?: boolean;
  hasNotch?: boolean;
  hasTrafficLights?: boolean;
}

export interface AffineTransform {
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  rotationRad: number;
  translateX: number;
  translateY: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ScreenBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  fileName: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}
