import { describe, expect, it } from 'vitest';
import { parseMetadata, stripMetadata } from './engine';
import {
  createMockCorruptedFile,
  createMockJpegClean,
  createMockJpegWithExif,
  createMockPngClean,
  createMockPngWithMetadata,
} from './test-fixtures';

describe('ExifEngine (Seam 1: Pure Binary Processing)', () => {
  describe('JPEG Metadata Processing', () => {
    it('should parse metadata from a JPEG containing APP1 EXIF segment', () => {
      const mockJpeg = createMockJpegWithExif();
      const metadata = parseMetadata(mockJpeg, 'sample.jpg');

      expect(metadata.format).toBe('jpeg');
      expect(metadata.hasMetadata).toBe(true);
      expect(metadata.tagCount).toBeGreaterThanOrEqual(3);

      const makeTag = metadata.tags.find((t) => t.name === 'Make');
      expect(makeTag).toBeDefined();
      expect(makeTag?.value).toBe('PrivKnife');

      const modelTag = metadata.tags.find((t) => t.name === 'Model');
      expect(modelTag).toBeDefined();
      expect(modelTag?.value).toBe('PK-100');

      const dateTag = metadata.tags.find((t) => t.name === 'DateTime');
      expect(dateTag).toBeDefined();
      expect(dateTag?.value).toBe('2026:10:10 12:00:00');
      expect(dateTag?.isSensitive).toBe(true);
    });

    it('should return hasMetadata: false when parsing a clean JPEG', () => {
      const cleanJpeg = createMockJpegClean();
      const metadata = parseMetadata(cleanJpeg, 'clean.jpg');

      expect(metadata.format).toBe('jpeg');
      expect(metadata.hasMetadata).toBe(false);
      expect(metadata.tagCount).toBe(0);
      expect(metadata.tags).toHaveLength(0);
    });

    it('should strip APP1 EXIF segment from JPEG and produce a clean valid JPEG', () => {
      const mockJpeg = createMockJpegWithExif();
      const result = stripMetadata(mockJpeg, 'sample.jpg');

      expect(result.originalSize).toBe(mockJpeg.length);
      expect(result.cleanedSize).toBeLessThan(result.originalSize);
      expect(result.tagsRemovedCount).toBeGreaterThanOrEqual(3);

      // Verify JPEG framing signatures
      expect(result.cleanedBuffer[0]).toBe(0xff);
      expect(result.cleanedBuffer[1]).toBe(0xd8); // SOI
      const len = result.cleanedBuffer.length;
      expect(result.cleanedBuffer[len - 2]).toBe(0xff);
      expect(result.cleanedBuffer[len - 1]).toBe(0xd9); // EOI

      // Verify that inspecting the stripped buffer returns 0 metadata tags
      const verification = parseMetadata(result.cleanedBuffer, 'sample.jpg');
      expect(verification.hasMetadata).toBe(false);
      expect(verification.tagCount).toBe(0);
      expect(verification.tags).toHaveLength(0);
    });
  });

  describe('PNG Metadata Processing', () => {
    it('should parse metadata from a PNG containing tEXt chunks', () => {
      const mockPng = createMockPngWithMetadata();
      const metadata = parseMetadata(mockPng, 'sample.png');

      expect(metadata.format).toBe('png');
      expect(metadata.hasMetadata).toBe(true);
      expect(metadata.tagCount).toBe(2);

      const authorTag = metadata.tags.find((t) => t.name === 'Author');
      expect(authorTag).toBeDefined();
      expect(authorTag?.value).toBe('PrivKnife User');
    });

    it('should return hasMetadata: false when parsing a clean PNG', () => {
      const cleanPng = createMockPngClean();
      const metadata = parseMetadata(cleanPng, 'clean.png');

      expect(metadata.format).toBe('png');
      expect(metadata.hasMetadata).toBe(false);
      expect(metadata.tagCount).toBe(0);
    });

    it('should strip metadata chunks from PNG while preserving valid PNG structure', () => {
      const mockPng = createMockPngWithMetadata();
      const result = stripMetadata(mockPng, 'sample.png');

      expect(result.cleanedSize).toBeLessThan(result.originalSize);
      expect(result.tagsRemovedCount).toBe(2);

      // Verify PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(result.cleanedBuffer.slice(0, 8)).toEqual(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );

      // Verify cleaned PNG has 0 metadata tags
      const verification = parseMetadata(result.cleanedBuffer, 'sample.png');
      expect(verification.hasMetadata).toBe(false);
      expect(verification.tagCount).toBe(0);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('should throw an error for corrupted or unrecognized file buffers', () => {
      const corrupt = createMockCorruptedFile();
      expect(() => parseMetadata(corrupt, 'corrupt.bin')).toThrowError();
      expect(() => stripMetadata(corrupt, 'corrupt.bin')).toThrowError();
    });

    it('should throw an error for empty buffers', () => {
      const empty = new Uint8Array(0);
      expect(() => parseMetadata(empty, 'empty.jpg')).toThrowError();
      expect(() => stripMetadata(empty, 'empty.jpg')).toThrowError();
    });
  });
});
