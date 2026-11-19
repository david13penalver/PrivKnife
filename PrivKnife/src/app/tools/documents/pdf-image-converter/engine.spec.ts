import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  applyScanFilterToRgba,
  buildImageOutputFileName,
  buildPdfOutputFileName,
  computePdfPageLayout,
  computeRenderDimensions,
  convertImagesToPdf,
  convertPdfToImages,
  validateImagesToPdfOptions,
  validatePdfToImagesOptions,
} from './engine';
import {
  createCorruptPdfBytes,
  createFakeEncryptedPdfBytes,
  createMockPageRenderer,
  createSyntheticPdf,
  DEFAULT_IMAGES_TO_PDF_OPTIONS,
  DEFAULT_PDF_TO_IMAGES_OPTIONS,
  LANDSCAPE_PNG_BYTES,
  MINIMAL_JPEG_BYTES,
  PORTRAIT_PNG_BYTES,
} from './test-fixtures';

describe('PDF to Images & Images to PDF Studio Engine (Seam 1)', () => {
  describe('Slice 1: Geometry, DPI Clamping, Scan Pixel Filters & Filenames', () => {
    it('computes scaled render pixel dimensions and clamps oversized sheets safely', () => {
      const a4At300 = computeRenderDimensions(595.28, 841.89, 300);
      expect(a4At300.wasClamped).toBe(false);
      expect(a4At300.width).toBe(2480);
      expect(a4At300.height).toBe(3508);

      const hugeAt300 = computeRenderDimensions(2384, 3370, 300, 8192);
      expect(hugeAt300.wasClamped).toBe(true);
      expect(Math.max(hugeAt300.width, hugeAt300.height)).toBe(8192);

      const zeroGuarded = computeRenderDimensions(0, -10, 150);
      expect(zeroGuarded.width).toBeGreaterThanOrEqual(1);
      expect(zeroGuarded.height).toBeGreaterThanOrEqual(1);
    });

    it('computes A4/Letter/Fit-to-Image layouts with auto orientation and 90° rotation swapping', () => {
      // Landscape 800x400 on A4 auto -> landscape A4 (841.89 x 595.28)
      const landscape = computePdfPageLayout(800, 400, 0, DEFAULT_IMAGES_TO_PDF_OPTIONS);
      expect(landscape.pageWidth).toBeCloseTo(841.89, 1);
      expect(landscape.pageHeight).toBeCloseTo(595.28, 1);
      expect(landscape.drawWidth).toBeLessThanOrEqual(landscape.pageWidth - 48);

      // Rotating 800x400 by 90 deg makes it portrait (400x800) -> portrait A4 (595.28 x 841.89)
      const rotatedPortrait = computePdfPageLayout(800, 400, 90, DEFAULT_IMAGES_TO_PDF_OPTIONS);
      expect(rotatedPortrait.pageWidth).toBeCloseTo(595.28, 1);
      expect(rotatedPortrait.pageHeight).toBeCloseTo(841.89, 1);

      // Fit to image with 90° rotation
      const fit = computePdfPageLayout(960, 480, 90, {
        ...DEFAULT_IMAGES_TO_PDF_OPTIONS,
        pageSize: 'fit_to_image',
        marginPt: 10,
      });
      expect(fit.pageWidth).toBeCloseTo(480 * 0.75 + 20, 1);
      expect(fit.pageHeight).toBeCloseTo(960 * 0.75 + 20, 1);

      // Excessive margin clamped so printable box stays >= 20pt
      const extremeMargin = computePdfPageLayout(800, 600, 0, {
        ...DEFAULT_IMAGES_TO_PDF_OPTIONS,
        marginPt: 500,
      });
      expect(extremeMargin.drawWidth).toBeGreaterThan(0);
      expect(extremeMargin.drawHeight).toBeGreaterThan(0);
    });

    it('applies none, enhanced_color, and bw_document scan filters cleanly', () => {
      const sample = new Uint8ClampedArray([
        220, 215, 210, 255, // light gray paper
        40, 50, 70, 255, // dark ink
      ]);

      const unchanged = new Uint8ClampedArray(sample);
      applyScanFilterToRgba(unchanged, 'none');
      expect(Array.from(unchanged)).toEqual(Array.from(sample));

      const bw = new Uint8ClampedArray(sample);
      applyScanFilterToRgba(bw, 'bw_document');
      // Light paper lifted to pure white, dark ink stays dark grayscale, alpha preserved
      expect(bw[0]).toBe(255);
      expect(bw[1]).toBe(255);
      expect(bw[2]).toBe(255);
      expect(bw[3]).toBe(255);
      expect(bw[4]).toBe(bw[5]);
      expect(bw[5]).toBe(bw[6]);
      expect(bw[4]).toBeLessThan(60);

      const enhanced = new Uint8ClampedArray(sample);
      applyScanFilterToRgba(enhanced, 'enhanced_color');
      expect(enhanced[0]).toBeGreaterThanOrEqual(220);
      expect(enhanced[4]).toBeLessThanOrEqual(40);
    });

    it('validates options and sanitizes output image and PDF filenames', () => {
      expect(validatePdfToImagesOptions(DEFAULT_PDF_TO_IMAGES_OPTIONS)).toBe(true);
      expect(
        validatePdfToImagesOptions({ ...DEFAULT_PDF_TO_IMAGES_OPTIONS, dpi: 40 })
      ).toBe(false);
      expect(
        validatePdfToImagesOptions({ ...DEFAULT_PDF_TO_IMAGES_OPTIONS, selectedPages: [] })
      ).toBe(false);

      expect(validateImagesToPdfOptions(DEFAULT_IMAGES_TO_PDF_OPTIONS)).toBe(true);
      expect(
        validateImagesToPdfOptions({ ...DEFAULT_IMAGES_TO_PDF_OPTIONS, marginPt: -5 })
      ).toBe(false);
      expect(
        validateImagesToPdfOptions({ ...DEFAULT_IMAGES_TO_PDF_OPTIONS, jpegQuality: 0.2 })
      ).toBe(false);

      expect(buildImageOutputFileName('../../docs/scan.PDF', 2, 12, 'image/webp')).toBe(
        'scan-page-02.webp'
      );
      expect(buildImageOutputFileName('report.pdf', 3, 120, 'image/jpeg')).toBe(
        'report-page-003.jpg'
      );
      expect(buildPdfOutputFileName('../../receipts')).toBe('receipts.pdf');
      expect(buildPdfOutputFileName('   ')).toBe('images-compiled.pdf');
    });
  });

  describe('Slice 2: Mode A — PDF to Images Conversion', () => {
    it('rejects empty, corrupt, encrypted PDFs, invalid options, and out-of-range pages', async () => {
      const emptyRes = await convertPdfToImages(
        new Uint8Array(0),
        'empty.pdf',
        DEFAULT_PDF_TO_IMAGES_OPTIONS
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('INVALID_INPUT');

      const corruptRes = await convertPdfToImages(
        createCorruptPdfBytes(),
        'broken.pdf',
        DEFAULT_PDF_TO_IMAGES_OPTIONS
      );
      expect(corruptRes.success).toBe(false);
      expect(corruptRes.errorCode).toBe('CORRUPT_PDF');

      const encRes = await convertPdfToImages(
        await createFakeEncryptedPdfBytes(),
        'locked.pdf',
        DEFAULT_PDF_TO_IMAGES_OPTIONS
      );
      expect(encRes.success).toBe(false);
      expect(encRes.errorCode).toBe('ENCRYPTED_PDF');

      const pdfBytes = await createSyntheticPdf(3);
      const badOpts = await convertPdfToImages(pdfBytes, 'doc.pdf', {
        ...DEFAULT_PDF_TO_IMAGES_OPTIONS,
        selectedPages: [],
      });
      expect(badOpts.success).toBe(false);
      expect(badOpts.errorCode).toBe('INVALID_OPTIONS');

      const badRange = await convertPdfToImages(pdfBytes, 'doc.pdf', {
        ...DEFAULT_PDF_TO_IMAGES_OPTIONS,
        selectedPages: [1, 7],
      });
      expect(badRange.success).toBe(false);
      expect(badRange.errorCode).toBe('INVALID_RANGE');
    });

    it('exports a single image directly without ZIP wrapping when 1 page is selected', async () => {
      const pdfBytes = await createSyntheticPdf(3);
      const res = await convertPdfToImages(
        pdfBytes,
        'brochure.pdf',
        { ...DEFAULT_PDF_TO_IMAGES_OPTIONS, selectedPages: [2], format: 'image/png' },
        { renderPages: createMockPageRenderer('image/png') }
      );

      expect(res.success).toBe(true);
      expect(res.itemCount).toBe(1);
      expect(res.mimeType).toBe('image/png');
      expect(res.fileName).toBe('brochure-page-02.png');
      expect(res.bytes?.subarray(0, 4)).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    });

    it('deduplicates, sorts selected pages, and bundles multiple images into a valid ZIP archive', async () => {
      const pdfBytes = await createSyntheticPdf(3);
      const progressEvents: number[] = [];

      const res = await convertPdfToImages(
        pdfBytes,
        'manual.pdf',
        { ...DEFAULT_PDF_TO_IMAGES_OPTIONS, selectedPages: [3, 1, 3], format: 'image/jpeg' },
        {
          renderPages: createMockPageRenderer('image/jpeg', true),
          onProgress: (pct: number) => progressEvents.push(pct),
        }
      );

      expect(res.success).toBe(true);
      expect(res.itemCount).toBe(2);
      expect(res.mimeType).toBe('application/zip');
      expect(res.fileName).toBe('manual-images.zip');
      expect(res.warnings.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1]).toBe(100);

      const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
      expect(Object.keys(zip.files).sort()).toEqual([
        'manual-page-01.jpg',
        'manual-page-03.jpg',
      ]);
    });

    it('cancels cleanly when AbortSignal is triggered', async () => {
      const pdfBytes = await createSyntheticPdf(3);
      const controller = new AbortController();
      controller.abort();

      const res = await convertPdfToImages(
        pdfBytes,
        'cancel.pdf',
        { ...DEFAULT_PDF_TO_IMAGES_OPTIONS, selectedPages: [1, 2] },
        {
          renderPages: createMockPageRenderer('image/png'),
          signal: controller.signal,
        }
      );

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('CANCELLED');
    });
  });

  describe('Slice 3: Mode B — Images to PDF Conversion', () => {
    it('rejects empty image lists, invalid options, and corrupt image bytes cleanly', async () => {
      const emptyRes = await convertImagesToPdf([], DEFAULT_IMAGES_TO_PDF_OPTIONS);
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('INVALID_INPUT');

      const badOptsRes = await convertImagesToPdf(
        [
          {
            id: '1',
            fileName: 'a.png',
            bytes: LANDSCAPE_PNG_BYTES,
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
        ],
        { ...DEFAULT_IMAGES_TO_PDF_OPTIONS, marginPt: -1 }
      );
      expect(badOptsRes.success).toBe(false);
      expect(badOptsRes.errorCode).toBe('INVALID_OPTIONS');

      const corruptImgRes = await convertImagesToPdf(
        [
          {
            id: 'bad',
            fileName: 'corrupt.png',
            bytes: Uint8Array.from('NOT_IMAGE', (c) => c.charCodeAt(0)),
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
        ],
        DEFAULT_IMAGES_TO_PDF_OPTIONS
      );
      expect(corruptImgRes.success).toBe(false);
      expect(corruptImgRes.errorCode).toBe('INVALID_IMAGE');
      expect(corruptImgRes.error).toContain('corrupt.png');
    });

    it('builds multi-page A4 PDF with auto landscape/portrait orientation matching image aspect ratios', async () => {
      const res = await convertImagesToPdf(
        [
          {
            id: 'img-1',
            fileName: 'wide.png',
            bytes: LANDSCAPE_PNG_BYTES,
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
          {
            id: 'img-2',
            fileName: 'tall.png',
            bytes: PORTRAIT_PNG_BYTES,
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
        ],
        { ...DEFAULT_IMAGES_TO_PDF_OPTIONS, pageSize: 'a4', orientation: 'auto', outputFileName: 'scans' }
      );

      expect(res.success).toBe(true);
      expect(res.fileName).toBe('scans.pdf');
      expect(res.itemCount).toBe(2);
      expect(res.blob).toBeInstanceOf(Blob);

      const reloaded = await PDFDocument.load(res.bytes!);
      expect(reloaded.getPageCount()).toBe(2);

      const p1 = reloaded.getPage(0).getSize();
      const p2 = reloaded.getPage(1).getSize();
      expect(Math.round(p1.width)).toBe(842);
      expect(Math.round(p1.height)).toBe(595);
      expect(Math.round(p2.width)).toBe(595);
      expect(Math.round(p2.height)).toBe(842);
    });

    it('supports 90° rotation, JPEG inputs, and custom image normalizer for scan filters', async () => {
      const normalizerSpy = vi.fn(async (input: { fileName: string }) => ({
        bytes: MINIMAL_JPEG_BYTES,
        format: 'jpeg' as const,
        widthPx: 800,
        heightPx: 400,
      }));

      const res = await convertImagesToPdf(
        [
          {
            id: 'scan-1',
            fileName: 'receipt.jpg',
            bytes: MINIMAL_JPEG_BYTES,
            mimeType: 'image/jpeg',
            rotationDeg: 90,
            scanFilter: 'bw_document',
          },
        ],
        { ...DEFAULT_IMAGES_TO_PDF_OPTIONS, pageSize: 'letter', orientation: 'auto' },
        { normalizeImage: normalizerSpy }
      );

      expect(res.success).toBe(true);
      expect(normalizerSpy).toHaveBeenCalledTimes(1);
      const reloaded = await PDFDocument.load(res.bytes!);
      expect(reloaded.getPageCount()).toBe(1);
    });
  });
});
