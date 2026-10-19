import { BrailleAdaSignGeneratorOptions, SignPreset } from './types';

export const DEFAULT_BRAILLE_SIGN_OPTIONS: BrailleAdaSignGeneratorOptions = {
  roomTitle: 'RESTROOM',
  subText: 'ALL GENDER',
  pictogram: 'restroom_unisex',
  plaqueWidthMm: 152, // 6 inches
  plaqueHeightMm: 203, // 8 inches
  plaqueThicknessMm: 3.0,
  tactileRaiseMm: 0.8, // 1/32" ADA standard
  brailleStandard: 'ada_compliant',
  cornerRadiusMm: 6.0,
  mountHoles: true,
  mountHoleDiameterMm: 4.0,
  includeFrameBorder: true,
  frameBorderWidthMm: 3.0,
};

export const MINIMAL_BRAILLE_SIGN_OPTIONS: BrailleAdaSignGeneratorOptions = {
  roomTitle: 'EXIT',
  subText: '',
  pictogram: 'exit',
  plaqueWidthMm: 100,
  plaqueHeightMm: 100,
  plaqueThicknessMm: 1.5,
  tactileRaiseMm: 0.6,
  brailleStandard: 'ada_compliant',
  cornerRadiusMm: 0,
  mountHoles: false,
  mountHoleDiameterMm: 2.0,
  includeFrameBorder: false,
  frameBorderWidthMm: 1.5,
};

export const MAXIMUM_BRAILLE_SIGN_OPTIONS: BrailleAdaSignGeneratorOptions = {
  roomTitle: 'CONFERENCE ROOM 402',
  subText: 'MAX CAPACITY 32 PERSONS',
  pictogram: 'accessible_wheelchair',
  plaqueWidthMm: 300,
  plaqueHeightMm: 300,
  plaqueThicknessMm: 6.0,
  tactileRaiseMm: 2.0,
  brailleStandard: 'california_title24',
  cornerRadiusMm: 25.0,
  mountHoles: true,
  mountHoleDiameterMm: 8.0,
  includeFrameBorder: true,
  frameBorderWidthMm: 8.0,
};

export const SIGN_PRESETS: SignPreset[] = [
  {
    id: 'restroom_all_gender',
    name: 'All-Gender Restroom',
    description: 'ADA compliant unisex restroom door sign with Braille and accessible pictogram',
    options: {
      roomTitle: 'RESTROOM',
      subText: 'ALL GENDER',
      pictogram: 'restroom_unisex',
      plaqueWidthMm: 152,
      plaqueHeightMm: 203,
      brailleStandard: 'ada_compliant',
    },
  },
  {
    id: 'restroom_men',
    name: "Men's Restroom",
    description: "Standard Men's restroom sign with tactile text and Braille",
    options: {
      roomTitle: 'MEN',
      subText: '',
      pictogram: 'restroom_men',
      plaqueWidthMm: 152,
      plaqueHeightMm: 203,
      brailleStandard: 'ada_compliant',
    },
  },
  {
    id: 'restroom_women',
    name: "Women's Restroom",
    description: "Standard Women's restroom sign with tactile text and Braille",
    options: {
      roomTitle: 'WOMEN',
      subText: '',
      pictogram: 'restroom_women',
      plaqueWidthMm: 152,
      plaqueHeightMm: 203,
      brailleStandard: 'ada_compliant',
    },
  },
  {
    id: 'emergency_exit',
    name: 'Tactile Exit Sign',
    description: 'High visibility emergency exit marker with Braille domes',
    options: {
      roomTitle: 'EXIT',
      subText: '',
      pictogram: 'exit',
      plaqueWidthMm: 152,
      plaqueHeightMm: 127,
      brailleStandard: 'ada_compliant',
    },
  },
  {
    id: 'office_room',
    name: 'Office & Room Plaque',
    description: 'Custom office identification sign with room number',
    options: {
      roomTitle: 'OFFICE 204',
      subText: 'PRIVATE',
      pictogram: 'none',
      plaqueWidthMm: 178,
      plaqueHeightMm: 127,
      brailleStandard: 'ada_compliant',
    },
  },
  {
    id: 'conference_room',
    name: 'Conference Room',
    description: 'Wide conference room sign with capacity subtext',
    options: {
      roomTitle: 'CONFERENCE A',
      subText: 'MAX CAPACITY 18',
      pictogram: 'none',
      plaqueWidthMm: 203,
      plaqueHeightMm: 152,
      brailleStandard: 'ada_compliant',
    },
  },
];
