import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MeshWorkshop } from '../shared/workshop';
import type { WorkshopDefinition } from '../shared/workshop-config';
import { DEFAULT_FUNNEL_SCOOP_OPTIONS, SCOOP_PRESETS } from './types';

const FUNNEL = ['air_vented_funnel'];
const SCOOP = ['measuring_scoop'];

@Component({
  selector: 'app-funnel-scoop-maker',
  standalone: true,
  imports: [MeshWorkshop],
  templateUrl: './funnel-scoop-maker.component.html',
  styleUrl: './funnel-scoop-maker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FunnelScoopMakerComponent {
  readonly definition: WorkshopDefinition = {
    id: 'funnel-scoop-maker',
    i18n: 'funnelScoopMaker',
    initial: { ...DEFAULT_FUNNEL_SCOOP_OPTIONS, unit: 'ml', volume: 30, upright: false },
    presets: SCOOP_PRESETS.map((volume) => ({ label: `${volume} mL`, patch: { mode: 'measuring_scoop', volume, unit: 'ml' } })),
    colors: ['bodyColorHex', 'labelColorHex'],
    fields: [
      { key: 'mode', type: 'select', choices: [...FUNNEL, ...SCOOP] },
      { key: 'wallThicknessMm', type: 'number', min: 1.2, max: 3, step: 0.1, unit: 'mm', slider: true },
      { key: 'spoutOuterDiameterMm', type: 'number', min: 7, max: 45, step: 0.1, unit: 'mm', modes: FUNNEL },
      { key: 'mouthDiameterMm', type: 'number', min: 35, max: 180, step: 1, unit: 'mm', modes: FUNNEL },
      { key: 'spoutLengthMm', type: 'number', min: 15, max: 70, step: 1, unit: 'mm', modes: FUNNEL },
      { key: 'coneOverhangDeg', type: 'number', min: 30, max: 52, step: 1, unit: '°', slider: true, modes: FUNNEL },
      { key: 'ventRibCount', type: 'number', min: 0, max: 6, step: 1, modes: FUNNEL },
      { key: 'includeHangingTab', type: 'checkbox', modes: FUNNEL },
      { key: 'upright', type: 'checkbox', modes: FUNNEL },
      { key: 'unit', type: 'select', choices: ['ml', 'tablespoons', 'cups', 'coffeeGrams'], modes: SCOOP },
      { key: 'volume', type: 'number', min: 0.01, max: 250, step: 0.01, modes: SCOOP },
      { key: 'scoopAspect', type: 'select', choices: ['shallow_wide', 'balanced', 'deep_narrow'], modes: SCOOP },
      { key: 'handleLengthMm', type: 'number', min: 55, max: 140, step: 1, unit: 'mm', slider: true, modes: SCOOP },
      { key: 'includeVolumeLabel', type: 'checkbox', modes: SCOOP },
      { key: 'customLabelText', type: 'text', maxLength: 18, modes: SCOOP },
      { key: 'bodyColorHex', type: 'color' },
      { key: 'labelColorHex', type: 'color', modes: SCOOP },
    ],
    metrics: [
      { key: 'innerFlowBoreMm', unit: 'mm', modes: FUNNEL },
      { key: 'solvedVolumeMl', unit: 'mL', modes: SCOOP },
      { key: 'estimatedPrintTimeHours', unit: 'h' },
    ],
    advisory: true,
    worker: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  };
}
