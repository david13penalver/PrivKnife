import { CronPreset } from './types';

export const ANCHOR_FRIDAY_UTC_MS = Date.UTC(2026, 0, 2, 16, 40, 0);

export const ANCHOR_2026_START_UTC_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

export const ANCHOR_US_SPRING_DST_MS = Date.UTC(2026, 2, 8, 6, 0, 0);

export const ANCHOR_US_FALL_DST_MS = Date.UTC(2026, 10, 1, 4, 30, 0);

export const CRON_PRESETS: readonly CronPreset[] = [
  {
    id: 'every_5m',
    labelKey: 'tools.cronExpressionStudio.presetEvery5m',
    expression: '*/5 * * * *',
    format: 'standard_5',
  },
  {
    id: 'hourly',
    labelKey: 'tools.cronExpressionStudio.presetHourly',
    expression: '0 * * * *',
    format: 'standard_5',
  },
  {
    id: 'daily_midnight',
    labelKey: 'tools.cronExpressionStudio.presetDaily',
    expression: '0 0 * * *',
    format: 'standard_5',
  },
  {
    id: 'weekdays_9am',
    labelKey: 'tools.cronExpressionStudio.presetWeekdays',
    expression: '0 9 * * MON-FRI',
    format: 'standard_5',
  },
  {
    id: 'monthly_1st',
    labelKey: 'tools.cronExpressionStudio.presetMonthly',
    expression: '0 0 1 * *',
    format: 'standard_5',
  },
  {
    id: 'leap_day',
    labelKey: 'tools.cronExpressionStudio.presetLeapDay',
    expression: '0 0 29 2 *',
    format: 'standard_5',
  },
  {
    id: 'nick_daily',
    labelKey: 'tools.cronExpressionStudio.presetNickDaily',
    expression: '@daily',
    format: 'standard_5',
  },
  {
    id: 'nick_weekly',
    labelKey: 'tools.cronExpressionStudio.presetNickWeekly',
    expression: '@weekly',
    format: 'standard_5',
  },
];
