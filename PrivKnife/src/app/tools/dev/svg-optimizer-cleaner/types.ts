export type CodeExportFormat = 'svg' | 'react_tsx' | 'vue_sfc' | 'svelte' | 'data_uri';

export interface SvgOptimizerCleanerOptions {
  floatPrecision: number;
  stripMetadataComments: boolean;
  cleanupIds: boolean;
  collapseUselessGroups: boolean;
  convertColorsToHex: boolean;
  removeDimensionsForViewBox: boolean;
  codeExportFormat: CodeExportFormat;
  componentName: string;
}

export interface SvgOptimizationStats {
  originalBytes: number;
  optimizedBytes: number;
  savingsBytes: number;
  savingsPercent: number;
  originalNodeCount?: number;
  optimizedNodeCount?: number;
}

export interface SvgOptimizerCleanerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  code: string;
  optimizedSvg: string;
  stats: SvgOptimizationStats;
  metadata?: Record<string, unknown>;
  error?: string;
}
