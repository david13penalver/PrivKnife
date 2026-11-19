export type CronFormatMode = 'standard_5' | 'extended_6';

export type CronFieldName =
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'daysOfMonth'
  | 'months'
  | 'daysOfWeek';

export type CronSnippetTarget =
  | 'crontab'
  | 'githubActions'
  | 'kubernetes'
  | 'nodeCron';

export interface ParsedCronField {
  raw: string;
  isWildcard: boolean;
  values: number[];
}

export interface ParsedCronAst {
  format: CronFormatMode;
  seconds: ParsedCronField;
  minutes: ParsedCronField;
  hours: ParsedCronField;
  daysOfMonth: ParsedCronField;
  months: ParsedCronField;
  daysOfWeek: ParsedCronField;
  usesDomDowUnion: boolean;
}

export interface SimulatedCronRun {
  index: number;
  epochMs: number;
  isoUtc: string;
  formattedTargetTz: string;
  relativeDelta: string;
  dstWarning?: boolean;
}

export interface CronStudioOptions {
  expression: string;
  format: CronFormatMode;
  timezone: string;
  simulationCount: 10 | 20 | 50;
  locale: 'en' | 'es';
  referenceDateMs?: number;
}

export interface CronFieldError {
  field: string;
  message: string;
}

export interface CronStudioResult {
  valid: boolean;
  ast?: ParsedCronAst;
  humanDescription: string;
  runs: SimulatedCronRun[];
  impossibleDateWarning: boolean;
  snippets: Record<CronSnippetTarget, string>;
  fieldErrors: CronFieldError[];
}

export interface CronPreset {
  id: string;
  labelKey: string;
  expression: string;
  format: CronFormatMode;
}

export const CURATED_IANA_TIMEZONES: readonly string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const CRON_NICKNAME_MAP: Readonly<Record<string, string>> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export const MAX_SIMULATION_YEARS = 8;
export const MAX_SIMULATION_ITERATIONS = 10_000;
