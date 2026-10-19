export type RegulatoryStandard =
  | 'fda_standard_2016'
  | 'fda_supplement_facts'
  | 'eu_standard_1169'
  | 'fda_dual_column';

export type LabelExportFormat = 'svg' | 'png' | 'pdf';

export interface NutritionLabelMakerOptions {
  regulatoryStandard: RegulatoryStandard;
  productName?: string;
  servingSizeText: string;
  servingsPerContainer: string;
  calories: number;
  totalFatG: number;
  saturatedFatG: number;
  transFatG: number;
  cholesterolMg: number;
  sodiumMg: number;
  totalCarbsG: number;
  dietaryFiberG: number;
  totalSugarsG: number;
  addedSugarsG: number;
  proteinG: number;
  vitaminDMcg: number;
  calciumMg: number;
  ironMg: number;
  potassiumMg: number;
  exportFormat?: LabelExportFormat;
  labelWidthPx?: number;
}

export interface CalculatedNutrientDV {
  name: string;
  amount: number;
  unit: string;
  dailyValuePercent: number | null;
  indent?: boolean;
  bold?: boolean;
}

export interface NutritionLabelMetadata {
  standard: RegulatoryStandard;
  calories: number;
  servingSize: string;
  servingsPerContainer: string;
  format: LabelExportFormat;
  widthPx: number;
  heightPx: number;
}

export interface NutritionLabelMakerResult {
  success: boolean;
  blob: Blob;
  svgString: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: NutritionLabelMetadata;
  error?: string;
}
