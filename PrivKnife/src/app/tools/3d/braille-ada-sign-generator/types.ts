export type SignPictogram =
  | 'none'
  | 'restroom_unisex'
  | 'restroom_men'
  | 'restroom_women'
  | 'accessible_wheelchair'
  | 'exit';

export type BrailleStandard = 'ada_compliant' | 'california_title24';

export type SignExportFormat = '3mf_multicolor' | 'stl_unified';

export interface BrailleAdaSignGeneratorOptions {
  roomTitle: string;
  subText: string;
  pictogram: SignPictogram;
  plaqueWidthMm: number;
  plaqueHeightMm: number;
  plaqueThicknessMm: number;
  tactileRaiseMm: number;
  brailleStandard: BrailleStandard;
  cornerRadiusMm: number;
  mountHoles: boolean;
  mountHoleDiameterMm: number;
  includeFrameBorder?: boolean;
  frameBorderWidthMm?: number;
}

export interface SignMetrics {
  plaqueWidthMm: number;
  plaqueHeightMm: number;
  plaqueThicknessMm: number;
  brailleDotCount: number;
  brailleCellCount: number;
  tactileCharacterCount: number;
  baseTriangles: number;
  tactileTriangles: number;
  brailleTriangles: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  adaComplianceNotes: string[];
}

export interface BrailleAdaSignGeneratorResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: SignMetrics;
  brailleTransliteration: string;
  unicodeBraille: string;
  error?: string;
}

export interface SignPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<BrailleAdaSignGeneratorOptions>;
}

export interface BrailleAdaSignWorkerRequest {
  id: number;
  options: BrailleAdaSignGeneratorOptions;
  format: SignExportFormat;
}

export interface BrailleAdaSignWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: SignMetrics;
  brailleTransliteration?: string;
  unicodeBraille?: string;
  error?: string;
}
