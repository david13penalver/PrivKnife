export type TagFormat = 'hanging_charm' | 'collar_slide_on';

export type CharmShape = 'bone' | 'circle' | 'heart' | 'shield' | 'hexagon';

export type EmergencyIcon = 'none' | 'medical_cross' | 'microchip' | 'paw' | 'heart';

export type TagExportFormat = '3mf_multicolor' | 'stl_unified';

export interface PetIdTagGeneratorOptions {
  tagFormat: TagFormat;
  charmShape: CharmShape;
  collarWidthMm: number; // 12 - 45 mm
  tagWidthMm: number; // 20 - 70 mm
  tagHeightMm: number; // 15 - 50 mm
  tagThicknessMm: number; // 1.5 - 5.0 mm
  petName: string;
  primaryPhone: string;
  secondaryPhone: string;
  emergencyIcon: EmergencyIcon;
  raisedTextHeightMm: number; // 0.4 - 2.0 mm
  holeDiameterMm: number; // 2.5 - 7.0 mm (hanging charm)
  slotWidthMm: number; // 2.0 - 6.0 mm (collar slide-on)
  curvedBand: boolean; // collar slide-on curvature
  dualSided: boolean; // hanging charm text on back
}

export interface PetTagMetrics {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  baseTriangles: number;
  textTriangles: number;
  iconTriangles: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  petSafetyTips: string[];
}

export interface PetIdTagGeneratorResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: PetTagMetrics;
  error?: string;
}

export interface PetTagPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<PetIdTagGeneratorOptions>;
}
