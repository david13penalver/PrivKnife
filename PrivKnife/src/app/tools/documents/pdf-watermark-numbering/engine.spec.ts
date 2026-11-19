import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  applyWatermarkAndNumbering,
  buildStampedFileName,
  computeAnchorPosition,
  computeTiledPositions,
  formatStampLabel,
  mirrorAnchorForFacingPage,
  parseHexColor,
  parsePageRange,
  sanitizeWinAnsiText,
  validateOptions,
} from './engine';
import {
  createCorruptPdfBytes,
  createFakeEncryptedPdfBytes,
  createInvalidImageBytes,
  createSyntheticPdf,
  DEFAULT_WATERMARK_OPTIONS,
  MINIMAL_VALID_JPEG,
  MINIMAL_VALID_PNG,
} from './test-fixtures';

describe('PDF Watermark, Page Numbers & Bates Stamper Engine (Seam 1)', () => {
  describe('Slice 1: Range Parser, WinAnsi Sanitizer, Hex Color & Label Formatter', () => {
    it('parses all, odd, even, and complex comma/end page ranges sorted and deduplicated', () => {
      expect(parsePageRange('all', 4)).toEqual({ valid: true, pages: [1, 2, 3, 4] });
      expect(parsePageRange('  ', 3)).toEqual({ valid: true, pages: [1, 2, 3] });
      expect(parsePageRange('odd', 5)).toEqual({ valid: true, pages: [1, 3, 5] });
      expect(parsePageRange('even', 1)).toEqual({ valid: true, pages: [] });
      expect(parsePageRange('even', 5)).toEqual({ valid: true, pages: [2, 4] });
      expect(parsePageRange('1-3, 5, 4-end, 2', 6)).toEqual({
        valid: true,
        pages: [1, 2, 3, 4, 5, 6],
      });
    });

    it('rejects reversed ranges, out-of-bounds, zero/negative pages, and malformed syntax', () => {
      expect(parsePageRange('5-2', 6).valid).toBe(false);
      expect(parsePageRange('0', 5).valid).toBe(false);
      expect(parsePageRange('-1', 5).valid).toBe(false);
      expect(parsePageRange('7', 5).valid).toBe(false);
      expect(parsePageRange('1-end', 0).valid).toBe(false);
      expect(parsePageRange('abc', 5).valid).toBe(false);
      expect(parsePageRange('1--3', 5).valid).toBe(false);
      expect(parsePageRange('1-2-3', 5).valid).toBe(false);
      expect(parsePageRange('1,', 5).valid).toBe(false);
    });

    it('maps smart punctuation, preserves Latin-1 accents, and replaces unsupported Unicode glyphs', () => {
      const latin = sanitizeWinAnsiText('Confidencial — “Año 2026” ñáéíóú €');
      expect(latin.text).toBe('Confidencial - "Año 2026" ñáéíóú €');
      expect(latin.replacedCount).toBe(0);

      const emoji = sanitizeWinAnsiText('DRAFT 🚀 秘密 ✓');
      expect(emoji.replacedCount).toBeGreaterThanOrEqual(4);
      expect(emoji.text).not.toContain('🚀');
      expect(emoji.text).not.toContain('秘');
    });

    it('parses 3-digit and 6-digit hex colors and rejects invalid hex strings', () => {
      const red = parseHexColor('#DC2626');
      expect(red).not.toBeNull();
      expect(red!.r).toBeCloseTo(220 / 255, 3);
      expect(red!.g).toBeCloseTo(38 / 255, 3);
      expect(red!.b).toBeCloseTo(38 / 255, 3);

      const shortBlue = parseHexColor('03F');
      expect(shortBlue).not.toBeNull();
      expect(shortBlue!.b).toBeCloseTo(1, 3);

      expect(parseHexColor('#GGGGGG')).toBeNull();
      expect(parseHexColor('#12345')).toBeNull();
      expect(parseHexColor('')).toBeNull();
    });

    it('formats page numbers and zero-padded Bates identifiers without truncating overflows', () => {
      expect(formatStampLabel('Page {n} of {total}', 0, 1, 12)).toBe('Page 1 of 12');
      expect(formatStampLabel('EXH-{bates:5}', 1, 42, 10)).toBe('EXH-00043');
      expect(formatStampLabel('CASE-{bates}', 0, 7, 10)).toBe('CASE-000007');
      expect(formatStampLabel('ID-{bates:4}', 0, 123456, 10)).toBe('ID-123456');
      expect(formatStampLabel('Clamp-{bates:99}', 0, 5, 10)).toBe('Clamp-000000000005');
    });
  });

  describe('Slice 2: Geometry, Facing-Page Mirroring, Center-Rotation & Tiling', () => {
    it('mirrors left and right anchors on even pages only when facing-pages is enabled', () => {
      expect(mirrorAnchorForFacingPage('bottom-right', 1, true)).toBe('bottom-right');
      expect(mirrorAnchorForFacingPage('bottom-right', 2, true)).toBe('bottom-left');
      expect(mirrorAnchorForFacingPage('bottom-left', 4, true)).toBe('bottom-right');
      expect(mirrorAnchorForFacingPage('top-center', 2, true)).toBe('top-center');
      expect(mirrorAnchorForFacingPage('bottom-right', 2, false)).toBe('bottom-right');
    });

    it('computes rotation-compensated center coordinates honoring non-zero CropBox origins', () => {
      const cropBox = { x: 40, y: 60, width: 500, height: 700 };

      // 0 deg centered: origin should be center - half dimensions
      const unrotated = computeAnchorPosition(cropBox, 'center', 24, 100, 40, 0);
      expect(unrotated.centerX).toBeCloseTo(290, 2);
      expect(unrotated.centerY).toBeCloseTo(410, 2);
      expect(unrotated.x).toBeCloseTo(240, 2);
      expect(unrotated.y).toBeCloseTo(390, 2);

      // 180 deg centered: origin should flip symmetrically around center
      const flipped = computeAnchorPosition(cropBox, 'center', 24, 100, 40, 180);
      expect(flipped.centerX).toBeCloseTo(290, 2);
      expect(flipped.centerY).toBeCloseTo(410, 2);
      expect(flipped.x).toBeCloseTo(340, 2);
      expect(flipped.y).toBeCloseTo(430, 2);

      // bottom-left with 20pt margin on shifted CropBox
      const bottomLeft = computeAnchorPosition(cropBox, 'bottom-left', 20, 80, 12, 0);
      expect(bottomLeft.x).toBeCloseTo(60, 2);
      expect(bottomLeft.y).toBeCloseTo(80, 2);
    });

    it('generates tiled watermark grids covering the CropBox while capping extreme tile counts', () => {
      const cropBox = { x: 0, y: 0, width: 600, height: 800 };
      const normalTiles = computeTiledPositions(cropBox, 200);
      expect(normalTiles.length).toBeGreaterThanOrEqual(9);
      expect(normalTiles.length).toBeLessThanOrEqual(200);

      // Tiny gap on a huge poster page must still be bounded safely (<= 200)
      const hugeBox = { x: 0, y: 0, width: 5000, height: 5000 };
      const cappedTiles = computeTiledPositions(hugeBox, 5);
      expect(cappedTiles.length).toBeLessThanOrEqual(200);
      expect(cappedTiles.length).toBeGreaterThan(0);
    });
  });

  describe('Slice 3: End-to-End PDF Stamping & Edge Cases', () => {
    it('validates option boundaries and sanitizes output filenames', () => {
      expect(validateOptions(DEFAULT_WATERMARK_OPTIONS)).toBe(true);
      expect(
        validateOptions({
          ...DEFAULT_WATERMARK_OPTIONS,
          watermark: { ...DEFAULT_WATERMARK_OPTIONS.watermark, enabled: false },
          numbering: { ...DEFAULT_WATERMARK_OPTIONS.numbering, enabled: false },
        })
      ).toBe(false);
      expect(
        validateOptions({
          ...DEFAULT_WATERMARK_OPTIONS,
          watermark: { ...DEFAULT_WATERMARK_OPTIONS.watermark, opacity: 0.01 },
        })
      ).toBe(false);
      expect(
        validateOptions({
          ...DEFAULT_WATERMARK_OPTIONS,
          watermark: { ...DEFAULT_WATERMARK_OPTIONS.watermark, colorHex: 'NOTHEX' },
        })
      ).toBe(false);
      expect(
        validateOptions({
          ...DEFAULT_WATERMARK_OPTIONS,
          watermark: { ...DEFAULT_WATERMARK_OPTIONS.watermark, kind: 'image', imageBytes: undefined },
        })
      ).toBe(false);
      expect(
        validateOptions({
          ...DEFAULT_WATERMARK_OPTIONS,
          numbering: { ...DEFAULT_WATERMARK_OPTIONS.numbering, skipFirstPages: -1 },
        })
      ).toBe(false);

      expect(buildStampedFileName('../../contracts/NDA 2026.PDF')).toBe('NDA 2026-stamped.pdf');
      expect(buildStampedFileName('  ')).toBe('document-stamped.pdf');
    });

    it('rejects empty, corrupt, encrypted PDFs and out-of-bounds page ranges cleanly', async () => {
      const emptyRes = await applyWatermarkAndNumbering(
        new Uint8Array(0),
        'empty.pdf',
        DEFAULT_WATERMARK_OPTIONS
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('INVALID_INPUT');

      const corruptRes = await applyWatermarkAndNumbering(
        createCorruptPdfBytes(),
        'broken.pdf',
        DEFAULT_WATERMARK_OPTIONS
      );
      expect(corruptRes.success).toBe(false);
      expect(corruptRes.errorCode).toBe('CORRUPT_PDF');

      const encRes = await applyWatermarkAndNumbering(
        await createFakeEncryptedPdfBytes(),
        'locked.pdf',
        DEFAULT_WATERMARK_OPTIONS
      );
      expect(encRes.success).toBe(false);
      expect(encRes.errorCode).toBe('ENCRYPTED_PDF');

      const validPdf = await createSyntheticPdf(3);
      const badRangeRes = await applyWatermarkAndNumbering(
        validPdf,
        'valid.pdf',
        { ...DEFAULT_WATERMARK_OPTIONS, pageRange: '1-5' }
      );
      expect(badRangeRes.success).toBe(false);
      expect(badRangeRes.errorCode).toBe('INVALID_RANGE');
    });

    it('applies tiled watermark + Bates numbering with skipFirstPages, backdrop, and facing-page mirroring', async () => {
      const pdfBytes = await createSyntheticPdf(4);
      const progressValues: number[] = [];

      const res = await applyWatermarkAndNumbering(
        pdfBytes,
        'exhibit.pdf',
        {
          pageRange: 'all',
          watermark: {
            ...DEFAULT_WATERMARK_OPTIONS.watermark,
            layout: 'tiled',
            tileGapPt: 160,
          },
          numbering: {
            ...DEFAULT_WATERMARK_OPTIONS.numbering,
            mode: 'bates',
            template: 'EXH-{bates:5}',
            startNumber: 42,
            skipFirstPages: 1,
            mirrorFacingPages: true,
            opaqueBackdrop: true,
          },
        },
        { onProgress: (pct) => progressValues.push(pct) }
      );

      expect(res.success).toBe(true);
      expect(res.fileName).toBe('exhibit-stamped.pdf');
      expect(res.totalPages).toBe(4);
      expect(res.pagesStamped).toBe(4);
      expect(res.blob).toBeInstanceOf(Blob);
      expect(progressValues[progressValues.length - 1]).toBe(100);

      const reloaded = await PDFDocument.load(res.bytes!);
      expect(reloaded.getPageCount()).toBe(4);
    });

    it('handles skipFirstPages >= totalPages in numbering-only mode cleanly', async () => {
      const pdfBytes = await createSyntheticPdf(2);
      const res = await applyWatermarkAndNumbering(pdfBytes, 'cover.pdf', {
        pageRange: 'all',
        watermark: { ...DEFAULT_WATERMARK_OPTIONS.watermark, enabled: false },
        numbering: { ...DEFAULT_WATERMARK_OPTIONS.numbering, skipFirstPages: 5 },
      });

      expect(res.success).toBe(true);
      expect(res.pagesStamped).toBe(0);
      expect(res.totalPages).toBe(2);
    });

    it('sanitizes non-WinAnsi glyphs in watermark and handles rotated 90° + shifted CropBox PDFs', async () => {
      const rotatedPdf = await createSyntheticPdf(2, { rotationDeg: 90, cropBoxInset: 30 });
      const res = await applyWatermarkAndNumbering(rotatedPdf, 'scan.pdf', {
        ...DEFAULT_WATERMARK_OPTIONS,
        watermark: {
          ...DEFAULT_WATERMARK_OPTIONS.watermark,
          text: 'CONFIDENTIAL 🚀',
          fontFamily: 'courier',
        },
      });

      expect(res.success).toBe(true);
      expect(res.winAnsiSubstitutions).toBeGreaterThanOrEqual(1);
      const reloaded = await PDFDocument.load(res.bytes!);
      expect(reloaded.getPageCount()).toBe(2);
    });

    it('stamps watermarks under existing content in underlay mode preserving page count', async () => {
      const pdfBytes = await createSyntheticPdf(2);
      const res = await applyWatermarkAndNumbering(pdfBytes, 'underlay.pdf', {
        ...DEFAULT_WATERMARK_OPTIONS,
        watermark: {
          ...DEFAULT_WATERMARK_OPTIONS.watermark,
          layer: 'under',
          fontFamily: 'times',
        },
      });

      expect(res.success).toBe(true);
      expect(res.pagesStamped).toBe(2);
      const reloaded = await PDFDocument.load(res.bytes!);
      expect(reloaded.getPageCount()).toBe(2);
    });

    it('embeds valid PNG/JPEG image watermarks and rejects corrupt image bytes with INVALID_IMAGE', async () => {
      const pdfBytes = await createSyntheticPdf(1);

      const pngRes = await applyWatermarkAndNumbering(pdfBytes, 'logo.pdf', {
        ...DEFAULT_WATERMARK_OPTIONS,
        watermark: {
          ...DEFAULT_WATERMARK_OPTIONS.watermark,
          kind: 'image',
          imageBytes: MINIMAL_VALID_PNG,
          imageMimeType: 'image/png',
          layout: 'single',
        },
      });
      expect(pngRes.success).toBe(true);

      const jpgRes = await applyWatermarkAndNumbering(pdfBytes, 'logo-jpg.pdf', {
        ...DEFAULT_WATERMARK_OPTIONS,
        watermark: {
          ...DEFAULT_WATERMARK_OPTIONS.watermark,
          kind: 'image',
          imageBytes: MINIMAL_VALID_JPEG,
          imageMimeType: 'image/jpeg',
          layout: 'tiled',
        },
      });
      expect(jpgRes.success).toBe(true);

      const badImgRes = await applyWatermarkAndNumbering(pdfBytes, 'bad-logo.pdf', {
        ...DEFAULT_WATERMARK_OPTIONS,
        watermark: {
          ...DEFAULT_WATERMARK_OPTIONS.watermark,
          kind: 'image',
          imageBytes: createInvalidImageBytes(),
          imageMimeType: 'image/png',
        },
      });
      expect(badImgRes.success).toBe(false);
      expect(badImgRes.errorCode).toBe('INVALID_IMAGE');
    });
  });
});
