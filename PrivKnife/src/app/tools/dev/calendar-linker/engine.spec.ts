import { describe, expect, it } from 'vitest';
import {
  exportIcsBlob,
  formatUtcDateTime,
  generateCalendarUrls,
  generateHtmlEmbed,
  generateIcsFile,
  generateMarkdownEmbed,
} from './engine';
import {
  DEFAULT_CALENDAR_EVENT,
  SAMPLE_ALLDAY_EVENT,
  SAMPLE_RECURRING_EVENT,
} from './test-fixtures';

describe('Calendar Linker Engine (Seam 1: RFC 5545 Builder, Providers & Embeds)', () => {
  describe('formatUtcDateTime', () => {
    it('should format datetime string to standard compact UTC format', () => {
      const utcStr = formatUtcDateTime('2026-10-15T10:00:00Z');
      expect(utcStr).toMatch(/^\d{8}T\d{6}Z$/);
      expect(utcStr).toBe('20261015T100000Z');
    });

    it('should format all-day date to 8-digit date string (YYYYMMDD)', () => {
      const allDayStr = formatUtcDateTime('2026-11-01', true);
      expect(allDayStr).toBe('20261101');
    });
  });

  describe('generateIcsFile', () => {
    it('should generate valid RFC 5545 VCALENDAR structure for standard event', () => {
      const ics = generateIcsFile(DEFAULT_CALENDAR_EVENT);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//PrivKnife//Universal Event Calendar Linker//EN');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Privacy-First Architecture Webinar');
      expect(ics).toContain('LOCATION:https://meet.privknife.dev/room-42');
      expect(ics).toContain('DTSTART:');
      expect(ics).toContain('DTEND:');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should escape newlines, semicolons, and commas in descriptions', () => {
      const eventWithSpecialChars = {
        ...DEFAULT_CALENDAR_EVENT,
        description: 'First line,\nSecond line; with semicolon.',
      };
      const ics = generateIcsFile(eventWithSpecialChars);

      expect(ics).toContain('First line\\,\\nSecond line\\; with semicolon.');
    });

    it('should include RRULE when recurrence is specified', () => {
      const ics = generateIcsFile(SAMPLE_RECURRING_EVENT);

      expect(ics).toContain('RRULE:FREQ=WEEKLY;COUNT=12');
    });

    it('should support VALUE=DATE for all-day events', () => {
      const ics = generateIcsFile(SAMPLE_ALLDAY_EVENT);

      expect(ics).toContain('DTSTART;VALUE=DATE:20261101');
      expect(ics).toContain('DTEND;VALUE=DATE:20261102');
    });
  });

  describe('generateCalendarUrls', () => {
    it('should generate valid Google Calendar template URL with encoded query parameters', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);

      expect(urls.google).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(urls.google).toContain('text=Privacy-First%20Architecture%20Webinar');
      expect(urls.google).toContain('location=https%3A%2F%2Fmeet.privknife.dev%2Froom-42');
      expect(urls.google).toContain('dates=');
    });

    it('should generate valid Outlook Live and Office 365 compose deeplinks', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);

      expect(urls.outlook).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
      expect(urls.outlook).toContain('subject=Privacy-First%20Architecture%20Webinar');

      expect(urls.office365).toContain('https://outlook.office.com/calendar/0/deeplink/compose');
      expect(urls.office365).toContain('subject=Privacy-First%20Architecture%20Webinar');
    });

    it('should generate valid Yahoo Calendar URL', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);

      expect(urls.yahoo).toContain('https://calendar.yahoo.com/?v=60');
      expect(urls.yahoo).toContain('title=Privacy-First%20Architecture%20Webinar');
    });

    it('should sanitize filename for ICS file download', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);

      expect(urls.icsDownloadFilename).toBe('privacy-first-architecture-webinar.ics');
    });
  });

  describe('generateHtmlEmbed & generateMarkdownEmbed', () => {
    it('should generate inline-styled HTML table for email clients containing all provider links', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);
      const html = generateHtmlEmbed(DEFAULT_CALENDAR_EVENT, urls);

      expect(html).toContain('<table');
      expect(html).toContain('Privacy-First Architecture Webinar');
      expect(html).toContain(urls.google);
      expect(html).toContain(urls.outlook);
      expect(html).toContain(urls.yahoo);
      expect(html).toContain('Add to Calendar');
    });

    it('should generate Markdown links for newsletters and readmes', () => {
      const urls = generateCalendarUrls(DEFAULT_CALENDAR_EVENT);
      const md = generateMarkdownEmbed(DEFAULT_CALENDAR_EVENT, urls);

      expect(md).toContain('[Add to Google Calendar](');
      expect(md).toContain('[Add to Outlook](');
      expect(md).toContain('[Add to Yahoo Calendar](');
    });
  });

  describe('exportIcsBlob', () => {
    it('should export ICS content as text/calendar Blob', () => {
      const ics = generateIcsFile(DEFAULT_CALENDAR_EVENT);
      const blob = exportIcsBlob(ics);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toContain('text/calendar');
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
