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

const makeSvgDataUrl = (svgContent: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent.trim())}`;

const NEUTRAL_PORTRAIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#f8fafc"/>
  <path d="M 110 800 C 110 650 180 580 300 580 C 420 580 490 650 490 800 Z" fill="#334155"/>
  <path d="M 240 580 Q 300 630 360 580" fill="#475569"/>
  <rect x="260" y="470" width="80" height="120" rx="10" fill="#fbd38d"/>
  <ellipse cx="300" cy="505" rx="55" ry="15" fill="#f6ad55" opacity="0.6"/>
  <ellipse cx="300" cy="370" rx="125" ry="155" fill="#fbd38d"/>
  <path d="M 175 360 C 160 210 230 180 300 180 C 370 180 440 210 425 360 C 400 240 370 215 300 215 C 230 215 200 240 175 360 Z" fill="#1e293b"/>
  <path d="M 215 320 Q 245 310 270 322" stroke="#1e293b" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M 330 322 Q 355 310 385 320" stroke="#1e293b" stroke-width="5" stroke-linecap="round" fill="none"/>
  <ellipse cx="245" cy="345" rx="18" ry="10" fill="#ffffff"/>
  <circle cx="245" cy="345" r="7" fill="#1e293b"/>
  <circle cx="247" cy="343" r="2" fill="#ffffff"/>
  <ellipse cx="355" cy="345" rx="18" ry="10" fill="#ffffff"/>
  <circle cx="355" cy="345" r="7" fill="#1e293b"/>
  <circle cx="357" cy="343" r="2" fill="#ffffff"/>
  <path d="M 296 345 L 292 405 Q 300 412 308 405 Z" fill="#ed8936"/>
  <path d="M 265 445 Q 300 452 335 445" stroke="#dd6b20" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M 275 445 Q 300 460 325 445" fill="#e53e3e" opacity="0.3"/>
</svg>`;

const FORMAL_PORTRAIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#f8fafc"/>
  <path d="M 90 800 C 90 640 160 570 300 570 C 440 570 510 640 510 800 Z" fill="#0f172a"/>
  <polygon points="250,570 350,570 300,670" fill="#ffffff"/>
  <polygon points="290,590 310,590 318,740 300,780 282,740" fill="#991b1b"/>
  <path d="M 230 570 L 270 690 L 210 740 Z" fill="#1e293b"/>
  <path d="M 370 570 L 330 690 L 390 740 Z" fill="#1e293b"/>
  <rect x="260" y="470" width="80" height="110" rx="10" fill="#fcd34d"/>
  <ellipse cx="300" cy="505" rx="55" ry="15" fill="#f59e0b" opacity="0.6"/>
  <ellipse cx="300" cy="370" rx="125" ry="155" fill="#fcd34d"/>
  <path d="M 170 350 C 160 200 230 170 300 170 C 370 170 435 200 430 350 C 410 230 380 205 300 205 C 220 205 190 230 170 350 Z" fill="#0f172a"/>
  <path d="M 215 320 Q 245 310 270 322" stroke="#0f172a" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M 330 322 Q 355 310 385 320" stroke="#0f172a" stroke-width="5" stroke-linecap="round" fill="none"/>
  <ellipse cx="245" cy="345" rx="18" ry="10" fill="#ffffff"/>
  <circle cx="245" cy="345" r="7" fill="#0f172a"/>
  <circle cx="247" cy="343" r="2" fill="#ffffff"/>
  <ellipse cx="355" cy="345" rx="18" ry="10" fill="#ffffff"/>
  <circle cx="355" cy="345" r="7" fill="#0f172a"/>
  <circle cx="357" cy="343" r="2" fill="#ffffff"/>
  <path d="M 296 345 L 292 405 Q 300 412 308 405 Z" fill="#d97706"/>
  <path d="M 265 445 Q 300 452 335 445" stroke="#b45309" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

const CHILD_PORTRAIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
  <rect width="600" height="800" fill="#f8fafc"/>
  <path d="M 130 800 C 130 670 190 620 300 620 C 410 620 470 670 470 800 Z" fill="#0284c7"/>
  <path d="M 250 620 Q 300 655 350 620" stroke="#0369a1" stroke-width="8" fill="none"/>
  <rect x="265" y="500" width="70" height="130" rx="10" fill="#fed7aa"/>
  <ellipse cx="300" cy="530" rx="50" ry="15" fill="#f97316" opacity="0.4"/>
  <ellipse cx="300" cy="400" rx="135" ry="145" fill="#fed7aa"/>
  <circle cx="220" cy="425" r="24" fill="#fb7185" opacity="0.35"/>
  <circle cx="380" cy="425" r="24" fill="#fb7185" opacity="0.35"/>
  <path d="M 160 380 C 150 230 210 195 300 195 C 390 195 450 230 440 380 C 420 270 390 260 300 260 C 210 260 180 270 160 380 Z" fill="#78350f"/>
  <path d="M 215 355 Q 245 348 268 357" stroke="#78350f" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M 332 357 Q 355 348 385 355" stroke="#78350f" stroke-width="4" stroke-linecap="round" fill="none"/>
  <ellipse cx="245" cy="375" rx="19" ry="13" fill="#ffffff"/>
  <circle cx="245" cy="375" r="8" fill="#451a03"/>
  <circle cx="248" cy="372" r="3" fill="#ffffff"/>
  <ellipse cx="355" cy="375" rx="19" ry="13" fill="#ffffff"/>
  <circle cx="355" cy="375" r="8" fill="#451a03"/>
  <circle cx="358" cy="372" r="3" fill="#ffffff"/>
  <ellipse cx="300" cy="425" rx="7" ry="5" fill="#ea580c"/>
  <path d="M 270 460 Q 300 480 330 460" stroke="#c2410c" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;

export const DUMMY_PORTRAIT_DATA_URL = makeSvgDataUrl(NEUTRAL_PORTRAIT_SVG);

export interface SamplePortrait {
  id: string;
  name: string;
  dataUrl: string;
}

export const SAMPLE_PORTRAITS: SamplePortrait[] = [
  {
    id: 'neutral_portrait',
    name: 'Sample Portrait (Neutral)',
    dataUrl: makeSvgDataUrl(NEUTRAL_PORTRAIT_SVG),
  },
  {
    id: 'formal_portrait',
    name: 'Formal Studio Portrait',
    dataUrl: makeSvgDataUrl(FORMAL_PORTRAIT_SVG),
  },
  {
    id: 'child_portrait',
    name: 'Child / Infant Portrait',
    dataUrl: makeSvgDataUrl(CHILD_PORTRAIT_SVG),
  },
];

