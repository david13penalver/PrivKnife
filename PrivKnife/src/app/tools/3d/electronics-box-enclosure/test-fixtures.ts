import { ElectronicsBoxEnclosureOptions, PresetEnclosure } from './types';

export const DEFAULT_ENCLOSURE_OPTIONS: ElectronicsBoxEnclosureOptions = {
  innerLengthMm: 80,
  innerWidthMm: 50,
  innerHeightMm: 30,
  wallThicknessMm: 2.0,
  cornerRadiusMm: 3.0,
  closureType: 'snap_fit',
  pcbPreset: 'custom',
  standoffHeightMm: 5.0,
  cableSlot: true,
  cableSlotDiameterMm: 8.0,
  ventilationGrille: true,
  explodedView: false,
};

export const ARDUINO_ENCLOSURE_OPTIONS: ElectronicsBoxEnclosureOptions = {
  innerLengthMm: 75,
  innerWidthMm: 58,
  innerHeightMm: 24,
  wallThicknessMm: 2.0,
  cornerRadiusMm: 4.0,
  closureType: 'm3_screws',
  pcbPreset: 'arduino_uno',
  standoffHeightMm: 6.0,
  cableSlot: true,
  cableSlotDiameterMm: 12.0,
  ventilationGrille: true,
  explodedView: false,
};

export const ESP32_ENCLOSURE_OPTIONS: ElectronicsBoxEnclosureOptions = {
  innerLengthMm: 60,
  innerWidthMm: 34,
  innerHeightMm: 20,
  wallThicknessMm: 1.8,
  cornerRadiusMm: 3.0,
  closureType: 'snap_fit',
  pcbPreset: 'esp32_dev',
  standoffHeightMm: 4.0,
  cableSlot: true,
  cableSlotDiameterMm: 8.0,
  ventilationGrille: true,
  explodedView: false,
};

export const RPI_PICO_ENCLOSURE_OPTIONS: ElectronicsBoxEnclosureOptions = {
  innerLengthMm: 56,
  innerWidthMm: 26,
  innerHeightMm: 16,
  wallThicknessMm: 1.6,
  cornerRadiusMm: 2.5,
  closureType: 'slide_lid',
  pcbPreset: 'rpi_pico',
  standoffHeightMm: 3.5,
  cableSlot: true,
  cableSlotDiameterMm: 7.0,
  ventilationGrille: false,
  explodedView: false,
};

export const INVALID_ENCLOSURE_LENGTH_ZERO: ElectronicsBoxEnclosureOptions = {
  ...DEFAULT_ENCLOSURE_OPTIONS,
  innerLengthMm: 0,
};

export const INVALID_ENCLOSURE_WALL_THIN: ElectronicsBoxEnclosureOptions = {
  ...DEFAULT_ENCLOSURE_OPTIONS,
  wallThicknessMm: 0.5,
};

export const ENCLOSURE_PRESETS: PresetEnclosure[] = [
  {
    id: 'diy_project_box',
    name: 'DIY Project Box (Snap-Fit)',
    description: '80×50×30mm universal snap-fit project enclosure with cooling grilles and cable pass-through.',
    options: {
      innerLengthMm: 80,
      innerWidthMm: 50,
      innerHeightMm: 30,
      wallThicknessMm: 2.0,
      closureType: 'snap_fit',
      pcbPreset: 'custom',
      cableSlot: true,
      ventilationGrille: true,
    },
  },
  {
    id: 'arduino_uno',
    name: 'Arduino Uno R3/R4 Box',
    description: '75×58×24mm heavy-duty box with 4 corner M3 screw mounts and USB/DC jack access cutouts.',
    options: {
      innerLengthMm: 75,
      innerWidthMm: 58,
      innerHeightMm: 24,
      wallThicknessMm: 2.0,
      closureType: 'm3_screws',
      pcbPreset: 'arduino_uno',
      standoffHeightMm: 6.0,
      cableSlot: true,
    },
  },
  {
    id: 'esp32_devkit',
    name: 'ESP32 DevKit Compact Case',
    description: '60×34×20mm snap-fit enclosure tailored for 30-pin & 38-pin ESP32 NodeMCU development boards.',
    options: {
      innerLengthMm: 60,
      innerWidthMm: 34,
      innerHeightMm: 20,
      wallThicknessMm: 1.8,
      closureType: 'snap_fit',
      pcbPreset: 'esp32_dev',
      standoffHeightMm: 4.0,
      cableSlot: true,
      ventilationGrille: true,
    },
  },
  {
    id: 'rpi_pico',
    name: 'Raspberry Pi Pico Slider',
    description: '56×26×16mm low-profile friction-slide case with microUSB access and internal board rails.',
    options: {
      innerLengthMm: 56,
      innerWidthMm: 26,
      innerHeightMm: 16,
      wallThicknessMm: 1.6,
      closureType: 'slide_lid',
      pcbPreset: 'rpi_pico',
      standoffHeightMm: 3.5,
      cableSlot: true,
      ventilationGrille: false,
    },
  },
];
