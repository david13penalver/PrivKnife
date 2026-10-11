import { LabelSheetConfig, LabelTemplate } from './types';

export const AVERY_5160: LabelTemplate = {
  id: 'avery-5160',
  name: 'Avery 5160 / 8160 (Address, 30 per sheet)',
  description: 'Standard 1" × 2-5/8" address labels, 3 columns × 10 rows on US Letter.',
  paperFormat: 'letter',
  paperWidthMm: 215.9,
  paperHeightMm: 279.4,
  columns: 3,
  rows: 10,
  labelWidthMm: 66.675,
  labelHeightMm: 25.4,
  marginTopMm: 12.7,
  marginLeftMm: 4.76,
  pitchHorizontalMm: 69.85,
  pitchVerticalMm: 25.4,
};

export const AVERY_5163: LabelTemplate = {
  id: 'avery-5163',
  name: 'Avery 5163 / 8163 (Shipping, 10 per sheet)',
  description: 'Large 2" × 4" shipping / product labels, 2 columns × 5 rows on US Letter.',
  paperFormat: 'letter',
  paperWidthMm: 215.9,
  paperHeightMm: 279.4,
  columns: 2,
  rows: 5,
  labelWidthMm: 101.6,
  labelHeightMm: 50.8,
  marginTopMm: 12.7,
  marginLeftMm: 3.96,
  pitchHorizontalMm: 106.36,
  pitchVerticalMm: 50.8,
};

export const AVERY_5167: LabelTemplate = {
  id: 'avery-5167',
  name: 'Avery 5167 / 8167 (Mini Barcode, 80 per sheet)',
  description: 'Compact 0.5" × 1.75" price tag labels, 4 columns × 20 rows on US Letter.',
  paperFormat: 'letter',
  paperWidthMm: 215.9,
  paperHeightMm: 279.4,
  columns: 4,
  rows: 20,
  labelWidthMm: 44.45,
  labelHeightMm: 12.7,
  marginTopMm: 12.7,
  marginLeftMm: 7.62,
  pitchHorizontalMm: 48.26,
  pitchVerticalMm: 12.7,
};

export const AVERY_L7160: LabelTemplate = {
  id: 'avery-l7160',
  name: 'Avery L7160 (A4 European, 21 per sheet)',
  description: 'Metric 63.5 × 38.1 mm address labels, 3 columns × 7 rows on A4.',
  paperFormat: 'a4',
  paperWidthMm: 210,
  paperHeightMm: 297,
  columns: 3,
  rows: 7,
  labelWidthMm: 63.5,
  labelHeightMm: 38.1,
  marginTopMm: 15.1,
  marginLeftMm: 7.2,
  pitchHorizontalMm: 65.5,
  pitchVerticalMm: 38.1,
};

export const STANDARD_LABEL_TEMPLATES: LabelTemplate[] = [
  AVERY_5160,
  AVERY_5163,
  AVERY_5167,
  AVERY_L7160,
];

export const SAMPLE_LABEL_ITEMS = [
  { value: 'SKU-8921-A', title: 'Wireless Keyboard', subtext: '$49.99 • Black' },
  { value: 'SKU-8921-B', title: 'Ergonomic Mouse', subtext: '$29.99 • Graphite' },
  { value: 'SKU-8921-C', title: 'USB-C Fast Charger', subtext: '$19.99 • 65W' },
  { value: 'SKU-8921-D', title: 'Braided HDMI Cable', subtext: '$12.50 • 2m' },
];

export const DEFAULT_SHEET_CONFIG: LabelSheetConfig = {
  template: AVERY_5160,
  symbology: 'CODE128',
  dataMode: 'single',
  items: SAMPLE_LABEL_ITEMS,
  singleItem: {
    value: 'SKU-10042',
    title: 'Acme Premium Widget',
    subtext: '$24.99 • In Stock',
  },
  sequenceConfig: {
    prefix: 'INV-',
    startNumber: 1001,
    count: 30,
    digits: 4,
    suffix: '',
  },
  startOffsetIndex: 0,
  showGuideLines: true,
  showHumanReadableBarcode: true,
  titleFontSize: 8,
  subtextFontSize: 7,
};
