import { describe, expect, it } from 'vitest';
import {
  applyTimeShift,
  exportSubtitleBlob,
  formatTimestamp,
  parseSubtitles,
  parseTimestamp,
  serializeSubtitles,
} from './engine';
import { SAMPLE_CUES, SAMPLE_SRT, SAMPLE_VTT } from './test-fixtures';

describe('Subtitles Shifter Engine (Seam 1: Parsing, Time Shifting & Serialization)', () => {
  describe('parseTimestamp & formatTimestamp', () => {
    it('should parse SRT comma timestamp to milliseconds', () => {
      const ms = parseTimestamp('01:02:03,456');
      expect(ms).toBe(3723456);
    });

    it('should parse WebVTT dot timestamp to milliseconds', () => {
      const ms = parseTimestamp('00:01:23.456');
      expect(ms).toBe(83456);
    });

    it('should parse short WebVTT timestamp (MM:SS.mmm)', () => {
      const ms = parseTimestamp('02:15.500');
      expect(ms).toBe(135500);
    });

    it('should format milliseconds to SRT comma format', () => {
      const srtTime = formatTimestamp(3723456, 'srt');
      expect(srtTime).toBe('01:02:03,456');
    });

    it('should format milliseconds to WebVTT dot format', () => {
      const vttTime = formatTimestamp(83456, 'vtt');
      expect(vttTime).toBe('00:01:23.456');
    });

    it('should clamp negative milliseconds to 00:00:00', () => {
      expect(formatTimestamp(-500, 'srt')).toBe('00:00:00,000');
      expect(formatTimestamp(-1200, 'vtt')).toBe('00:00:00.000');
    });
  });

  describe('parseSubtitles', () => {
    it('should parse standard SRT content accurately', () => {
      const parsed = parseSubtitles(SAMPLE_SRT);
      expect(parsed.format).toBe('srt');
      expect(parsed.cues.length).toBe(3);
      expect(parsed.cues[0].startMs).toBe(1000);
      expect(parsed.cues[0].endMs).toBe(4250);
      expect(parsed.cues[0].text).toContain('Welcome to PrivKnife!');
      expect(parsed.cues[1].text).toBe('No servers. No data tracking.');
    });

    it('should parse standard WebVTT content with WEBVTT header', () => {
      const parsed = parseSubtitles(SAMPLE_VTT);
      expect(parsed.format).toBe('vtt');
      expect(parsed.cues.length).toBe(3);
      expect(parsed.cues[0].startMs).toBe(1000);
      expect(parsed.cues[0].endMs).toBe(4250);
      expect(parsed.cues[2].startMs).toBe(72500);
    });

    it('should handle Windows CRLF line endings cleanly', () => {
      const crlfSrt = SAMPLE_SRT.replace(/\n/g, '\r\n');
      const parsed = parseSubtitles(crlfSrt);
      expect(parsed.cues.length).toBe(3);
      expect(parsed.cues[0].startMs).toBe(1000);
    });
  });

  describe('applyTimeShift', () => {
    it('should shift cues forward by positive millisecond offset', () => {
      const shifted = applyTimeShift(SAMPLE_CUES, { offsetMs: 2500 });
      expect(shifted[0].startMs).toBe(3500);
      expect(shifted[0].endMs).toBe(6750);
      expect(shifted[1].startMs).toBe(7500);
    });

    it('should shift cues backward and clamp lower bound to 0ms', () => {
      const shifted = applyTimeShift(SAMPLE_CUES, { offsetMs: -2000 });
      expect(shifted[0].startMs).toBe(0); // clamped from -1000 to 0
      expect(shifted[0].endMs).toBe(2250);
      expect(shifted[1].startMs).toBe(3000);
    });

    it('should apply FPS scale conversion (fromFps to toFps)', () => {
      // 25 fps to 23.976 fps: scale factor = 25 / 23.976 ≈ 1.042709
      const shifted = applyTimeShift(SAMPLE_CUES, {
        offsetMs: 0,
        fpsScale: { fromFps: 25, toFps: 23.976 },
      });
      const ratio = 25 / 23.976;
      expect(shifted[0].startMs).toBe(Math.round(1000 * ratio));
      expect(shifted[0].endMs).toBe(Math.round(4250 * ratio));
    });
  });

  describe('serializeSubtitles & exportSubtitleBlob', () => {
    it('should serialize cues into standard SRT string', () => {
      const srt = serializeSubtitles(SAMPLE_CUES, 'srt');
      expect(srt).toContain('1\n00:00:01,000 --> 00:00:04,250');
      expect(srt).toContain('Welcome to PrivKnife!');
      expect(srt).toContain('2\n00:00:05,000 --> 00:00:08,750');
    });

    it('should serialize cues into standard WebVTT string with header', () => {
      const vtt = serializeSubtitles(SAMPLE_CUES, 'vtt');
      expect(vtt.startsWith('WEBVTT')).toBe(true);
      expect(vtt).toContain('00:00:01.000 --> 00:00:04.250');
      expect(vtt).toContain('Welcome to PrivKnife!');
    });

    it('should export subtitle text as a valid Blob', () => {
      const blob = exportSubtitleBlob(SAMPLE_SRT, 'srt');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});
