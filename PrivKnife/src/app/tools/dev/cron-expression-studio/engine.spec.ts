import { describe, expect, it, vi } from 'vitest';
import {
  describeCronExpression,
  evaluateCronSchedule,
  exportRunsToCsv,
  exportRunsToJson,
  parseCronExpression,
  updateCronFieldAt,
} from './engine';
import {
  ANCHOR_2026_START_UTC_MS,
  ANCHOR_FRIDAY_UTC_MS,
  ANCHOR_US_FALL_DST_MS,
  ANCHOR_US_SPRING_DST_MS,
} from './test-fixtures';

describe('Cron Expression Studio Engine — Seam 1A (Parser & Bilingual Explainer)', () => {
  describe('1. 5-Field & 6-Field Parsing', () => {
    it('parses standard 5-field and extended 6-field expressions into sorted field arrays', () => {
      const res5 = parseCronExpression('*/15 9-17 * * MON-FRI', 'standard_5');
      expect(res5.valid).toBe(true);
      expect(res5.ast?.format).toBe('standard_5');
      expect(res5.ast?.seconds.values).toEqual([0]);
      expect(res5.ast?.minutes.values).toEqual([0, 15, 30, 45]);
      expect(res5.ast?.hours.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      expect(res5.ast?.daysOfMonth.isWildcard).toBe(true);
      expect(res5.ast?.daysOfWeek.values).toEqual([1, 2, 3, 4, 5]);

      const res6 = parseCronExpression('0 */15 9-17 * * 1-5', 'extended_6');
      expect(res6.valid).toBe(true);
      expect(res6.ast?.format).toBe('extended_6');
      expect(res6.ast?.seconds.values).toEqual([0]);
      expect(res6.ast?.minutes.values).toEqual([0, 15, 30, 45]);
      expect(res6.ast?.daysOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('2. Nicknames & Format Coercion', () => {
    it('expands POSIX @nicknames case-insensitively across 5-field and 6-field modes and rejects @reboot', () => {
      const daily = parseCronExpression(' @DaIlY ', 'standard_5');
      expect(daily.valid).toBe(true);
      expect(daily.ast?.minutes.values).toEqual([0]);
      expect(daily.ast?.hours.values).toEqual([0]);

      const yearly6 = parseCronExpression('@YEARLY', 'extended_6');
      expect(yearly6.valid).toBe(true);
      expect(yearly6.ast?.seconds.values).toEqual([0]);
      expect(yearly6.ast?.months.values).toEqual([1]);
      expect(yearly6.ast?.daysOfMonth.values).toEqual([1]);

      for (const alias of ['@annually', '@monthly', '@weekly', '@midnight', '@hourly']) {
        expect(parseCronExpression(alias, 'standard_5').valid).toBe(true);
      }

      const reboot = parseCronExpression('@reboot', 'standard_5');
      expect(reboot.valid).toBe(false);
      expect(reboot.fieldErrors[0]?.message).toMatch(/reboot|unsupported/i);
    });
  });

  describe('3. Named Months, Weekdays, Sunday 7→0, Wrap Ranges & Stepped Lists', () => {
    it('supports month/weekday names, Sunday 7→0 wrap ranges (5-7, FRI-SUN), and offset steps (5/15)', () => {
      const monthsRes = parseCronExpression('5/15 12 * jan-MAR,dec *', 'standard_5');
      expect(monthsRes.valid).toBe(true);
      expect(monthsRes.ast?.minutes.values).toEqual([5, 20, 35, 50]);
      expect(monthsRes.ast?.months.values).toEqual([1, 2, 3, 12]);

      const numericWrap = parseCronExpression('0 8 * * 5-7', 'standard_5');
      expect(numericWrap.valid).toBe(true);
      expect(numericWrap.ast?.daysOfWeek.values).toEqual([0, 5, 6]);

      const namedWrap = parseCronExpression('0 8 * * FRI-SUN', 'standard_5');
      expect(namedWrap.valid).toBe(true);
      expect(namedWrap.ast?.daysOfWeek.values).toEqual([0, 5, 6]);

      const sundaySeven = parseCronExpression('0 12 * * 7', 'standard_5');
      const sundayZero = parseCronExpression('0 12 * * 0', 'standard_5');
      expect(sundaySeven.valid).toBe(true);
      expect(sundaySeven.ast?.daysOfWeek.values).toEqual(
        sundayZero.ast?.daysOfWeek.values
      );
    });
  });

  describe('4. POSIX DOM + DOW Union Semantics & Builder Field Updates', () => {
    it('marks usesDomDowUnion true only when both DOM and DOW are non-wildcard and updates fields cleanly', () => {
      const unionRes = parseCronExpression('0 9 15 * MON', 'standard_5');
      expect(unionRes.valid).toBe(true);
      expect(unionRes.ast?.usesDomDowUnion).toBe(true);

      const nonUnion1 = parseCronExpression('0 9 15 * *', 'standard_5');
      expect(nonUnion1.ast?.usesDomDowUnion).toBe(false);

      const nonUnion2 = parseCronExpression('0 9 * * MON', 'standard_5');
      expect(nonUnion2.ast?.usesDomDowUnion).toBe(false);

      expect(
        updateCronFieldAt('*/15 9-17 * * MON-FRI', 'standard_5', 'hours', '8-18')
      ).toBe('*/15 8-18 * * MON-FRI');
      expect(updateCronFieldAt('@daily', 'standard_5', 'hours', '6')).toBe(
        '0 6 * * *'
      );
    });
  });

  describe('5. Syntax & Range Validation Errors', () => {
    it('surfaces pinpoint fieldErrors for wrong arity, out-of-range numbers, bad steps, reversed ranges, and empty list tokens', () => {
      expect(parseCronExpression('', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('* * * *', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('* * * * * *', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('* * * * *', 'extended_6').valid).toBe(false);
      expect(parseCronExpression('* * * * * * *', 'extended_6').valid).toBe(false);

      const min60 = parseCronExpression('60 * * * *', 'standard_5');
      expect(min60.valid).toBe(false);
      expect(min60.fieldErrors.some((e) => e.field === 'minutes')).toBe(true);

      const hr24 = parseCronExpression('0 24 * * *', 'standard_5');
      expect(hr24.valid).toBe(false);
      expect(hr24.fieldErrors.some((e) => e.field === 'hours')).toBe(true);

      const dom0 = parseCronExpression('0 0 0 * *', 'standard_5');
      const dom32 = parseCronExpression('0 0 32 * *', 'standard_5');
      expect(dom0.fieldErrors.some((e) => e.field === 'daysOfMonth')).toBe(true);
      expect(dom32.fieldErrors.some((e) => e.field === 'daysOfMonth')).toBe(true);

      const mon13 = parseCronExpression('0 0 * 13 *', 'standard_5');
      expect(mon13.fieldErrors.some((e) => e.field === 'months')).toBe(true);

      const dow8 = parseCronExpression('0 0 * * 8', 'standard_5');
      expect(dow8.fieldErrors.some((e) => e.field === 'daysOfWeek')).toBe(true);

      expect(parseCronExpression('*/0 * * * *', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('*/-2 * * * *', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('10-5 * * * *', 'standard_5').valid).toBe(false);
      expect(parseCronExpression('1,,2 * * * *', 'standard_5').valid).toBe(false);
    });
  });

  describe('6. Bilingual Natural-Language Explainer (EN & ES)', () => {
    it('produces idiomatic English and Spanish descriptions for common and complex schedules', () => {
      const weekdays9 = parseCronExpression('30 2 * * 1-5', 'standard_5').ast!;
      const enWeekdays = describeCronExpression(weekdays9, 'en');
      const esWeekdays = describeCronExpression(weekdays9, 'es');
      expect(enWeekdays).toMatch(/02:30/i);
      expect(enWeekdays).toMatch(/Monday.*Friday|weekdays/i);
      expect(esWeekdays).toMatch(/02:30/i);
      expect(esWeekdays).toMatch(/lunes.*viernes|laborables/i);

      const interval6 = parseCronExpression('*/10 */5 9-17 * * *', 'extended_6').ast!;
      expect(describeCronExpression(interval6, 'en')).toMatch(/every 10 seconds/i);
      expect(describeCronExpression(interval6, 'es')).toMatch(/cada 10 segundos/i);

      const union = parseCronExpression('0 9 15 * MON', 'standard_5').ast!;
      expect(describeCronExpression(union, 'en')).toMatch(/or/i);
      expect(describeCronExpression(union, 'es')).toMatch(/o/i);
    });
  });
});

describe('Cron Expression Studio Engine — Seam 1B (Simulator, DST, Snippets & Exports)', () => {
  describe('7. Weekend-Skipping Weekday 15-Minute Schedule', () => {
    it('runs every 15 min on Friday 16:45..17:45 and skips Sat/Sun cleanly to Monday 09:00Z', () => {
      const res = evaluateCronSchedule({
        expression: '*/15 9-17 * * MON-FRI',
        format: 'standard_5',
        timezone: 'UTC',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_FRIDAY_UTC_MS,
      });

      expect(res.valid).toBe(true);
      expect(res.impossibleDateWarning).toBe(false);
      expect(res.runs.slice(0, 6).map((r) => r.isoUtc)).toEqual([
        '2026-01-02T16:45:00.000Z',
        '2026-01-02T17:00:00.000Z',
        '2026-01-02T17:15:00.000Z',
        '2026-01-02T17:30:00.000Z',
        '2026-01-02T17:45:00.000Z',
        '2026-01-05T09:00:00.000Z',
      ]);
    });
  });

  describe('8. Leap-Year Jump Forward', () => {
    it('jumps accurately across non-leap years to 2028-02-29 and 2032-02-29', () => {
      const res = evaluateCronSchedule({
        expression: '0 0 29 2 *',
        format: 'standard_5',
        timezone: 'UTC',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_2026_START_UTC_MS,
      });

      expect(res.valid).toBe(true);
      expect(res.impossibleDateWarning).toBe(false);
      expect(res.runs[0]?.isoUtc).toBe('2028-02-29T00:00:00.000Z');
      expect(res.runs[1]?.isoUtc).toBe('2032-02-29T00:00:00.000Z');
    });
  });

  describe('9. Impossible Calendar Dates & Bounded Execution', () => {
    it('terminates in < 50ms for Feb 31 and Apr 31 with impossibleDateWarning: true and runs: []', () => {
      for (const expr of ['0 0 31 2 *', '0 0 31 4 *']) {
        const started = performance.now();
        const res = evaluateCronSchedule({
          expression: expr,
          format: 'standard_5',
          timezone: 'UTC',
          simulationCount: 10,
          locale: 'en',
          referenceDateMs: ANCHOR_2026_START_UTC_MS,
        });
        const elapsedMs = performance.now() - started;

        expect(elapsedMs).toBeLessThan(50);
        expect(res.valid).toBe(true);
        expect(res.impossibleDateWarning).toBe(true);
        expect(res.runs).toEqual([]);
      }
    });
  });

  describe('10. Sunday 7 Equivalence & POSIX DOM/DOW Union Execution', () => {
    it('matches identical runs for Sunday 7 vs 0 and executes union OR dates for DOM+DOW', () => {
      const sun7 = evaluateCronSchedule({
        expression: '0 12 * * 7',
        format: 'standard_5',
        timezone: 'UTC',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_2026_START_UTC_MS,
      });
      const sun0 = evaluateCronSchedule({
        expression: '0 12 * * 0',
        format: 'standard_5',
        timezone: 'UTC',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_2026_START_UTC_MS,
      });
      expect(sun7.runs.map((r) => r.epochMs)).toEqual(
        sun0.runs.map((r) => r.epochMs)
      );

      // Jan 2026: Mondays are Jan 5, 12, 19, 26; 15th is Thu Jan 15 -> OR includes Jan 15!
      const union = evaluateCronSchedule({
        expression: '0 9 15 * MON',
        format: 'standard_5',
        timezone: 'UTC',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_2026_START_UTC_MS,
      });
      expect(union.runs.slice(0, 4).map((r) => r.isoUtc)).toEqual([
        '2026-01-05T09:00:00.000Z',
        '2026-01-12T09:00:00.000Z',
        '2026-01-15T09:00:00.000Z',
        '2026-01-19T09:00:00.000Z',
      ]);
    });
  });

  describe('11. IANA Timezone DST Transitions & Invalid Timezone Guard', () => {
    it('flags DST spring-forward gap and fall-back repeated hour and rejects unknown IANA timezones', () => {
      const spring = evaluateCronSchedule({
        expression: '30 2 8 3 *',
        format: 'standard_5',
        timezone: 'America/New_York',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_US_SPRING_DST_MS,
      });
      expect(spring.valid).toBe(true);
      expect(spring.runs[0]?.dstWarning).toBe(true);

      const fall = evaluateCronSchedule({
        expression: '30 1 1 11 *',
        format: 'standard_5',
        timezone: 'America/New_York',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_US_FALL_DST_MS,
      });
      expect(fall.valid).toBe(true);
      expect(fall.runs[0]?.dstWarning).toBe(true);

      const badTz = evaluateCronSchedule({
        expression: '0 * * * *',
        format: 'standard_5',
        timezone: 'Mars/Olympus',
        simulationCount: 10,
        locale: 'en',
        referenceDateMs: ANCHOR_2026_START_UTC_MS,
      });
      expect(badTz.valid).toBe(false);
      expect(badTz.fieldErrors.some((e) => e.field === 'timezone')).toBe(true);
    });
  });

  describe('12. 6-Field Seconds, Nickname Runs, DevOps Snippets, Exports & Privacy Audit', () => {
    it('simulates 6-field intervals, nicknames, snippets, CSV/JSON exports, and makes zero network or storage calls', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

      try {
        const ext6 = evaluateCronSchedule({
          expression: '*/30 * * * * *',
          format: 'extended_6',
          timezone: 'Europe/Madrid',
          simulationCount: 10,
          locale: 'es',
          referenceDateMs: ANCHOR_2026_START_UTC_MS,
        });
        expect(ext6.valid).toBe(true);
        expect(ext6.runs[0]?.epochMs).toBe(ANCHOR_2026_START_UTC_MS + 30_000);
        expect(ext6.runs[1]?.epochMs).toBe(ANCHOR_2026_START_UTC_MS + 60_000);
        expect(ext6.snippets.kubernetes).toContain('timeZone: "Europe/Madrid"');
        expect(ext6.snippets.nodeCron).toContain('*/30 * * * * *');
        expect(ext6.snippets.githubActions).toContain('cron:');
        // 5-field-only snippets strip the seconds field cleanly
        expect(ext6.snippets.githubActions).toContain("'* * * * *'");

        const dailyRes = evaluateCronSchedule({
          expression: '@daily',
          format: 'standard_5',
          timezone: 'UTC',
          simulationCount: 10,
          locale: 'en',
          referenceDateMs: ANCHOR_2026_START_UTC_MS,
        });
        expect(dailyRes.runs[0]?.isoUtc).toBe('2026-01-02T00:00:00.000Z');

        const csv = exportRunsToCsv(dailyRes);
        expect(csv).toContain('index,iso_utc,target_timezone,relative_delta');
        expect(csv).toContain('2026-01-02T00:00:00.000Z');

        const parsedJson = JSON.parse(exportRunsToJson(dailyRes));
        expect(parsedJson.runs).toHaveLength(10);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(storageSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        storageSpy.mockRestore();
      }
    });
  });
});
