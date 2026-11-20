import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MeshWorkshop } from '../shared/workshop';
import type { WorkshopDefinition } from '../shared/workshop-config';
import { DEFAULT_CONTAINER_OPTIONS, SPOOL_HUBS } from './types';

const TUBE = ['knurled_tube', 'desiccant_pod'];
const POD = ['desiccant_pod'];
const PILL = ['pill_organizer'];
const SPOOL_LABELS = { bambu: 'Bambu', prusa: 'Prusament', sunlu: 'eSun / Sunlu', generic: '55 mm' };

@Component({
  selector: 'app-threaded-tube-pill-organizer',
  standalone: true,
  imports: [MeshWorkshop],
  templateUrl: './threaded-tube-pill-organizer.component.html',
  styleUrl: './threaded-tube-pill-organizer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadedTubePillOrganizerComponent {
  readonly definition: WorkshopDefinition = {
    id: 'threaded-tube-pill-organizer',
    i18n: 'threadedTubePillOrganizer',
    initial: { ...DEFAULT_CONTAINER_OPTIONS },
    presets: Object.entries(SPOOL_HUBS).map(([spoolPreset, outerDiameterMm]) => ({
      label: SPOOL_LABELS[spoolPreset as keyof typeof SPOOL_LABELS],
      patch: { mode: 'desiccant_pod', spoolPreset, outerDiameterMm },
    })),
    colors: ['bodyColorHex', 'accentColorHex'],
    fields: [
      { key: 'mode', type: 'select', choices: [...TUBE, ...PILL] },
      { key: 'spoolPreset', type: 'select', choices: [
        'custom', ...Object.entries(SPOOL_HUBS).map(([value, diameter]) => ({
          value, label: value === 'generic' ? '55 mm' : `${SPOOL_LABELS[value as keyof typeof SPOOL_LABELS]} · ${diameter} mm`,
        })),
      ], modes: POD },
      { key: 'outerDiameterMm', type: 'number', min: 20, max: 120, step: 0.1, unit: 'mm', modes: TUBE },
      { key: 'internalHeightMm', type: 'number', min: 25, max: 180, step: 1, unit: 'mm', modes: TUBE, slider: true },
      { key: 'wallThicknessMm', type: 'number', min: 1.8, max: 4.5, step: 0.1, unit: 'mm' },
      { key: 'threadPitchMm', type: 'number', min: 2.5, max: 5, step: 0.1, unit: 'mm', modes: TUBE },
      { key: 'threadClearanceMm', type: 'number', min: 0.15, max: 0.45, step: 0.01, unit: 'mm', slider: true },
      { key: 'includeKnurling', type: 'checkbox', modes: TUBE },
      { key: 'desiccantSlitWidthMm', type: 'number', min: 1, max: 1.8, step: 0.05, unit: 'mm', modes: POD },
      { key: 'includeAirflowChimney', type: 'checkbox', modes: POD },
      { key: 'pillDoubleAmPm', type: 'checkbox', modes: PILL },
      { key: 'pillSlotWidthMm', type: 'number', min: 18, max: 42, step: 1, unit: 'mm', modes: PILL, slider: true },
      { key: 'pillSlotDepthMm', type: 'number', min: 16, max: 38, step: 1, unit: 'mm', modes: PILL },
      { key: 'includeDayLabels', type: 'checkbox', modes: PILL },
      { key: 'layoutFlatPlate', type: 'checkbox' },
      { key: 'cutaway', type: 'checkbox' },
      { key: 'bodyColorHex', type: 'color' },
      { key: 'accentColorHex', type: 'color', modes: PILL },
    ],
    metrics: [
      { key: 'internalVolumeMl', unit: 'mL' },
      { key: 'usableInternalDiameterMm', unit: 'mm', modes: TUBE },
      { key: 'neckWallRemainingMm', unit: 'mm', modes: TUBE },
      { key: 'ventCount', modes: POD },
      { key: 'pocketCount', modes: PILL },
      { key: 'estimatedPrintTimeHours', unit: 'h' },
    ],
    worker: () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
  };
}
