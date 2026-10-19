import { NutritionLabelMakerOptions } from './types';

export const DEFAULT_FDA_OPTIONS: NutritionLabelMakerOptions = {
  regulatoryStandard: 'fda_standard_2016',
  productName: 'Organic Granola Crunch',
  servingSizeText: '2/3 cup (55g)',
  servingsPerContainer: '8',
  calories: 230,
  totalFatG: 8,
  saturatedFatG: 1,
  transFatG: 0,
  cholesterolMg: 0,
  sodiumMg: 160,
  totalCarbsG: 37,
  dietaryFiberG: 4,
  totalSugarsG: 12,
  addedSugarsG: 10,
  proteinG: 3,
  vitaminDMcg: 2,
  calciumMg: 260,
  ironMg: 8,
  potassiumMg: 240,
  exportFormat: 'svg',
  labelWidthPx: 320,
};

export const EU_1169_OPTIONS: NutritionLabelMakerOptions = {
  regulatoryStandard: 'eu_standard_1169',
  productName: 'Dark Chocolate 70%',
  servingSizeText: '25g portion',
  servingsPerContainer: '4',
  calories: 580,
  totalFatG: 42,
  saturatedFatG: 25,
  transFatG: 0,
  cholesterolMg: 5,
  sodiumMg: 20, // salt = 0.05g
  totalCarbsG: 36,
  dietaryFiberG: 10,
  totalSugarsG: 28,
  addedSugarsG: 28,
  proteinG: 8,
  vitaminDMcg: 0,
  calciumMg: 60,
  ironMg: 12,
  potassiumMg: 400,
  exportFormat: 'svg',
  labelWidthPx: 360,
};

export const SUPPLEMENT_FACTS_OPTIONS: NutritionLabelMakerOptions = {
  regulatoryStandard: 'fda_supplement_facts',
  productName: 'Daily Multivitamin & Minerals',
  servingSizeText: '2 Capsules',
  servingsPerContainer: '60',
  calories: 10,
  totalFatG: 0,
  saturatedFatG: 0,
  transFatG: 0,
  cholesterolMg: 0,
  sodiumMg: 10,
  totalCarbsG: 2,
  dietaryFiberG: 0,
  totalSugarsG: 0,
  addedSugarsG: 0,
  proteinG: 0,
  vitaminDMcg: 25,
  calciumMg: 500,
  ironMg: 18,
  potassiumMg: 100,
  exportFormat: 'svg',
  labelWidthPx: 340,
};

export const DUAL_COLUMN_OPTIONS: NutritionLabelMakerOptions = {
  regulatoryStandard: 'fda_dual_column',
  productName: 'Ice Cream Pint',
  servingSizeText: '2/3 cup (130g)',
  servingsPerContainer: '3',
  calories: 270,
  totalFatG: 15,
  saturatedFatG: 9,
  transFatG: 0.5,
  cholesterolMg: 55,
  sodiumMg: 90,
  totalCarbsG: 31,
  dietaryFiberG: 1,
  totalSugarsG: 28,
  addedSugarsG: 23,
  proteinG: 4,
  vitaminDMcg: 1.5,
  calciumMg: 150,
  ironMg: 0.5,
  potassiumMg: 210,
  exportFormat: 'svg',
  labelWidthPx: 420,
};

export const INVALID_NEGATIVE_CALORIES_OPTIONS: NutritionLabelMakerOptions = {
  ...DEFAULT_FDA_OPTIONS,
  calories: -50,
};

export const INVALID_CALORIES_OPTIONS = INVALID_NEGATIVE_CALORIES_OPTIONS;

export const INVALID_EMPTY_SERVING_OPTIONS: NutritionLabelMakerOptions = {
  ...DEFAULT_FDA_OPTIONS,
  servingSizeText: '',
};
