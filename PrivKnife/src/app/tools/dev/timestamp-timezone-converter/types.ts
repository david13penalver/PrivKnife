export type EpochUnit =
  | 'auto'
  | 'seconds'
  | 'milliseconds'
  | 'microseconds'
  | 'nanoseconds';

export type DetectedTimestampUnit = Exclude<EpochUnit, 'auto'> | 'date_string';

export type DiscordTagStyle = 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R';

export interface TimezoneView {
  timezone: string;
  formatted: string;
  offsetLabel: string;
}

export interface ParsedTimestampOutput {
  valid: boolean;
  detectedUnit: DetectedTimestampUnit;
  epochSeconds: string;
  epochMilliseconds: string;
  epochMicroseconds: string;
  epochNanoseconds: string;
  epochMsNumber: number;
  isoUtc: string;
  rfc2822: string;
  sqlTimestampUtc: string;
  relativeTime: string;
  isoWeekNumber: number;
  dayOfYear: number;
  isLeapYear: boolean;
  discordTags: Record<DiscordTagStyle, string>;
  timezoneViews: TimezoneView[];
  error?: string;
}

export interface TimestampDeltaResult {
  sign: 1 | -1 | 0;
  totalMilliseconds: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  weekdaysCount: number;
  breakdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    ms: number;
  };
}

export interface TimestampOffsetInput {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface BatchTimestampRow {
  line: number;
  rawInput: string;
  valid: boolean;
  detectedUnit?: string;
  isoUtc?: string;
  targetTzFormatted?: string;
  error?: string;
}

export const DISCORD_TAG_STYLES: readonly DiscordTagStyle[] = [
  't',
  'T',
  'd',
  'D',
  'f',
  'F',
  'R',
];

export const DEFAULT_PINNED_TIMEZONES: readonly string[] = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Madrid',
  'Asia/Tokyo',
];

export const FALLBACK_IANA_TIMEZONES: readonly string[] = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Berlin',
  'Europe/Brussels',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

export const MAX_BATCH_LINES = 10_000;
