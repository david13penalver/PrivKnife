import type { WorkshopValues } from './workshop-protocol';

interface FieldBase {
  key: string;
  label?: string;
  modes?: readonly string[];
}
export type WorkshopField = FieldBase & (
  | { type: 'number'; min: number; max: number; step: number; unit?: string; slider?: boolean }
  | { type: 'select'; choices: readonly (string | { value: string | number; label: string })[] }
  | { type: 'checkbox' | 'color' }
  | { type: 'text'; maxLength: number }
);

export interface WorkshopPreset {
  label: string;
  patch: WorkshopValues;
}

export interface WorkshopDefinition {
  id: string;
  i18n: string;
  initial: WorkshopValues;
  fields: readonly WorkshopField[];
  presets: readonly WorkshopPreset[];
  colors: readonly string[];
  metrics: readonly { key: string; unit?: string; digits?: number; modes?: readonly string[]; warning?: boolean }[];
  advisory?: boolean;
  worker: () => Worker;
}
