import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  buildOutputFileName,
  computeBookletImposition,
  computeNupImposition,
  detectWhitespaceMarginsFromRgba,
  parsePageRange,
  processPdfCropperBooklet,
  ptToUnit,
  unitToPt,
  visualRectToPdfCropBox,
} from './engine';
import {
  createCorruptPdfBytes,
  createMixedSizePdf,
  createNonPdfBytes,
  createSyntheticPdf,
  createSyntheticRgbaImage,
  DEFAULT_CROPPER_OPTIONS,
} from './test-fixtures';

describe('PDF Cropper, Resizer & N-Up Booklet Engine (Seam 1)', () => {
  describe('Slice 1: Rotation Geometry, Units, Whitespace Scan, Ranges & Imposition Math', () => {
    it('maps visual crop insets across 0, 90, 180, 270 and non-standard rotations with non-zero box origins', () => {
      const box = { x: 10, y: 20, width: 600, height: 800 };
      const insets = { top: 40, right: 30, bottom: 20, left: 10 };

      expect(visualRectToPdfCropBox(insets, box, 0)).toEqual({
        x: 20,
        y: 40,
        width: 560,
        height: 740,
      });

      expect(visualRectToPdfCropBox(insets, box, 90)).toEqual({
        x: 50,
        y: 30,
        width: 540,
        height: 760,
      });

      expect(visualRectToPdfCropBox(insets, box, 180)).toEqual({
        x: 40,
        y: 60,
        width: 560,
        height: 740,
      });

      expect(visualRectToPdfCropBox(insets, box, 270)).toEqual({
        x: 30,
        y: 50,
        width: 540,
        height: 760,
      });

      // Normalizes negative & >=360 rotations (-90 === 270, 450 === 90)
      expect(visualRectToPdfCropBox(insets, box, -90)).toEqual(
        visualRectToPdfCropBox(insets, box, 270)
      );
      expect(visualRectToPdfCropBox(insets, box, 450)).toEqual(
        visualRectToPdfCropBox(insets, box, 90)
      );

      // Rejects negative, NaN, or over-cropped degenerate (< 10 pt remaining) insets
      expect(
        visualRectToPdfCropBox({ top: -1, right: 0, bottom: 0, left: 0 }, box, 0)
      ).toBeNull();
      expect(
        visualRectToPdfCropBox({ top: 0, right: Number.NaN, bottom: 0, left: 0 }, box, 0)
      ).toBeNull();
      expect(
        visualRectToPdfCropBox({ top: 0, right: 300, bottom: 0, left: 295 }, box, 0)
      ).toBeNull();
    });

    it('converts measurements accurately across pt, mm, and in', () => {
      expect(ptToUnit(72, 'pt')).toBeCloseTo(72, 4);
      expect(ptToUnit(72, 'in')).toBeCloseTo(1, 4);
      expect(unitToPt(1, 'in')).toBeCloseTo(72, 4);
      expect(unitToPt(25.4, 'mm')).toBeCloseTo(72, 4);
      expect(ptToUnit(unitToPt(12.5, 'mm'), 'mm')).toBeCloseTo(12.5, 4);
    });

    it('detects tight whitespace bounding box with padding and handles all-white / full-bleed images', () => {
      const scanned = createSyntheticRgbaImage(200, 300, {
        left: 40,
        top: 50,
        right: 159,
        bottom: 249,
      });
      const res = detectWhitespaceMarginsFromRgba(scanned.data, 200, 300, {
        paddingPt: 10,
        whiteThreshold: 245,
      });
      expect(res.isBlank).toBe(false);
      // top=50-10=40, left=40-10=30, right=(200-1-159)-10=30, bottom=(300-1-249)-10=40
      expect(res.insetsPt).toEqual({
        top: 40,
        right: 30,
        bottom: 40,
        left: 30,
      });

      const blank = createSyntheticRgbaImage(100, 100);
      expect(
        detectWhitespaceMarginsFromRgba(blank.data, 100, 100, {
          paddingPt: 8,
          whiteThreshold: 245,
        })
      ).toEqual({
        isBlank: true,
        insetsPt: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const fullBleed = createSyntheticRgbaImage(100, 100, {
        left: 0,
        top: 0,
        right: 99,
        bottom: 99,
      });
      expect(
        detectWhitespaceMarginsFromRgba(fullBleed.data, 100, 100, {
          paddingPt: 8,
          whiteThreshold: 245,
        })
      ).toEqual({
        isBlank: false,
        insetsPt: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    });

    it('parses page ranges safely and sanitizes output filenames across all modes', () => {
      expect(parsePageRange('1, 5-3, 2, 99, 3', 6)).toEqual([1, 2, 3, 4, 5]);
      expect(parsePageRange('all', 4)).toEqual([1, 2, 3, 4]);
      expect(parsePageRange('bad-text', 4)).toEqual([]);

      expect(buildOutputFileName('../../dir/Book.PDF', 'crop')).toBe('Book-cropped.pdf');
      expect(buildOutputFileName('slides.pdf', 'resize')).toBe('slides-resized.pdf');
      expect(buildOutputFileName('slides.pdf', 'nup')).toBe('slides-nup.pdf');
      expect(buildOutputFileName('zine.pdf', 'booklet')).toBe('zine-booklet.pdf');
      expect(buildOutputFileName('', 'booklet')).toBe('document-booklet.pdf');
    });

    it('computes saddle-stitch booklet imposition signatures for 6, 4, 1, 0, and RTL inputs', () => {
      expect(computeBookletImposition(6, 'ltr')).toEqual([
        { sheet: 1, side: 'front', pages: [null, 1] },
        { sheet: 1, side: 'back', pages: [2, null] },
        { sheet: 2, side: 'front', pages: [6, 3] },
        { sheet: 2, side: 'back', pages: [4, 5] },
      ]);

      expect(computeBookletImposition(4, 'ltr')).toEqual([
        { sheet: 1, side: 'front', pages: [4, 1] },
        { sheet: 1, side: 'back', pages: [2, 3] },
      ]);

      expect(computeBookletImposition(4, 'rtl')).toEqual([
        { sheet: 1, side: 'front', pages: [1, 4] },
        { sheet: 1, side: 'back', pages: [3, 2] },
      ]);

      expect(computeBookletImposition(1, 'ltr')).toEqual([
        { sheet: 1, side: 'front', pages: [null, 1] },
        { sheet: 1, side: 'back', pages: [null, null] },
      ]);

      expect(computeBookletImposition(0, 'ltr')).toEqual([]);
    });

    it('computes N-Up imposition grids for 2-up, 4-up, and 6-up including LTR and RTL orderings', () => {
      expect(computeNupImposition(5, 4, 'ltr')).toEqual([
        { sheet: 1, side: 'front', pages: [1, 2, 3, 4] },
        { sheet: 2, side: 'front', pages: [5, null, null, null] },
      ]);

      expect(computeNupImposition(3, 2, 'ltr')).toEqual([
        { sheet: 1, side: 'front', pages: [1, 2] },
        { sheet: 2, side: 'front', pages: [3, null] },
      ]);

      expect(computeNupImposition(7, 6, 'ltr')).toHaveLength(2);
      expect(computeNupImposition(3, 2, 'rtl')).toEqual([
        { sheet: 1, side: 'front', pages: [2, 1] },
        { sheet: 2, side: 'front', pages: [null, 3] },
      ]);
    });
  });

  describe('Slice 2: Real pdf-lib Crop, Resize, N-Up, Booklet & Defensive Guards', () => {
    it('crops rotated pages (0, 90, 180, 270), odd/even mirrored margins, and rejects degenerate insets', async () => {
      const srcBytes = await createSyntheticPdf(4, {
        width: 500,
        height: 700,
        rotations: [0, 90, 180, 270],
      });

      const res = await processPdfCropperBooklet(srcBytes, 'scan.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'crop',
        crop: {
          ...DEFAULT_CROPPER_OPTIONS.crop,
          insetsPt: { top: 40, right: 30, bottom: 20, left: 10 },
          scope: 'all',
        },
      });

      expect(res.success).toBe(true);
      expect(res.fileName).toBe('scan-cropped.pdf');
      expect(res.outputPageCount).toBe(4);
      expect(res.blob).toBeInstanceOf(Blob);

      const outDoc = await PDFDocument.load(res.bytes!);
      const p0 = outDoc.getPage(0).getCropBox();
      const p1 = outDoc.getPage(1).getCropBox();
      const p2 = outDoc.getPage(2).getCropBox();
      const p3 = outDoc.getPage(3).getCropBox();

      expect(p0).toEqual({ x: 10, y: 20, width: 460, height: 640 });
      expect(p1).toEqual({ x: 40, y: 10, width: 440, height: 660 });
      expect(p2).toEqual({ x: 30, y: 40, width: 460, height: 640 });
      expect(p3).toEqual({ x: 20, y: 30, width: 440, height: 660 });

      // Odd/Even mirrored swap
      const mirroredSrc = await createSyntheticPdf(2, { width: 500, height: 700 });
      const mirroredRes = await processPdfCropperBooklet(mirroredSrc, 'book.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'crop',
        crop: {
          ...DEFAULT_CROPPER_OPTIONS.crop,
          insetsPt: { top: 10, right: 20, bottom: 10, left: 60 },
          scope: 'odd_even_mirrored',
        },
      });
      expect(mirroredRes.success).toBe(true);
      const mDoc = await PDFDocument.load(mirroredRes.bytes!);
      expect(mDoc.getPage(0).getCropBox().x).toBe(60);
      expect(mDoc.getPage(1).getCropBox().x).toBe(20);

      // Range / current scope isolation
      const rangeRes = await processPdfCropperBooklet(mirroredSrc, 'book.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'crop',
        crop: {
          ...DEFAULT_CROPPER_OPTIONS.crop,
          insetsPt: { top: 50, right: 50, bottom: 50, left: 50 },
          scope: 'current',
          currentPage: 2,
        },
      });
      const rDoc = await PDFDocument.load(rangeRes.bytes!);
      expect(rDoc.getPage(0).getCropBox().width).toBe(500);
      expect(rDoc.getPage(1).getCropBox().width).toBe(400);

      // Rejects over-cropping left + right >= pageWidth
      const badCrop = await processPdfCropperBooklet(mirroredSrc, 'book.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'crop',
        crop: {
          ...DEFAULT_CROPPER_OPTIONS.crop,
          insetsPt: { top: 0, right: 250, bottom: 0, left: 250 },
          scope: 'all',
        },
      });
      expect(badCrop.success).toBe(false);
      expect(badCrop.errorCode).toBe('INVALID_INSETS');
    });

    it('uniformly resizes mixed-size PDFs and handles blank pages + invalid custom dims', async () => {
      const mixed = await createMixedSizePdf();
      const progressEvents: number[] = [];

      const res = await processPdfCropperBooklet(
        mixed,
        'mixed.pdf',
        {
          ...DEFAULT_CROPPER_OPTIONS,
          mode: 'resize',
          resize: {
            targetPaper: 'letter',
            orientation: 'portrait',
            scaleMode: 'contain',
            gutterMarginPt: 18,
          },
        },
        { onProgress: (pct) => progressEvents.push(pct) }
      );

      expect(res.success).toBe(true);
      expect(res.fileName).toBe('mixed-resized.pdf');
      expect(res.outputPageCount).toBe(3);
      expect(progressEvents.at(-1)).toBe(100);

      const resizedDoc = await PDFDocument.load(res.bytes!);
      for (const page of resizedDoc.getPages()) {
        expect(page.getWidth()).toBeCloseTo(612, 1);
        expect(page.getHeight()).toBeCloseTo(792, 1);
      }

      // Blank page safety (no /Contents stream)
      const withBlank = await createSyntheticPdf(2, { leaveBlankPages: [2] });
      const blankResize = await processPdfCropperBooklet(withBlank, 'blank.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'resize',
      });
      expect(blankResize.success).toBe(true);
      expect(blankResize.outputPageCount).toBe(2);

      // Invalid tiny custom paper
      const badCustom = await processPdfCropperBooklet(mixed, 'mixed.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'resize',
        resize: {
          ...DEFAULT_CROPPER_OPTIONS.resize,
          targetPaper: 'custom',
          customWidthPt: 5,
          customHeightPt: 5,
        },
      });
      expect(badCustom.success).toBe(false);
      expect(badCustom.errorCode).toBe('INVALID_OPTIONS');
    });

    it('imposes 4-up / 2-up / 6-up handout PDFs and 6-page saddle-stitch booklet PDFs safely', async () => {
      const fivePagesWithBlank = await createSyntheticPdf(5, { leaveBlankPages: [4] });
      const nup4 = await processPdfCropperBooklet(fivePagesWithBlank, 'deck.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'nup',
        nup: {
          ...DEFAULT_CROPPER_OPTIONS.nup,
          pagesPerSheet: 4,
          targetPaper: 'letter',
          drawCutGuides: true,
        },
      });
      expect(nup4.success).toBe(true);
      expect(nup4.fileName).toBe('deck-nup.pdf');
      expect(nup4.outputPageCount).toBe(2);
      const nupDoc = await PDFDocument.load(nup4.bytes!);
      expect(nupDoc.getPageCount()).toBe(2);

      const sixPages = await createSyntheticPdf(6, { leaveBlankPages: [3] });
      const bookletRes = await processPdfCropperBooklet(sixPages, 'zine.pdf', {
        ...DEFAULT_CROPPER_OPTIONS,
        mode: 'booklet',
        nup: {
          ...DEFAULT_CROPPER_OPTIONS.nup,
          targetPaper: 'a4',
          readingDirection: 'ltr',
          drawCutGuides: true,
        },
      });

      expect(bookletRes.success).toBe(true);
      expect(bookletRes.fileName).toBe('zine-booklet.pdf');
      expect(bookletRes.outputPageCount).toBe(4);
      expect(bookletRes.impositionMap).toEqual([
        { sheet: 1, side: 'front', pages: [null, 1] },
        { sheet: 1, side: 'back', pages: [2, null] },
        { sheet: 2, side: 'front', pages: [6, 3] },
        { sheet: 2, side: 'back', pages: [4, 5] },
      ]);

      const bookletDoc = await PDFDocument.load(bookletRes.bytes!);
      expect(bookletDoc.getPageCount()).toBe(4);
      const firstSheet = bookletDoc.getPage(0);
      expect(firstSheet.getWidth()).toBeGreaterThan(firstSheet.getHeight());
    });

    it('rejects empty, non-PDF, and corrupt buffers safely', async () => {
      const empty = await processPdfCropperBooklet(
        new Uint8Array(0),
        'empty.pdf',
        DEFAULT_CROPPER_OPTIONS
      );
      expect(empty.success).toBe(false);
      expect(empty.errorCode).toBe('INVALID_INPUT');

      const nonPdf = await processPdfCropperBooklet(
        createNonPdfBytes(),
        'fake.pdf',
        DEFAULT_CROPPER_OPTIONS
      );
      expect(nonPdf.success).toBe(false);
      expect(nonPdf.errorCode).toBe('INVALID_PDF');

      const corrupt = await processPdfCropperBooklet(
        createCorruptPdfBytes(),
        'corrupt.pdf',
        DEFAULT_CROPPER_OPTIONS
      );
      expect(corrupt.success).toBe(false);
      expect(corrupt.errorCode).toBe('INVALID_PDF');
    });
  });
});
