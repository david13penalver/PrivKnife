import {
  BatchTimestampRow,
  DEFAULT_PINNED_TIMEZONES,
  DISCORD_TAG_STYLES,
  DetectedTimestampUnit,
  DiscordTagStyle,
  EpochUnit,
  FALLBACK_IANA_TIMEZONES,
  MAX_BATCH_LINES,
  ParsedTimestampOutput,
  TimestampDeltaResult,
  TimestampOffsetInput,
  TimezoneView,
} from './types';

const MAX_JS_DATE_MS = 8_640_000_000_000_000n;
const NS_PER_SECOND = 1_000_000_000n;
const NS_PER_MS = 1_000_000n;
const NS_PER_US = 1_000n;

const tzDisplayCache = new Map<string, Intl.DateTimeFormat>();
const tzOffsetCache = new Map<string, Intl.DateTimeFormat>();

export function floorDivBigInt(a: bigint, b: bigint): bigint {
  const q = a / b;
  const r = a % b;
  if (r !== 0n && (a < 0n) !== (b < 0n)) {
    return q - 1n;
  }
  return q;
}

export function getSupportedIanaTimezones(): string[] {
  const intlWithValues = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  if (typeof intlWithValues.supportedValuesOf === 'function') {
    try {
      const list = intlWithValues.supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length > 0) {
        return list.includes('UTC') ? list : ['UTC', ...list];
      }
    } catch {
      // Fallback cleanly below
    }
  }
  return [...FALLBACK_IANA_TIMEZONES];
}

function getTzFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = tzDisplayCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    tzDisplayCache.set(timezone, fmt);
  }
  return fmt;
}

function getTzOffsetFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = tzOffsetCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    tzOffsetCache.set(timezone, fmt);
  }
  return fmt;
}

function formatTimezoneView(date: Date, timezone: string): TimezoneView | null {
  try {
    const parts = getTzFormatter(timezone).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    const hour = map['hour'] === '24' ? '00' : (map['hour'] ?? '00');
    const formatted = `${map['year']}-${map['month']}-${map['day']} ${hour}:${map['minute']}:${map['second']}`;

    let offsetLabel = timezone === 'UTC' ? 'GMT+0' : timezone;
    try {
      const offsetParts = getTzOffsetFormatter(timezone).formatToParts(date);
      const tzName = offsetParts.find((p) => p.type === 'timeZoneName')?.value;
      if (tzName) {
        offsetLabel = tzName;
      }
    } catch {
      // Optional offset formatting fallback
    }

    return {
      timezone,
      formatted,
      offsetLabel,
    };
  } catch {
    return null;
  }
}

function computeCalendarMeta(date: Date): {
  isoWeekNumber: number;
  dayOfYear: number;
  isLeapYear: boolean;
} {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const dayOfYear =
    Math.floor(
      (Date.UTC(year, month, day) - Date.UTC(year, 0, 1)) / 86_400_000
    ) + 1;

  const tmp = new Date(Date.UTC(year, month, day));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const isoWeekNumber = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );

  return { isoWeekNumber, dayOfYear, isLeapYear };
}

function formatRelativeLabel(
  epochMsNumber: number,
  referenceDateMs: number,
  locale: 'en' | 'es'
): string {
  const diffSec = Math.round((epochMsNumber - referenceDateMs) / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale === 'es' ? 'es' : 'en', {
    numeric: 'auto',
  });

  if (absSec < 60) {
    return rtf.format(diffSec, 'second');
  }
  if (absSec < 3600) {
    return rtf.format(Math.trunc(diffSec / 60), 'minute');
  }
  if (absSec < 86400) {
    return rtf.format(Math.trunc(diffSec / 3600), 'hour');
  }
  if (absSec < 2_592_000) {
    return rtf.format(Math.trunc(diffSec / 86400), 'day');
  }
  if (absSec < 31_536_000) {
    return rtf.format(Math.trunc(diffSec / 2_592_000), 'month');
  }
  return rtf.format(Math.trunc(diffSec / 31_536_000), 'year');
}

function buildInvalidOutput(error: string): ParsedTimestampOutput {
  const emptyDiscord = {} as Record<DiscordTagStyle, string>;
  for (const style of DISCORD_TAG_STYLES) {
    emptyDiscord[style] = '';
  }
  return {
    valid: false,
    detectedUnit: 'date_string',
    epochSeconds: '',
    epochMilliseconds: '',
    epochMicroseconds: '',
    epochNanoseconds: '',
    epochMsNumber: NaN,
    isoUtc: '',
    rfc2822: '',
    sqlTimestampUtc: '',
    relativeTime: '',
    isoWeekNumber: 0,
    dayOfYear: 0,
    isLeapYear: false,
    discordTags: emptyDiscord,
    timezoneViews: [],
    error,
  };
}

function detectNumericUnit(absIntDigits: number, override: EpochUnit): Exclude<EpochUnit, 'auto'> {
  if (override !== 'auto') {
    return override;
  }
  if (absIntDigits <= 11) {
    return 'seconds';
  }
  if (absIntDigits <= 14) {
    return 'milliseconds';
  }
  if (absIntDigits <= 17) {
    return 'microseconds';
  }
  return 'nanoseconds';
}

function unitScalePower(unit: Exclude<EpochUnit, 'auto'>): number {
  switch (unit) {
    case 'seconds':
      return 9;
    case 'milliseconds':
      return 6;
    case 'microseconds':
      return 3;
    case 'nanoseconds':
      return 0;
  }
}

export function parseTimestampInput(
  rawInput: string,
  unitOverride: EpochUnit = 'auto',
  pinnedTimezones: readonly string[] = DEFAULT_PINNED_TIMEZONES,
  referenceDateMs = Date.now(),
  locale: 'en' | 'es' = 'en'
): ParsedTimestampOutput {
  const trimmed = typeof rawInput === 'string' ? rawInput.trim() : '';
  if (!trimmed) {
    return buildInvalidOutput('Enter a Unix epoch, ISO-8601 date, or RFC-2822 string.');
  }

  let epochNs: bigint;
  let detectedUnit: DetectedTimestampUnit;

  const numericMatch = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (numericMatch) {
    const isNegative = numericMatch[1] === '-';
    const intDigits = numericMatch[2];
    const fracDigits = numericMatch[3] ?? '';

    const unit = detectNumericUnit(intDigits.length, unitOverride);
    detectedUnit = unit;
    const scalePow = unitScalePower(unit);
    const scaleFactor = 10n ** BigInt(scalePow);

    let absNs = BigInt(intDigits) * scaleFactor;
    if (fracDigits && scalePow > 0) {
      const scaledFrac = fracDigits.padEnd(scalePow, '0').slice(0, scalePow);
      absNs += BigInt(scaledFrac);
    }
    epochNs = isNegative ? -absNs : absNs;
  } else {
    detectedUnit = 'date_string';
    // Capture fractional seconds beyond ms (up to 9 digits) before Date.parse truncates
    let subMsRemNs = 0n;
    const fracMatch = /\.(\d{1,9})(?:Z|[+-]\d{2}:?\d{2}|\s|$)/i.exec(trimmed);
    if (fracMatch) {
      const padded9 = fracMatch[1].padEnd(9, '0');
      subMsRemNs = BigInt(padded9.slice(3, 9));
    }

    // Normalize SQL `YYYY-MM-DD HH:mm:ss` into ISO UTC string cleanly
    let dateCandidate = trimmed;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      dateCandidate = trimmed.replace(' ', 'T');
      if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateCandidate)) {
        dateCandidate += 'Z';
      }
    }

    // Replace >3 fractional digits so all Date.parse engines parse consistently
    const normalizedForDateParse = dateCandidate.replace(
      /\.(\d{3})\d+/,
      '.$1'
    );
    const parsedMs = Date.parse(normalizedForDateParse);
    if (Number.isNaN(parsedMs)) {
      return buildInvalidOutput(`Unrecognized timestamp format: "${trimmed}".`);
    }

    epochNs = BigInt(Math.trunc(parsedMs)) * NS_PER_MS + subMsRemNs;
  }

  const epochMillisecondsBigInt = floorDivBigInt(epochNs, NS_PER_MS);
  if (
    epochMillisecondsBigInt < -MAX_JS_DATE_MS ||
    epochMillisecondsBigInt > MAX_JS_DATE_MS
  ) {
    return buildInvalidOutput(
      'Timestamp is outside valid JavaScript Date range (±8.64e15 ms).'
    );
  }

  const epochSecondsBigInt = floorDivBigInt(epochNs, NS_PER_SECOND);
  const epochMicrosecondsBigInt = floorDivBigInt(epochNs, NS_PER_US);
  const epochMsNumber = Number(epochMillisecondsBigInt);
  const date = new Date(epochMsNumber);

  const subSecNs = Number(epochNs - epochSecondsBigInt * NS_PER_SECOND);
  const baseIso = date.toISOString();
  const isoUtc =
    subSecNs % 1_000_000 !== 0
      ? `${baseIso.slice(0, 19)}.${String(subSecNs).padStart(9, '0')}Z`
      : baseIso;

  const rfc2822 = date.toUTCString();
  const sqlTimestampUtc = `${baseIso.slice(0, 10)} ${baseIso.slice(11, 23)}`;
  const relativeTime = formatRelativeLabel(epochMsNumber, referenceDateMs, locale);
  const { isoWeekNumber, dayOfYear, isLeapYear } = computeCalendarMeta(date);

  const epochSecStr = epochSecondsBigInt.toString();
  const discordTags = {} as Record<DiscordTagStyle, string>;
  for (const style of DISCORD_TAG_STYLES) {
    discordTags[style] = `<t:${epochSecStr}:${style}>`;
  }

  const timezoneViews: TimezoneView[] = [];
  for (const tz of pinnedTimezones) {
    const view = formatTimezoneView(date, tz);
    if (view) {
      timezoneViews.push(view);
    }
  }

  return {
    valid: true,
    detectedUnit,
    epochSeconds: epochSecStr,
    epochMilliseconds: epochMillisecondsBigInt.toString(),
    epochMicroseconds: epochMicrosecondsBigInt.toString(),
    epochNanoseconds: epochNs.toString(),
    epochMsNumber,
    isoUtc,
    rfc2822,
    sqlTimestampUtc,
    relativeTime,
    isoWeekNumber,
    dayOfYear,
    isLeapYear,
    discordTags,
    timezoneViews,
  };
}

export function computeTimestampDelta(
  startMs: number,
  endMs: number
): TimestampDeltaResult {
  const diffMs = endMs - startMs;
  const sign: 1 | -1 | 0 = diffMs > 0 ? 1 : diffMs < 0 ? -1 : 0;
  const absMs = Math.abs(diffMs);

  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor((absMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((absMs % 3_600_000) / 60_000);
  const seconds = Math.floor((absMs % 60_000) / 1000);
  const ms = Math.floor(absMs % 1000);

  const loDay = Math.floor(Math.min(startMs, endMs) / 86_400_000);
  const hiDay = Math.floor(Math.max(startMs, endMs) / 86_400_000);
  const wholeDaySpan = Math.max(0, hiDay - loDay);
  const fullWeeks = Math.floor(wholeDaySpan / 7);
  const remDays = wholeDaySpan % 7;
  let weekdaysCount = fullWeeks * 5;
  for (let i = 0; i < remDays; i += 1) {
    // 1970-01-01 (day 0) was Thursday (4)
    const dow = (((loDay + i + 4) % 7) + 7) % 7;
    if (dow >= 1 && dow <= 5) {
      weekdaysCount += 1;
    }
  }

  return {
    sign,
    totalMilliseconds: absMs,
    totalSeconds: absMs / 1000,
    totalMinutes: absMs / 60_000,
    totalHours: absMs / 3_600_000,
    totalDays: absMs / 86_400_000,
    weekdaysCount,
    breakdown: {
      days,
      hours,
      minutes,
      seconds,
      ms,
    },
  };
}

export function applyTimestampOffset(
  baseMs: number,
  offset: TimestampOffsetInput
): number {
  const date = new Date(baseMs);
  if (offset.years) {
    date.setUTCFullYear(date.getUTCFullYear() + Math.trunc(offset.years));
  }
  if (offset.months) {
    date.setUTCMonth(date.getUTCMonth() + Math.trunc(offset.months));
  }
  const addMs =
    (offset.days ?? 0) * 86_400_000 +
    (offset.hours ?? 0) * 3_600_000 +
    (offset.minutes ?? 0) * 60_000 +
    (offset.seconds ?? 0) * 1000;
  return date.getTime() + addMs;
}

function extractCandidateFromLine(line: string): string {
  if (/^-?\d+(?:\.\d+)?$/.test(line)) {
    return line;
  }
  if (
    /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i.test(
      line
    )
  ) {
    return line;
  }

  const inlineEpochMatch = /(?:^|[^0-9.-])(-?\d{10,19})(?![0-9.])/.exec(line);
  if (inlineEpochMatch) {
    return inlineEpochMatch[1];
  }

  const inlineIsoMatch =
    /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})?/i.exec(
      line
    );
  if (inlineIsoMatch) {
    return inlineIsoMatch[0];
  }

  return line;
}

export function convertBatchTimestamps(
  rawLines: string,
  targetTimezone = 'UTC',
  unitOverride: EpochUnit = 'auto'
): BatchTimestampRow[] {
  const lines = rawLines.split(/\r?\n/);
  const rows: BatchTimestampRow[] = [];

  for (let i = 0; i < lines.length && rows.length < MAX_BATCH_LINES; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      continue;
    }

    const candidate = extractCandidateFromLine(trimmed);
    const parsed = parseTimestampInput(candidate, unitOverride, [targetTimezone]);

    if (parsed.valid) {
      rows.push({
        line: i + 1,
        rawInput: trimmed,
        valid: true,
        detectedUnit: parsed.detectedUnit,
        isoUtc: parsed.isoUtc,
        targetTzFormatted: parsed.timezoneViews[0]?.formatted ?? parsed.isoUtc,
      });
    } else {
      rows.push({
        line: i + 1,
        rawInput: trimmed,
        valid: false,
        error: parsed.error ?? 'Unrecognized timestamp',
      });
    }
  }

  return rows;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportBatchToCsv(rows: readonly BatchTimestampRow[]): string {
  const header = 'line,raw_input,valid,detected_unit,iso_utc,target_timezone,error';
  const lines = rows.map((row) =>
    [
      String(row.line),
      escapeCsvCell(row.rawInput),
      row.valid ? 'true' : 'false',
      escapeCsvCell(row.detectedUnit ?? ''),
      escapeCsvCell(row.isoUtc ?? ''),
      escapeCsvCell(row.targetTzFormatted ?? ''),
      escapeCsvCell(row.error ?? ''),
    ].join(',')
  );
  return [header, ...lines].join('\n');
}

export function exportBatchToJson(rows: readonly BatchTimestampRow[]): string {
  return JSON.stringify(rows, null, 2);
}
