import { describe, expect, it, vi } from 'vitest';
import {
  applyTimestampOffset,
  computeTimestampDelta,
  convertBatchTimestamps,
  exportBatchToCsv,
  exportBatchToJson,
  floorDivBigInt,
  getSupportedIanaTimezones,
  parseTimestampInput,
} from './engine';
import {
  FIXED_REF_MS,
  MIXED_BATCH_SAMPLE,
  NANOSECOND_VECTOR,
  NEGATIVE_EPOCH_VECTOR,
  OUT_OF_BOUNDS_EPOCH,
} from './test-fixtures';
import { MAX_BATCH_LINES } from './types';

describe('Timestamp & Timezone Converter Engine — Seam 1A (BigInt Parser, Calendar Metadata & Formats)', () => {
  describe('1. Nanosecond BigInt Precision & Euclidean Division', () => {
    it('preserves full nanosecond remainder without IEEE-754 float truncation for numeric and ISO-8601 inputs', () => {
      const nano = parseTimestampInput(
        NANOSECOND_VECTOR,
        'auto',
        ['UTC', 'America/New_York', 'Asia/Tokyo'],
        FIXED_REF_MS,
        'en'
      );

      expect(nano.valid).toBe(true);
      expect(nano.detectedUnit).toBe('nanoseconds');
      expect(nano.epochSeconds).toBe('1763551200');
      expect(nano.epochMilliseconds).toBe('1763551200123');
      expect(nano.epochMicroseconds).toBe('1763551200123456');
      expect(nano.epochNanoseconds).toBe(NANOSECOND_VECTOR);
      expect(nano.isoUtc).toBe('2025-11-19T11:20:00.123456789Z');

      const fromIso = parseTimestampInput(
        '2025-11-19T11:20:00.123456789Z',
        'auto',
        ['UTC'],
        FIXED_REF_MS,
        'en'
      );
      expect(fromIso.valid).toBe(true);
      expect(fromIso.detectedUnit).toBe('date_string');
      expect(fromIso.epochNanoseconds).toBe(NANOSECOND_VECTOR);
      expect(fromIso.isoUtc).toBe('2025-11-19T11:20:00.123456789Z');
    });
  });

  describe('2. Negative Pre-1970 Epochs & Sub-Second Floor Rounding', () => {
    it('handles negative epochs and computes Euclidean floor seconds for -1 ms', () => {
      const negDay = parseTimestampInput(
        NEGATIVE_EPOCH_VECTOR,
        'auto',
        ['UTC'],
        FIXED_REF_MS,
        'en'
      );
      expect(negDay.valid).toBe(true);
      expect(negDay.detectedUnit).toBe('seconds');
      expect(negDay.isoUtc).toBe('1969-12-31T00:00:00.000Z');
      expect(negDay.epochSeconds).toBe('-86400');

      expect(floorDivBigInt(-1n, 1000n)).toBe(-1n);
      const negOneMs = parseTimestampInput(
        '-1',
        'milliseconds',
        ['UTC'],
        FIXED_REF_MS,
        'en'
      );
      expect(negOneMs.valid).toBe(true);
      expect(negOneMs.epochSeconds).toBe('-1');
      expect(negOneMs.epochMilliseconds).toBe('-1');
      expect(negOneMs.isoUtc).toBe('1969-12-31T23:59:59.999Z');
    });
  });

  describe('3. Unit Auto-Detection & Manual Overrides', () => {
    it('distinguishes s/ms/us/ns, decimal seconds, and honors manual unit overrides', () => {
      expect(parseTimestampInput('1763551200', 'auto').detectedUnit).toBe('seconds');
      expect(parseTimestampInput('1763551200500', 'auto').detectedUnit).toBe(
        'milliseconds'
      );
      expect(parseTimestampInput('1763551200123456', 'auto').detectedUnit).toBe(
        'microseconds'
      );
      expect(parseTimestampInput('1763551200123456789', 'auto').detectedUnit).toBe(
        'nanoseconds'
      );

      const decSec = parseTimestampInput('1763551200.5', 'auto');
      expect(decSec.valid).toBe(true);
      expect(decSec.detectedUnit).toBe('seconds');
      expect(decSec.epochMilliseconds).toBe('1763551200500');
      expect(decSec.isoUtc).toBe('2025-11-19T11:20:00.500Z');

      const overridden = parseTimestampInput('1000', 'milliseconds');
      expect(overridden.valid).toBe(true);
      expect(overridden.epochSeconds).toBe('1');
      expect(overridden.isoUtc).toBe('1970-01-01T00:00:01.000Z');
    });
  });

  describe('4. Out-of-Bounds, Empty & Malformed Input Guards', () => {
    it('returns valid: false cleanly without throwing on extreme epochs or invalid strings', () => {
      const extreme = parseTimestampInput(OUT_OF_BOUNDS_EPOCH, 'auto');
      expect(extreme.valid).toBe(false);
      expect(extreme.error).toMatch(/range|bounds/i);

      const empty = parseTimestampInput('   ', 'auto');
      expect(empty.valid).toBe(false);

      const bad = parseTimestampInput('not-a-timestamp', 'auto');
      expect(bad.valid).toBe(false);
      expect(bad.error).toBeDefined();
    });
  });

  describe('5. Calendar Metadata, Formats, Discord Tags & Multi-Timezone Views', () => {
    it('computes accurate ISO weeks, day-of-year, leap-year flags, Discord tags, relative time, and timezone views', () => {
      expect(parseTimestampInput('2026-01-01T12:00:00Z').isoWeekNumber).toBe(1);
      expect(parseTimestampInput('2020-12-31T12:00:00Z').isoWeekNumber).toBe(53);
      expect(parseTimestampInput('2023-01-01T12:00:00Z').isoWeekNumber).toBe(52);

      const leap2024 = parseTimestampInput('2024-12-31T00:00:00Z');
      expect(leap2024.dayOfYear).toBe(366);
      expect(leap2024.isLeapYear).toBe(true);

      const nonLeap2025 = parseTimestampInput('2025-12-31T00:00:00Z');
      expect(nonLeap2025.dayOfYear).toBe(365);
      expect(nonLeap2025.isLeapYear).toBe(false);

      expect(parseTimestampInput('1900-06-01T00:00:00Z').isLeapYear).toBe(false);
      expect(parseTimestampInput('2000-06-01T00:00:00Z').isLeapYear).toBe(true);

      const base = parseTimestampInput(
        '1763551200',
        'auto',
        ['UTC', 'America/New_York', 'Asia/Tokyo'],
        FIXED_REF_MS,
        'en'
      );
      expect(base.sqlTimestampUtc).toBe('2025-11-19 11:20:00.000');
      expect(base.rfc2822).toContain('19 Nov 2025 11:20:00 GMT');
      expect(base.relativeTime).toMatch(/1 hour ago/i);
      expect(base.discordTags.R).toBe('<t:1763551200:R>');
      expect(base.discordTags.F).toBe('<t:1763551200:F>');
      expect(base.timezoneViews).toHaveLength(3);
      expect(base.timezoneViews[2]?.timezone).toBe('Asia/Tokyo');
      expect(base.timezoneViews[2]?.formatted).toContain('20:20:00');
      expect(getSupportedIanaTimezones().length).toBeGreaterThan(20);
    });
  });
});

describe('Timestamp & Timezone Converter Engine — Seam 1B (Delta, Offsets, Batch Logs & Exports)', () => {
  describe('6. Duration Delta & O(1) Weekday Arithmetic', () => {
    it('computes positive, negative, zero deltas and O(1) weekday counts across multi-year spans', () => {
      const start = Date.UTC(2026, 0, 5, 0, 0, 0); // Monday
      const end =
        start +
        2 * 86_400_000 +
        14 * 3_600_000 +
        32 * 60_000 +
        10 * 1000 +
        250;
      const pos = computeTimestampDelta(start, end);
      expect(pos.sign).toBe(1);
      expect(pos.breakdown).toEqual({
        days: 2,
        hours: 14,
        minutes: 32,
        seconds: 10,
        ms: 250,
      });

      const neg = computeTimestampDelta(end, start);
      expect(neg.sign).toBe(-1);
      expect(neg.breakdown.days).toBe(2);

      const zero = computeTimestampDelta(start, start);
      expect(zero.sign).toBe(0);
      expect(zero.totalMilliseconds).toBe(0);
      expect(zero.weekdaysCount).toBe(0);

      // Mon 2026-01-05 00:00Z -> Mon 2026-01-12 00:00Z = exact 5 weekdays (Mon..Fri)
      const oneWeek = computeTimestampDelta(start, Date.UTC(2026, 0, 12, 0, 0, 0));
      expect(oneWeek.weekdaysCount).toBe(5);

      // Multi-century span executes in O(1) (< 5ms)
      const started = performance.now();
      const twoCenturies = computeTimestampDelta(
        Date.UTC(1970, 0, 1),
        Date.UTC(2170, 0, 1)
      );
      expect(performance.now() - started).toBeLessThan(10);
      expect(twoCenturies.weekdaysCount).toBeGreaterThan(50_000);
    });
  });

  describe('7. Calendar Offset Arithmetic', () => {
    it('adds and subtracts years, months, days, hours, minutes, and seconds cleanly', () => {
      const baseMs = Date.UTC(2026, 0, 15, 10, 0, 0);
      const added = applyTimestampOffset(baseMs, {
        years: 1,
        months: 2,
        days: 3,
        hours: 4,
        minutes: 5,
        seconds: 6,
      });
      expect(new Date(added).toISOString()).toBe('2027-03-18T14:05:06.000Z');

      const subtracted = applyTimestampOffset(baseMs, {
        days: -15,
        hours: -10,
      });
      expect(new Date(subtracted).toISOString()).toBe('2025-12-31T00:00:00.000Z');
    });
  });

  describe('8. Batch Log Converter & Guardrails', () => {
    it('converts mixed epochs, ISO strings, inline log ts=, keeps malformed lines non-fatal, and enforces MAX_BATCH_LINES', () => {
      const rows = convertBatchTimestamps(MIXED_BATCH_SAMPLE, 'UTC', 'auto');
      expect(rows).toHaveLength(6);
      expect(rows[0]?.valid).toBe(true);
      expect(rows[0]?.isoUtc).toBe('2025-11-19T11:20:00.000Z');
      expect(rows[1]?.detectedUnit).toBe('milliseconds');
      expect(rows[2]?.isoUtc).toBe('2026-01-15T09:30:00.000Z');
      // Log line extracts inline 13-digit ms epoch cleanly
      expect(rows[3]?.valid).toBe(true);
      expect(rows[3]?.isoUtc).toBe('2025-11-19T11:20:00.000Z');
      // Malformed line fails individually without halting row 6
      expect(rows[4]?.valid).toBe(false);
      expect(rows[5]?.valid).toBe(true);
      expect(rows[5]?.isoUtc).toBe('2025-11-19T11:20:00.123456789Z');

      const hugeBatch = Array(MAX_BATCH_LINES + 25).fill('1763551200').join('\n');
      const capped = convertBatchTimestamps(hugeBatch, 'UTC', 'auto');
      expect(capped).toHaveLength(MAX_BATCH_LINES);
    });
  });

  describe('9. CSV/JSON Export & Zero-Network Privacy Audit', () => {
    it('builds valid RFC-4180 CSV & JSON exports and invokes zero network or storage writes', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

      try {
        const rows = convertBatchTimestamps(MIXED_BATCH_SAMPLE, 'Asia/Tokyo', 'auto');
        const csv = exportBatchToCsv(rows);
        expect(csv).toContain('line,raw_input,valid,detected_unit,iso_utc,target_timezone,error');
        expect(csv).toContain('2025-11-19T11:20:00.123456789Z');

        const parsedJson = JSON.parse(exportBatchToJson(rows));
        expect(parsedJson).toHaveLength(6);
        expect(parsedJson[3]?.valid).toBe(true);
        expect(parsedJson[4]?.valid).toBe(false);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(storageSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        storageSpy.mockRestore();
      }
    });
  });
});
