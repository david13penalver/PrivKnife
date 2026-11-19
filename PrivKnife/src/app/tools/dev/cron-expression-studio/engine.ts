import {
  CRON_NICKNAME_MAP,
  CronFieldError,
  CronFieldName,
  CronFormatMode,
  CronSnippetTarget,
  CronStudioOptions,
  CronStudioResult,
  MAX_SIMULATION_ITERATIONS,
  MAX_SIMULATION_YEARS,
  ParsedCronAst,
  ParsedCronField,
  SimulatedCronRun,
} from './types';

const MONTH_NAMES: Readonly<Record<string, number>> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const WEEKDAY_NAMES: Readonly<Record<string, number>> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const EN_MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ES_MONTHS = [
  '',
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const EN_WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ES_WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseAtom(
  rawToken: string,
  min: number,
  max: number,
  isDow: boolean,
  names?: Readonly<Record<string, number>>
): number {
  const token = rawToken.trim().toUpperCase();
  if (!token) {
    throw new Error('Empty cron token.');
  }

  if (names && Object.prototype.hasOwnProperty.call(names, token)) {
    return names[token];
  }

  if (!/^\d+$/.test(token)) {
    throw new Error(`Invalid cron value "${rawToken}".`);
  }

  const num = Number(token);
  const effectiveMax = isDow ? 7 : max;
  if (num < min || num > effectiveMax) {
    throw new Error(
      `Value ${num} out of bounds (expected ${min}..${effectiveMax}).`
    );
  }
  return num;
}

function parseCronField(
  raw: string,
  fieldName: CronFieldName,
  min: number,
  max: number,
  isDow: boolean,
  names?: Readonly<Record<string, number>>
): ParsedCronField {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`Field "${fieldName}" cannot be empty.`);
  }

  const parts = trimmed.split(',');
  const resultSet = new Set<number>();

  for (const part of parts) {
    if (!part || !part.trim()) {
      throw new Error(`Empty list element in "${trimmed}".`);
    }

    const slashParts = part.trim().split('/');
    if (slashParts.length > 2) {
      throw new Error(`Invalid step syntax "${part}" in "${fieldName}".`);
    }

    const baseStr = slashParts[0];
    let step = 1;
    const hasStep = slashParts.length === 2;
    if (hasStep) {
      const stepStr = slashParts[1].trim();
      if (!/^\d+$/.test(stepStr)) {
        throw new Error(`Step must be a positive integer in "${part}".`);
      }
      step = Number(stepStr);
      if (step < 1) {
        throw new Error(`Step must be >= 1 in "${part}".`);
      }
    }

    const effectiveMax = isDow ? 6 : max;
    const normalizeDow = (n: number) => (isDow && n === 7 ? 0 : n);

    if (baseStr === '*') {
      for (let v = min; v <= effectiveMax; v += step) {
        resultSet.add(v);
      }
      continue;
    }

    if (baseStr.includes('-')) {
      const rangeParts = baseStr.split('-');
      if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
        throw new Error(`Invalid range "${baseStr}" in "${fieldName}".`);
      }
      const start = parseAtom(rangeParts[0], min, max, isDow, names);
      let end = parseAtom(rangeParts[1], min, max, isDow, names);
      if (isDow && rangeParts[1].trim().toUpperCase() === 'SUN' && start > 0) {
        end = 7;
      }
      if (start > end) {
        throw new Error(`Reversed range "${baseStr}" in "${fieldName}".`);
      }
      for (let v = start; v <= end; v += step) {
        resultSet.add(normalizeDow(v));
      }
      continue;
    }

    const single = parseAtom(baseStr, min, max, isDow, names);
    if (hasStep) {
      for (let v = normalizeDow(single); v <= effectiveMax; v += step) {
        resultSet.add(v);
      }
    } else {
      resultSet.add(normalizeDow(single));
    }
  }

  return {
    raw: trimmed,
    isWildcard: trimmed === '*',
    values: Array.from(resultSet).sort((a, b) => a - b),
  };
}

function expandNicknameOrTokens(
  rawExpression: string,
  targetFormat?: CronFormatMode
): { tokens: string[]; format: CronFormatMode } {
  const trimmed = rawExpression.trim();
  if (!trimmed) {
    throw new Error('Cron expression cannot be empty.');
  }

  if (trimmed.startsWith('@')) {
    const expanded = CRON_NICKNAME_MAP[trimmed.toLowerCase()];
    if (!expanded) {
      throw new Error(
        `Unsupported cron nickname "${trimmed}". Supported: @yearly, @annually, @monthly, @weekly, @daily, @midnight, @hourly.`
      );
    }
    const baseTokens = expanded.split(' ');
    const format: CronFormatMode = targetFormat ?? 'standard_5';
    return {
      tokens: format === 'extended_6' ? ['0', ...baseTokens] : baseTokens,
      format,
    };
  }

  const tokens = trimmed.split(/\s+/);
  const format: CronFormatMode =
    targetFormat ?? (tokens.length === 6 ? 'extended_6' : 'standard_5');
  return { tokens, format };
}

export function parseCronExpression(
  rawExpression: string,
  forcedFormat?: CronFormatMode
): { valid: boolean; ast?: ParsedCronAst; fieldErrors: CronFieldError[] } {
  const fieldErrors: CronFieldError[] = [];

  let tokens: string[];
  let format: CronFormatMode;
  try {
    const expanded = expandNicknameOrTokens(rawExpression, forcedFormat);
    tokens = expanded.tokens;
    format = expanded.format;
  } catch (err) {
    return {
      valid: false,
      fieldErrors: [
        {
          field: 'expression',
          message: err instanceof Error ? err.message : 'Invalid cron expression.',
        },
      ],
    };
  }

  const expectedLen = format === 'extended_6' ? 6 : 5;
  if (tokens.length !== expectedLen) {
    return {
      valid: false,
      fieldErrors: [
        {
          field: 'expression',
          message: `Expected ${expectedLen} whitespace-separated fields for ${format} format, received ${tokens.length}.`,
        },
      ],
    };
  }

  let seconds: ParsedCronField = { raw: '0', isWildcard: false, values: [0] };
  let offset = 0;
  if (format === 'extended_6') {
    try {
      seconds = parseCronField(tokens[0], 'seconds', 0, 59, false);
    } catch (err) {
      fieldErrors.push({
        field: 'seconds',
        message: err instanceof Error ? err.message : 'Invalid seconds field.',
      });
    }
    offset = 1;
  }

  let minutes: ParsedCronField | undefined;
  let hours: ParsedCronField | undefined;
  let daysOfMonth: ParsedCronField | undefined;
  let months: ParsedCronField | undefined;
  let daysOfWeek: ParsedCronField | undefined;

  try {
    minutes = parseCronField(tokens[offset], 'minutes', 0, 59, false);
  } catch (err) {
    fieldErrors.push({
      field: 'minutes',
      message: err instanceof Error ? err.message : 'Invalid minutes field.',
    });
  }

  try {
    hours = parseCronField(tokens[offset + 1], 'hours', 0, 23, false);
  } catch (err) {
    fieldErrors.push({
      field: 'hours',
      message: err instanceof Error ? err.message : 'Invalid hours field.',
    });
  }

  try {
    daysOfMonth = parseCronField(tokens[offset + 2], 'daysOfMonth', 1, 31, false);
  } catch (err) {
    fieldErrors.push({
      field: 'daysOfMonth',
      message: err instanceof Error ? err.message : 'Invalid day-of-month field.',
    });
  }

  try {
    months = parseCronField(tokens[offset + 3], 'months', 1, 12, false, MONTH_NAMES);
  } catch (err) {
    fieldErrors.push({
      field: 'months',
      message: err instanceof Error ? err.message : 'Invalid months field.',
    });
  }

  try {
    daysOfWeek = parseCronField(
      tokens[offset + 4],
      'daysOfWeek',
      0,
      6,
      true,
      WEEKDAY_NAMES
    );
  } catch (err) {
    fieldErrors.push({
      field: 'daysOfWeek',
      message: err instanceof Error ? err.message : 'Invalid day-of-week field.',
    });
  }

  if (
    fieldErrors.length > 0 ||
    !minutes ||
    !hours ||
    !daysOfMonth ||
    !months ||
    !daysOfWeek
  ) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    ast: {
      format,
      seconds,
      minutes,
      hours,
      daysOfMonth,
      months,
      daysOfWeek,
      usesDomDowUnion: !daysOfMonth.isWildcard && !daysOfWeek.isWildcard,
    },
    fieldErrors: [],
  };
}

export function updateCronFieldAt(
  expression: string,
  format: CronFormatMode,
  field: CronFieldName,
  newValue: string
): string {
  const defaultTokens =
    format === 'extended_6'
      ? ['0', '*', '*', '*', '*', '*']
      : ['*', '*', '*', '*', '*'];

  let tokens: string[];
  try {
    const expanded = expandNicknameOrTokens(expression, format);
    tokens =
      expanded.tokens.length === defaultTokens.length
        ? expanded.tokens
        : [...defaultTokens];
  } catch {
    tokens = [...defaultTokens];
  }

  const indexMap5: Readonly<Record<CronFieldName, number>> = {
    seconds: 0,
    minutes: 0,
    hours: 1,
    daysOfMonth: 2,
    months: 3,
    daysOfWeek: 4,
  };
  const indexMap6: Readonly<Record<CronFieldName, number>> = {
    seconds: 0,
    minutes: 1,
    hours: 2,
    daysOfMonth: 3,
    months: 4,
    daysOfWeek: 5,
  };

  if (format === 'standard_5' && field === 'seconds') {
    return tokens.join(' ');
  }

  const idx = format === 'extended_6' ? indexMap6[field] : indexMap5[field];
  tokens[idx] = newValue.trim() || '*';
  return tokens.join(' ');
}

function extractStepNumber(raw: string): number | null {
  const m = /^\*\/(\d+)$/.exec(raw.trim());
  return m ? Number(m[1]) : null;
}

function formatList(items: string[], conjunction: string): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

export function describeCronExpression(
  ast: ParsedCronAst,
  locale: 'en' | 'es'
): string {
  const isEs = locale === 'es';
  const conj = isEs ? 'y' : 'and';
  const weekdayNames = isEs ? ES_WEEKDAYS : EN_WEEKDAYS;
  const monthNames = isEs ? ES_MONTHS : EN_MONTHS;

  let secPrefix = '';
  if (ast.format === 'extended_6') {
    const secStep = extractStepNumber(ast.seconds.raw);
    if (ast.seconds.isWildcard) {
      secPrefix = isEs ? 'Cada segundo' : 'Every second';
    } else if (secStep !== null) {
      secPrefix = isEs ? `Cada ${secStep} segundos` : `Every ${secStep} seconds`;
    } else if (!(ast.seconds.values.length === 1 && ast.seconds.values[0] === 0)) {
      secPrefix = isEs
        ? `En los segundos ${ast.seconds.values.map(pad2).join(', ')}`
        : `At second ${ast.seconds.values.map(pad2).join(', ')}`;
    }
  }

  let timePart = '';
  const minStep = extractStepNumber(ast.minutes.raw);
  const hrStep = extractStepNumber(ast.hours.raw);

  if (ast.minutes.values.length === 1 && ast.hours.values.length === 1) {
    const timeStr = `${pad2(ast.hours.values[0])}:${pad2(ast.minutes.values[0])}`;
    timePart = isEs ? `A las ${timeStr}` : `At ${timeStr}`;
  } else if (ast.minutes.isWildcard && ast.hours.isWildcard) {
    timePart = isEs ? 'Cada minuto' : 'Every minute';
  } else if (minStep !== null) {
    const everyMin = isEs ? `Cada ${minStep} minutos` : `Every ${minStep} minutes`;
    if (ast.hours.isWildcard) {
      timePart = everyMin;
    } else {
      const hrDesc =
        ast.hours.values.length > 2
          ? `${pad2(ast.hours.values[0])}:00–${pad2(ast.hours.values[ast.hours.values.length - 1])}:00`
          : ast.hours.values.map((h) => `${pad2(h)}:00`).join(', ');
      timePart = isEs ? `${everyMin}, de ${hrDesc}` : `${everyMin}, hours ${hrDesc}`;
    }
  } else if (ast.hours.isWildcard && ast.minutes.values.length === 1) {
    timePart = isEs
      ? `Cada hora en el minuto ${pad2(ast.minutes.values[0])}`
      : `Every hour at minute ${pad2(ast.minutes.values[0])}`;
  } else if (hrStep !== null) {
    timePart = isEs
      ? `Cada ${hrStep} horas (minuto ${ast.minutes.values.map(pad2).join(', ')})`
      : `Every ${hrStep} hours at minute ${ast.minutes.values.map(pad2).join(', ')}`;
  } else {
    const hrs = ast.hours.isWildcard
      ? isEs
        ? 'cada hora'
        : 'every hour'
      : ast.hours.values.map(pad2).join(', ');
    timePart = isEs
      ? `Minuto ${ast.minutes.values.map(pad2).join(', ')}, hora ${hrs}`
      : `At minute ${ast.minutes.values.map(pad2).join(', ')}, hour ${hrs}`;
  }

  let domPart = '';
  if (!ast.daysOfMonth.isWildcard) {
    const days = ast.daysOfMonth.values.map(String);
    domPart = isEs
      ? `el día ${formatList(days, conj)} del mes`
      : `on day ${formatList(days, conj)} of the month`;
  }

  let dowPart = '';
  if (!ast.daysOfWeek.isWildcard) {
    const dows = ast.daysOfWeek.values;
    if (
      dows.length === 5 &&
      dows[0] === 1 &&
      dows[1] === 2 &&
      dows[2] === 3 &&
      dows[3] === 4 &&
      dows[4] === 5
    ) {
      dowPart = isEs ? 'de lunes a viernes' : 'Monday through Friday';
    } else {
      dowPart = formatList(
        dows.map((d) => weekdayNames[d]),
        conj
      );
      dowPart = isEs ? `los ${dowPart}` : `on ${dowPart}`;
    }
  }

  let monthPart = '';
  if (!ast.months.isWildcard) {
    monthPart = isEs
      ? `en ${formatList(ast.months.values.map((m) => monthNames[m]), conj)}`
      : `only in ${formatList(ast.months.values.map((m) => monthNames[m]), conj)}`;
  }

  const segments: string[] = [];
  if (secPrefix) {
    segments.push(secPrefix);
  }
  segments.push(timePart);

  if (ast.usesDomDowUnion && domPart && dowPart) {
    segments.push(`${domPart} ${isEs ? 'o' : 'or'} ${dowPart}`);
  } else if (domPart) {
    segments.push(domPart);
  } else if (dowPart) {
    segments.push(dowPart);
  }

  if (monthPart) {
    segments.push(monthPart);
  }

  return segments.join(', ');
}

interface ZonedWallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dow: number;
}

const dtfPartsCache = new Map<string, Intl.DateTimeFormat>();
const dtfDisplayCache = new Map<string, Intl.DateTimeFormat>();

const WEEKDAY_SHORT_MAP: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const MAX_DAYS_PER_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function getPartsFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = dtfPartsCache.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });
    dtfPartsCache.set(timezone, fmt);
  }
  return fmt;
}

function getDisplayFormatter(timezone: string, locale: 'en' | 'es'): Intl.DateTimeFormat {
  const key = `${timezone}:${locale}`;
  let fmt = dtfDisplayCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      timeZoneName: 'short',
      hourCycle: 'h23',
    });
    dtfDisplayCache.set(key, fmt);
  }
  return fmt;
}

export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  try {
    getPartsFormatter(timezone);
    return true;
  } catch {
    return false;
  }
}

function getZonedParts(epochMs: number, timezone: string): ZonedWallClock {
  const parts = getPartsFormatter(timezone).formatToParts(new Date(epochMs));
  let year = 0;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let dow = 0;

  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value);
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour': {
        const parsedHour = Number(part.value);
        hour = parsedHour === 24 ? 0 : parsedHour;
        break;
      }
      case 'minute':
        minute = Number(part.value);
        break;
      case 'second':
        second = Number(part.value);
        break;
      case 'weekday':
        dow = WEEKDAY_SHORT_MAP[part.value] ?? 0;
        break;
    }
  }

  return { year, month, day, hour, minute, second, dow };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function hasAnyValidCalendarDay(ast: ParsedCronAst): boolean {
  if (ast.daysOfMonth.isWildcard || !ast.daysOfWeek.isWildcard) {
    return true;
  }
  for (const month of ast.months.values) {
    const maxDay = MAX_DAYS_PER_MONTH[month] ?? 31;
    for (const dom of ast.daysOfMonth.values) {
      if (dom <= maxDay) {
        return true;
      }
    }
  }
  return false;
}

function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string
): { utcMs: number; dstWarning: boolean } {
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const p1 = getZonedParts(targetAsUtc, timezone);
  const offset1 =
    Date.UTC(p1.year, p1.month - 1, p1.day, p1.hour, p1.minute, p1.second) -
    targetAsUtc;
  const candidate1 = targetAsUtc - offset1;

  const p2 = getZonedParts(candidate1, timezone);
  const offset2 =
    Date.UTC(p2.year, p2.month - 1, p2.day, p2.hour, p2.minute, p2.second) -
    candidate1;

  const isSpringGap =
    p2.year !== year ||
    p2.month !== month ||
    p2.day !== day ||
    p2.hour !== hour ||
    p2.minute !== minute;

  if (isSpringGap) {
    return { utcMs: candidate1, dstWarning: true };
  }

  const adjusted = targetAsUtc - offset2;
  const later = getZonedParts(adjusted + 3_600_000, timezone);
  const earlier = getZonedParts(adjusted - 3_600_000, timezone);
  const isFallBackRepeated =
    (later.hour === hour && later.minute === minute) ||
    (earlier.hour === hour && earlier.minute === minute);

  return {
    utcMs: adjusted,
    dstWarning: isFallBackRepeated || offset1 !== offset2,
  };
}

function formatRelativeDelta(deltaMs: number, locale: 'en' | 'es'): string {
  const totalSec = Math.max(0, Math.floor(deltaMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const prefix = locale === 'es' ? 'en' : 'in';

  if (days > 0) {
    return `${prefix} ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${prefix} ${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${prefix} ${minutes}m ${seconds}s`;
  }
  return `${prefix} ${seconds}s`;
}

function advanceCursorMinute(cursor: ZonedWallClock): void {
  cursor.second = 0;
  cursor.minute += 1;
  if (cursor.minute > 59) {
    cursor.minute = 0;
    advanceCursorHour(cursor);
  }
}

function advanceCursorHour(cursor: ZonedWallClock): void {
  cursor.second = 0;
  cursor.minute = 0;
  cursor.hour += 1;
  if (cursor.hour > 23) {
    cursor.hour = 0;
    advanceCursorDay(cursor);
  }
}

function advanceCursorDay(cursor: ZonedWallClock): void {
  cursor.second = 0;
  cursor.minute = 0;
  cursor.hour = 0;
  cursor.day += 1;
  if (cursor.day > getDaysInMonth(cursor.year, cursor.month)) {
    cursor.day = 1;
    cursor.month += 1;
    if (cursor.month > 12) {
      cursor.month = 1;
      cursor.year += 1;
    }
  }
}

export function simulateNextRuns(
  ast: ParsedCronAst,
  timezone: string,
  count: number,
  referenceDateMs: number,
  locale: 'en' | 'es' = 'en'
): { runs: SimulatedCronRun[]; impossibleDateWarning: boolean } {
  if (!hasAnyValidCalendarDay(ast)) {
    return { runs: [], impossibleDateWarning: true };
  }

  const domSet = new Set(ast.daysOfMonth.values);
  const dowSet = new Set(ast.daysOfWeek.values);
  const startWall = getZonedParts(referenceDateMs + 1000, timezone);
  const maxYear = startWall.year + MAX_SIMULATION_YEARS;

  const cursor: ZonedWallClock = { ...startWall };
  if (ast.format === 'standard_5' && cursor.second > 0) {
    advanceCursorMinute(cursor);
  }

  const displayFmt = getDisplayFormatter(timezone, locale);
  const runs: SimulatedCronRun[] = [];
  let iterations = 0;

  while (runs.length < count && iterations < MAX_SIMULATION_ITERATIONS) {
    iterations += 1;
    if (cursor.year > maxYear) {
      break;
    }

    const nextMonth = ast.months.values.find((m) => m >= cursor.month);
    if (nextMonth === undefined) {
      cursor.year += 1;
      cursor.month = ast.months.values[0];
      cursor.day = 1;
      cursor.hour = 0;
      cursor.minute = 0;
      cursor.second = 0;
      continue;
    }
    if (nextMonth > cursor.month) {
      cursor.month = nextMonth;
      cursor.day = 1;
      cursor.hour = 0;
      cursor.minute = 0;
      cursor.second = 0;
    }

    const daysInMonth = getDaysInMonth(cursor.year, cursor.month);
    let matchedDay = -1;
    for (let d = cursor.day; d <= daysInMonth; d += 1) {
      const dow = new Date(Date.UTC(cursor.year, cursor.month - 1, d)).getUTCDay();
      let ok: boolean;
      if (ast.daysOfMonth.isWildcard && ast.daysOfWeek.isWildcard) {
        ok = true;
      } else if (!ast.daysOfMonth.isWildcard && ast.daysOfWeek.isWildcard) {
        ok = domSet.has(d);
      } else if (ast.daysOfMonth.isWildcard && !ast.daysOfWeek.isWildcard) {
        ok = dowSet.has(dow);
      } else {
        ok = domSet.has(d) || dowSet.has(dow);
      }
      if (ok) {
        matchedDay = d;
        break;
      }
    }

    if (matchedDay === -1) {
      cursor.month += 1;
      if (cursor.month > 12) {
        cursor.month = 1;
        cursor.year += 1;
      }
      cursor.day = 1;
      cursor.hour = 0;
      cursor.minute = 0;
      cursor.second = 0;
      continue;
    }
    if (matchedDay > cursor.day) {
      cursor.day = matchedDay;
      cursor.hour = 0;
      cursor.minute = 0;
      cursor.second = 0;
    }

    const nextHour = ast.hours.values.find((h) => h >= cursor.hour);
    if (nextHour === undefined) {
      advanceCursorDay(cursor);
      continue;
    }
    if (nextHour > cursor.hour) {
      cursor.hour = nextHour;
      cursor.minute = 0;
      cursor.second = 0;
    }

    const nextMinute = ast.minutes.values.find((m) => m >= cursor.minute);
    if (nextMinute === undefined) {
      advanceCursorHour(cursor);
      continue;
    }
    if (nextMinute > cursor.minute) {
      cursor.minute = nextMinute;
      cursor.second = 0;
    }

    const nextSecond = ast.seconds.values.find((s) => s >= cursor.second);
    if (nextSecond === undefined) {
      advanceCursorMinute(cursor);
      continue;
    }
    cursor.second = nextSecond;

    const { utcMs, dstWarning } = wallClockToUtc(
      cursor.year,
      cursor.month,
      cursor.day,
      cursor.hour,
      cursor.minute,
      cursor.second,
      timezone
    );

    if (utcMs > referenceDateMs) {
      runs.push({
        index: runs.length + 1,
        epochMs: utcMs,
        isoUtc: new Date(utcMs).toISOString(),
        formattedTargetTz: displayFmt.format(new Date(utcMs)),
        relativeDelta: formatRelativeDelta(utcMs - referenceDateMs, locale),
        dstWarning: dstWarning || undefined,
      });
    }

    if (ast.format === 'extended_6') {
      cursor.second += 1;
      if (cursor.second > 59) {
        advanceCursorMinute(cursor);
      }
    } else {
      advanceCursorMinute(cursor);
    }
  }

  return {
    runs,
    impossibleDateWarning: runs.length === 0,
  };
}

export function generateCronSnippets(
  rawExpression: string,
  ast: ParsedCronAst,
  timezone: string
): Record<CronSnippetTarget, string> {
  const fiveField = `${ast.minutes.raw} ${ast.hours.raw} ${ast.daysOfMonth.raw} ${ast.months.raw} ${ast.daysOfWeek.raw}`;
  const fullExpr =
    ast.format === 'extended_6'
      ? `${ast.seconds.raw} ${fiveField}`
      : fiveField;
  const strippedComment =
    ast.format === 'extended_6'
      ? `# Note: seconds field (${ast.seconds.raw}) stripped for 5-field compatibility\n`
      : '';

  return {
    crontab: `${strippedComment}${fiveField} /usr/local/bin/job.sh`,
    githubActions: `${strippedComment}on:\n  schedule:\n    - cron: '${fiveField}' # Runs in UTC`,
    kubernetes: `apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: privknife-scheduled-job\nspec:\n  schedule: "${fiveField}"\n  timeZone: "${timezone}"`,
    nodeCron: `cron.schedule('${rawExpression.trim().startsWith('@') ? fiveField : fullExpr}', () => {\n  // Execute local job\n}, { timezone: '${timezone}' });`,
  };
}

const EMPTY_SNIPPETS: Record<CronSnippetTarget, string> = {
  crontab: '',
  githubActions: '',
  kubernetes: '',
  nodeCron: '',
};

export function evaluateCronSchedule(
  options: CronStudioOptions
): CronStudioResult {
  if (!isValidIanaTimezone(options.timezone)) {
    return {
      valid: false,
      humanDescription: '',
      runs: [],
      impossibleDateWarning: false,
      snippets: { ...EMPTY_SNIPPETS },
      fieldErrors: [
        {
          field: 'timezone',
          message: `Invalid IANA timezone identifier "${options.timezone}".`,
        },
      ],
    };
  }

  const parsed = parseCronExpression(options.expression, options.format);
  if (!parsed.valid || !parsed.ast) {
    return {
      valid: false,
      humanDescription: '',
      runs: [],
      impossibleDateWarning: false,
      snippets: { ...EMPTY_SNIPPETS },
      fieldErrors: parsed.fieldErrors,
    };
  }

  const ast = parsed.ast;
  const referenceDateMs = options.referenceDateMs ?? Date.now();
  const humanDescription = describeCronExpression(ast, options.locale);
  const { runs, impossibleDateWarning } = simulateNextRuns(
    ast,
    options.timezone,
    options.simulationCount,
    referenceDateMs,
    options.locale
  );
  const snippets = generateCronSnippets(options.expression, ast, options.timezone);

  return {
    valid: true,
    ast,
    humanDescription,
    runs,
    impossibleDateWarning,
    snippets,
    fieldErrors: [],
  };
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportRunsToCsv(result: CronStudioResult): string {
  const header = 'index,iso_utc,target_timezone,relative_delta,dst_warning';
  const rows = result.runs.map((run) =>
    [
      String(run.index),
      escapeCsvCell(run.isoUtc),
      escapeCsvCell(run.formattedTargetTz),
      escapeCsvCell(run.relativeDelta),
      run.dstWarning ? 'true' : 'false',
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function exportRunsToJson(result: CronStudioResult): string {
  return JSON.stringify(
    {
      valid: result.valid,
      humanDescription: result.humanDescription,
      impossibleDateWarning: result.impossibleDateWarning,
      runs: result.runs,
    },
    null,
    2
  );
}
