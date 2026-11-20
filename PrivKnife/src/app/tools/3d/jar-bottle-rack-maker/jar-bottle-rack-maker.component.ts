import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MeshWorkshop } from '../shared/workshop';
import type { WorkshopDefinition } from '../shared/workshop-config';
import { BOTTLE_PRESETS, DEFAULT_JAR_RACK_OPTIONS } from './types';

const STADIUM = ['stepped_stadium'];
const TRACK = ['capsule_track'];
const WELLS = [...STADIUM, 'honeycomb_tray'];

@Component({
  selector: 'app-jar-bottle-rack-maker',
  standalone: true,
  imports: [MeshWorkshop],
  templateUrl: './jar-bottle-rack-maker.component.html',
  styleUrl: './jar-bottle-rack-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JarBottleRackMakerComponent {
  readonly definition: WorkshopDefinition = {
    id: 'jar-bottle-rack-maker',
    i18n: 'jarBottleRackMaker',
    initial: { ...DEFAULT_JAR_RACK_OPTIONS, mode: DEFAULT_JAR_RACK_OPTIONS.topology },
    presets: Object.entries(BOTTLE_PRESETS).map(([preset, { label, diameter, topology }]) => ({
      label: label === preset ? `tools.jarBottleRackMaker.${label}` : label,
      patch: { preset, bottleDiameterMm: diameter, mode: topology },
    })),
    colors: ['filamentColorHex'],
    fields: [
      { key: 'mode', type: 'select', choices: [...WELLS, ...TRACK] },
      { key: 'bottleDiameterMm', type: 'number', min: 12, max: 95, step: 0.1, unit: 'mm' },
      { key: 'fitClearanceMm', type: 'number', min: 0.3, max: 1.5, step: 0.05, unit: 'mm', slider: true },
      { key: 'webWallThicknessMm', type: 'number', min: 1.8, max: 6, step: 0.1, unit: 'mm' },
      { key: 'columns', type: 'number', min: 1, max: 10, step: 1, slider: true },
      { key: 'rows', type: 'number', min: 1, max: 6, step: 1, slider: true },
      { key: 'wellDepthMm', type: 'number', min: 8, max: 55, step: 1, unit: 'mm' },
      { key: 'stepRiseMm', type: 'number', min: 0, max: 40, step: 1, unit: 'mm', modes: STADIUM },
      { key: 'includeLabelCutout', type: 'checkbox', modes: WELLS },
      { key: 'invertedBottleWells', type: 'checkbox', modes: WELLS },
      { key: 'hollowVaultUnderside', type: 'checkbox', modes: STADIUM },
      { key: 'includeMountHoles', type: 'checkbox', modes: TRACK },
      { key: 'includeSideDovetails', type: 'checkbox' },
      { key: 'splitForBed', type: 'checkbox' },
      { key: 'filamentColorHex', type: 'color' },
    ],
    metrics: [
      { key: 'totalCapacityCount' },
      { key: 'moduleCount' },
      { key: 'estimatedPrintTimeHours', unit: 'h' },
      { key: 'exceedsStandardBed', warning: true },
      { key: 'multiplePlates', warning: true },
    ],
    worker: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  };
}
