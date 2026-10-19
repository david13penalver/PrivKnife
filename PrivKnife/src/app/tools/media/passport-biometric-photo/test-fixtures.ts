import {
  CountryPreset,
  PassportBiometricPhotoOptions,
  PassportPreset,
  PassportSpecification,
} from './types';

export const PASSPORT_SPECS: Record<CountryPreset, PassportSpecification> = {
  us_2x2_inch: {
    name: 'US Passport & Visa (2x2 Inches)',
    country: 'United States',
    widthMm: 50.8,
    heightMm: 50.8,
    widthPx300Dpi: 600,
    heightPx300Dpi: 600,
    minHeadHeightMm: 25.0,
    maxHeadHeightMm: 35.0,
    complianceNotes: [
      'Dimensions: Exactly 2 x 2 inches (51 x 51 mm / 600x600 px at 300 DPI).',
      'Head Height: Between 1.0 inch and 1.375 inches (25 mm to 35 mm / 50% to 69% of image height).',
      'Background: Plain white or off-white background with zero shadows or patterns.',
      'Expression: Neutral facial expression with both eyes open and directly facing camera.',
    ],
  },
  eu_schengen_35x45mm: {
    name: 'Schengen / EU Standard (35x45 mm)',
    country: 'European Union / Germany / France / Spain / Italy',
    widthMm: 35.0,
    heightMm: 45.0,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    minHeadHeightMm: 32.0,
    maxHeadHeightMm: 36.0,
    complianceNotes: [
      'Dimensions: Exactly 35 mm wide by 45 mm high (413 x 531 px at 300 DPI).',
      'Head Height: Face must cover 70% to 80% of photo (32 mm to 36 mm from chin to crown).',
      'Background: Neutral light grey or off-white with uniform illumination.',
      'Framing: Close-up of head and top of shoulders, centered horizontally.',
    ],
  },
  uk_35x45mm: {
    name: 'UK Passport & Driving Licence (35x45 mm)',
    country: 'United Kingdom',
    widthMm: 35.0,
    heightMm: 45.0,
    widthPx300Dpi: 413,
    heightPx300Dpi: 531,
    minHeadHeightMm: 29.0,
    maxHeadHeightMm: 34.0,
    complianceNotes: [
      'Dimensions: Exactly 35 mm wide by 45 mm high.',
      'Head Height: Between 29 mm and 34 mm (crown to chin).',
      'Background: Plain cream or light grey background (NOT pure white).',
      'No Red Eye or Reflections: No glare on glasses; tinted glasses not permitted.',
    ],
  },
  canada_50x70mm: {
    name: 'Canadian Passport & Visa (50x70 mm)',
    country: 'Canada',
    widthMm: 50.0,
    heightMm: 70.0,
    widthPx300Dpi: 591,
    heightPx300Dpi: 827,
    minHeadHeightMm: 31.0,
    maxHeadHeightMm: 36.0,
    complianceNotes: [
      'Dimensions: Exactly 50 mm wide by 70 mm high.',
      'Head Height: Between 31 mm and 36 mm from chin to crown of head.',
      'Background: Plain white or light-coloured background.',
      'Lighting: Uniform without shadows on face or background.',
    ],
  },
  japan_30x40mm: {
    name: 'Japan Passport & My Number ID (30x40 mm)',
    country: 'Japan',
    widthMm: 30.0,
    heightMm: 40.0,
    widthPx300Dpi: 354,
    heightPx300Dpi: 472,
    minHeadHeightMm: 32.0,
    maxHeadHeightMm: 36.0,
    complianceNotes: [
      'Dimensions: Exactly 30 mm wide by 40 mm high (or 35x45 mm for official travel passport).',
      'Head Height: Between 32 mm and 36 mm.',
      'Background: Solid plain white or light blue background.',
    ],
  },
  china_33x48mm: {
    name: 'China Passport & Travel Visa (33x48 mm)',
    country: 'China',
    widthMm: 33.0,
    heightMm: 48.0,
    widthPx300Dpi: 390,
    heightPx300Dpi: 567,
    minHeadHeightMm: 28.0,
    maxHeadHeightMm: 33.0,
    complianceNotes: [
      'Dimensions: Exactly 33 mm wide by 48 mm high.',
      'Head Height: Between 28 mm and 33 mm.',
      'Background: Plain white without shadows or borders.',
    ],
  },
};

export const DEFAULT_PASSPORT_OPTIONS: PassportBiometricPhotoOptions = {
  countryPreset: 'us_2x2_inch',
  printSheetSize: '4x6_inches',
  backgroundColor: 'pure_white',
  cutGuideLines: true,
  exportDpi: 300,
  zoomLevel: 1.0,
  tiltAngleDeg: 0,
  brightness: 0,
  contrast: 0,
  panX: 0,
  panY: 0,
};

export const MINIMAL_PASSPORT_OPTIONS: PassportBiometricPhotoOptions = {
  countryPreset: 'eu_schengen_35x45mm',
  printSheetSize: 'single_digital',
  backgroundColor: 'original',
  cutGuideLines: false,
  exportDpi: 150,
  zoomLevel: 0.5,
  tiltAngleDeg: -15,
  brightness: -50,
  contrast: -50,
  panX: -100,
  panY: -100,
};

export const MAXIMUM_PASSPORT_OPTIONS: PassportBiometricPhotoOptions = {
  countryPreset: 'canada_50x70mm',
  printSheetSize: 'a4',
  backgroundColor: 'light_grey',
  cutGuideLines: true,
  exportDpi: 600,
  zoomLevel: 3.0,
  tiltAngleDeg: 15,
  brightness: 50,
  contrast: 50,
  panX: 100,
  panY: 100,
};

export const PASSPORT_PRESETS: PassportPreset[] = [
  {
    id: 'us_passport_4x6',
    name: 'US Passport 2x2" on 4x6" Sheet',
    description: 'Standard 4x6" photo print sheet with 4 borderless 2x2" photos and cutting marks',
    options: {
      countryPreset: 'us_2x2_inch',
      printSheetSize: '4x6_inches',
      backgroundColor: 'pure_white',
      cutGuideLines: true,
    },
  },
  {
    id: 'eu_schengen_4x6',
    name: 'EU / Schengen 35x45mm on 4x6"',
    description: 'Pack of 6 European Schengen compliant 35x45mm photos arranged on a 4x6" card',
    options: {
      countryPreset: 'eu_schengen_35x45mm',
      printSheetSize: '4x6_inches',
      backgroundColor: 'off_white',
      cutGuideLines: true,
    },
  },
  {
    id: 'uk_passport_print',
    name: 'UK Passport 35x45mm Sheet',
    description: 'Compliant UK HMPO passport photo sheet with subtle cream/grey background tint',
    options: {
      countryPreset: 'uk_35x45mm',
      printSheetSize: '4x6_inches',
      backgroundColor: 'light_grey',
      cutGuideLines: true,
    },
  },
  {
    id: 'us_digital_submission',
    name: 'US Visa / DV Lottery Single JPEG',
    description: 'Single square 600x600 px digital file for electronic DS-160 and Green Card lottery upload',
    options: {
      countryPreset: 'us_2x2_inch',
      printSheetSize: 'single_digital',
      backgroundColor: 'pure_white',
      cutGuideLines: false,
    },
  },
  {
    id: 'canada_visa_print',
    name: 'Canada 50x70mm Visa Photos',
    description: 'Large-format Canadian passport pictures with 2 units on a 4x6" photo paper grid',
    options: {
      countryPreset: 'canada_50x70mm',
      printSheetSize: '4x6_inches',
      backgroundColor: 'pure_white',
      cutGuideLines: true,
    },
  },
];

// 1x1 transparent pixel base64 PNG data URL for test fixtures
export const DUMMY_PORTRAIT_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export interface SamplePortrait {
  id: string;
  name: string;
  dataUrl: string;
}

export const SAMPLE_PORTRAITS: SamplePortrait[] = [
  {
    id: 'neutral_portrait',
    name: 'Sample Portrait (Neutral)',
    dataUrl: DUMMY_PORTRAIT_DATA_URL,
  },
  {
    id: 'formal_portrait',
    name: 'Formal Studio Portrait',
    dataUrl: DUMMY_PORTRAIT_DATA_URL,
  },
  {
    id: 'child_portrait',
    name: 'Child / Infant Portrait',
    dataUrl: DUMMY_PORTRAIT_DATA_URL,
  },
];

