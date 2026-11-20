import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MeshWorkshop } from '../shared/workshop';
import type { WorkshopDefinition } from '../shared/workshop-config';
import { BED_PRESETS_MM, DEFAULT_CALIBRATION_OPTIONS, FASTENERS, NOZZLE_PRESETS_MM } from './types';

const GAUGE = ['clearance_gauge'];
const FASTENER = ['fastener_fit_block'];
const STRESS = ['bridge_overhang_test'];
const SHEET = ['first_layer_sheet'];

@Component({
  selector: 'app-calibration-tolerance-suite',
  standalone: true,
  imports: [MeshWorkshop],
  templateUrl: './calibration-tolerance-suite.component.html',
  styleUrl: './calibration-tolerance-suite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalibrationToleranceSuiteComponent {
  readonly definition: WorkshopDefinition = {
    id: 'calibration-tolerance-suite',
    i18n: 'calibrationToleranceSuite',
    initial: { ...DEFAULT_CALIBRATION_OPTIONS },
    presets: [
      ...NOZZLE_PRESETS_MM.map((nozzleDiameterMm) => ({
        label: `${nozzleDiameterMm} mm`, patch: { nozzleDiameterMm },
      })),
      ...BED_PRESETS_MM.map((bedWidthMm) => ({
        label: `${bedWidthMm} × ${bedWidthMm} mm`,
        patch: { mode: 'first_layer_sheet', bedWidthMm, bedDepthMm: bedWidthMm },
      })),
    ],
    colors: ['bodyColorHex', 'labelColorHex'],
    fields: [
      { key: 'mode', type: 'select', choices: [...GAUGE, ...FASTENER, ...STRESS, ...SHEET] },
      { key: 'nozzleDiameterMm', type: 'number', min: 0.2, max: 1, step: 0.05, unit: 'mm', slider: true },
      { key: 'layerHeightMm', type: 'number', min: 0.1, max: 0.4, step: 0.01, unit: 'mm', slider: true },
      { key: 'clearanceValuesText', type: 'text', maxLength: 120, modes: GAUGE },
      { key: 'boltSize', type: 'select', modes: FASTENER, choices: Object.keys(FASTENERS).map((value) => ({
        value, label: value === '1/4' ? '1/4″' : value,
      })) },
      { key: 'includeBridges', type: 'checkbox', modes: STRESS },
      { key: 'includeOverhangs', type: 'checkbox', modes: STRESS },
      { key: 'bedWidthMm', type: 'number', min: 120, max: 400, step: 1, unit: 'mm', modes: SHEET },
      { key: 'bedDepthMm', type: 'number', min: 120, max: 400, step: 1, unit: 'mm', modes: SHEET },
      { key: 'bedMarginMm', type: 'number', min: 5, max: 25, step: 1, unit: 'mm', modes: SHEET },
      { key: 'patchCount', type: 'select', modes: SHEET, choices: [
        { value: 5, label: '5' }, { value: 9, label: '9' }, { value: 0, label: 'tools.calibrationToleranceSuite.fullBed' },
      ] },
      { key: 'includeGaugeLabels', type: 'checkbox', modes: [...GAUGE, ...FASTENER, ...STRESS] },
      { key: 'bodyColorHex', type: 'color' },
      { key: 'labelColorHex', type: 'color', modes: [...GAUGE, ...FASTENER, ...STRESS] },
    ],
    metrics: [
      { key: 'testFeatureCount', digits: 0 },
      { key: 'layerCount', digits: 0 },
      { key: 'estimatedPrintTimeMinutes', unit: 'min', digits: 1 },
    ],
    advisory: true,
    worker: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  };
}
