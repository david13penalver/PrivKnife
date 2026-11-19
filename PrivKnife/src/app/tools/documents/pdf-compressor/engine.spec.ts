import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { PDFDocument, PDFName } from 'pdf-lib';
import {
  buildCompressedFileName,
  compressBatchPdfs,
  compressSinglePdf,
  computeTargetDimensions,
  getPresetOptions,
  PRESET_CONFIGS,
  validateOptions,
} from './engine';
import {
  countImageStreams,
  createCorruptPdfBytes,
  createFakeEncryptedPdfBytes,
  createMockRasterizer,
  createMockReencoder,
  createNonPdfPngBytes,
  createSyntheticImagePdf,
  createSyntheticTextPdf,
  DEFAULT_COMPRESSOR_OPTIONS,
} from './test-fixtures';

describe('Client-Side PDF Compressor Engine (Seam 1)', () => {
  describe('Slice 1: Presets, Validation, Filenames & Dimension Scaling', () => {
    it('exposes calibrated preset definitions and applies overrides cleanly', () => {
      expect(PRESET_CONFIGS.extreme.targetDpi).toBe(96);
      expect(PRESET_CONFIGS.extreme.jpegQuality).toBe(0.5);
      expect(PRESET_CONFIGS.recommended.targetDpi).toBe(150);
      expect(PRESET_CONFIGS.high_quality.targetDpi).toBe(240);

      const custom = getPresetOptions('extreme', { convertToGrayscale: true });
      expect(custom.preset).toBe('extreme');
      expect(custom.convertToGrayscale).toBe(true);
      expect(custom.targetDpi).toBe(96);
    });

    it('validates default options and rejects out-of-range or NaN/Infinity values', () => {
      expect(validateOptions(DEFAULT_COMPRESSOR_OPTIONS)).toBe(true);
      expect(validateOptions(null as any)).toBe(false);
      expect(validateOptions(undefined as any)).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, targetDpi: 71 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, targetDpi: 301 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, targetDpi: Number.NaN })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, targetDpi: Number.POSITIVE_INFINITY })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, jpegQuality: 0.24 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, jpegQuality: 0.96 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, jpegQuality: Number.NaN })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, maxImageDimensionPx: 799 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, maxImageDimensionPx: 4001 })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, preset: 'bogus' as any })).toBe(false);
      expect(validateOptions({ ...DEFAULT_COMPRESSOR_OPTIONS, mode: 'bogus' as any })).toBe(false);
    });

    it('sanitizes filenames against path traversal, control bytes, missing extensions, and uppercase PDF', () => {
      expect(buildCompressedFileName('invoice.pdf')).toBe('invoice-compressed.pdf');
      expect(buildCompressedFileName('REPORT.FINAL.PDF')).toBe('REPORT.FINAL-compressed.pdf');
      expect(buildCompressedFileName('no-extension')).toBe('no-extension-compressed.pdf');
      expect(buildCompressedFileName('../../etc/secret\u0000.pdf')).toBe('secret-compressed.pdf');
      expect(buildCompressedFileName('C:\\Users\\Alice\\tax\\return 2026.pdf')).toBe('return 2026-compressed.pdf');
      expect(buildCompressedFileName('   ')).toBe('document-compressed.pdf');
    });

    it('computes proportional downscale dimensions without upscaling or dropping below 1px', () => {
      expect(computeTargetDimensions(4000, 2000, 1800)).toEqual({ width: 1800, height: 900 });
      expect(computeTargetDimensions(1500, 3000, 1500)).toEqual({ width: 750, height: 1500 });
      expect(computeTargetDimensions(800, 600, 1800)).toEqual({ width: 800, height: 600 });
      // Extreme aspect ratio should clamp minor axis to >= 1
      expect(computeTargetDimensions(10000, 2, 1000)).toEqual({ width: 1000, height: 1 });
      expect(computeTargetDimensions(0, -5, 1000)).toEqual({ width: 1, height: 1 });
    });
  });

  describe('Slice 2: Smart Stream PDF Compression & Edge-Case Guards', () => {
    it('returns INVALID_INPUT on empty buffer and INVALID_OPTIONS on invalid config', async () => {
      const emptyRes = await compressSinglePdf(
        { fileName: 'empty.pdf', bytes: new Uint8Array(0) },
        DEFAULT_COMPRESSOR_OPTIONS
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('INVALID_INPUT');

      const validPdf = await createSyntheticTextPdf(1);
      const badOptsRes = await compressSinglePdf(
        { fileName: 'valid.pdf', bytes: validPdf },
        { ...DEFAULT_COMPRESSOR_OPTIONS, targetDpi: 999 }
      );
      expect(badOptsRes.success).toBe(false);
      expect(badOptsRes.errorCode).toBe('INVALID_OPTIONS');
    });

    it('returns CORRUPT_PDF on non-PDF PNG bytes and truncated garbage PDFs', async () => {
      const pngRes = await compressSinglePdf(
        { fileName: 'fake.pdf', bytes: createNonPdfPngBytes() },
        DEFAULT_COMPRESSOR_OPTIONS
      );
      expect(pngRes.success).toBe(false);
      expect(pngRes.errorCode).toBe('CORRUPT_PDF');

      const corruptRes = await compressSinglePdf(
        { fileName: 'broken.pdf', bytes: createCorruptPdfBytes() },
        DEFAULT_COMPRESSOR_OPTIONS
      );
      expect(corruptRes.success).toBe(false);
      expect(corruptRes.errorCode).toBe('CORRUPT_PDF');
    });

    it('returns ENCRYPTED_PDF for password-protected PDFs', async () => {
      const encBytes = await createFakeEncryptedPdfBytes();
      const encRes = await compressSinglePdf(
        { fileName: 'locked.pdf', bytes: encBytes },
        DEFAULT_COMPRESSOR_OPTIONS
      );
      expect(encRes.success).toBe(false);
      expect(encRes.errorCode).toBe('ENCRYPTED_PDF');
    });

    it('re-encodes eligible JPEG image XObjects, reduces size, and updates ColorSpace for grayscale', async () => {
      const srcBytes = await createSyntheticImagePdf({
        width: 2400,
        height: 1600,
        streamByteSize: 32000,
      });

      const reencoder = vi.fn(createMockReencoder(1800));
      const res = await compressSinglePdf(
        { fileName: 'photo-report.pdf', bytes: srcBytes },
        { ...DEFAULT_COMPRESSOR_OPTIONS, convertToGrayscale: true, maxImageDimensionPx: 1200 },
        { reencodeImage: reencoder }
      );

      expect(res.success).toBe(true);
      expect(res.files).toHaveLength(1);
      const out = res.files[0];
      expect(out.outputFileName).toBe('photo-report-compressed.pdf');
      expect(out.metrics.compressedBytes).toBeLessThan(out.metrics.originalBytes);
      expect(out.metrics.savedBytes).toBe(out.metrics.originalBytes - out.metrics.compressedBytes);
      expect(out.metrics.imagesOptimized).toBe(1);
      expect(out.metrics.pageCount).toBe(1);
      expect(out.metrics.usedOriginalFallback).toBe(false);
      expect(reencoder).toHaveBeenCalledTimes(1);
      expect(reencoder.mock.calls[0][0].targetWidth).toBe(1200);
      expect(reencoder.mock.calls[0][0].targetHeight).toBe(800);
      expect(reencoder.mock.calls[0][0].grayscale).toBe(true);

      // Verify reloaded PDF is structurally intact with updated metadata on the XObject
      const reloaded = await PDFDocument.load(out.bytes);
      expect(reloaded.getPageCount()).toBe(1);
      const streams = countImageStreams(reloaded);
      expect(streams).toHaveLength(1);
      expect(streams[0].width).toBe(1200);
      expect(streams[0].height).toBe(800);
      expect(streams[0].colorSpace).toBe('/DeviceGray');
    });

    it('preserves /SMask alpha channels and skips tiny <64x64 icons', async () => {
      const srcBytes = await createSyntheticImagePdf({
        width: 2000,
        height: 2000,
        streamByteSize: 25000,
        includeSoftMask: true,
        includeTinyIcon: true,
      });

      const reencoder = vi.fn(createMockReencoder(1500));
      const res = await compressSinglePdf(
        { fileName: 'masked.pdf', bytes: srcBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: reencoder }
      );

      expect(res.success).toBe(true);
      // Only the 2000x2000 primary image should be re-encoded; SMask (4096B) and tiny icon (2048B) skipped
      expect(reencoder).toHaveBeenCalledTimes(1);
      expect(res.files[0].metrics.imagesOptimized).toBe(1);
      expect(res.files[0].metrics.imagesSkipped).toBe(2);

      const reloaded = await PDFDocument.load(res.files[0].bytes);
      const streams = countImageStreams(reloaded);
      expect(streams.some((s) => s.byteLength === 4096)).toBe(true);
      expect(streams.some((s) => s.byteLength === 2048)).toBe(true);
    });

    it('skips unsupported filters (JBIG2Decode) and DeviceCMYK streams without corruption', async () => {
      const jbigBytes = await createSyntheticImagePdf({
        filter: 'JBIG2Decode',
        streamByteSize: 12000,
      });
      const cmykBytes = await createSyntheticImagePdf({
        filter: 'DCTDecode',
        colorSpace: 'DeviceCMYK',
        streamByteSize: 12000,
      });

      const reencoder = vi.fn(createMockReencoder(1000));
      const jbigRes = await compressSinglePdf(
        { fileName: 'jbig.pdf', bytes: jbigBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: reencoder }
      );
      const cmykRes = await compressSinglePdf(
        { fileName: 'cmyk.pdf', bytes: cmykBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: reencoder }
      );

      expect(jbigRes.success).toBe(true);
      expect(jbigRes.files[0].metrics.imagesOptimized).toBe(0);
      expect(jbigRes.files[0].metrics.imagesSkipped).toBe(1);

      expect(cmykRes.success).toBe(true);
      expect(cmykRes.files[0].metrics.imagesOptimized).toBe(0);
      expect(cmykRes.files[0].metrics.imagesSkipped).toBe(1);
      expect(reencoder).not.toHaveBeenCalled();
    });

    it('enforces per-image size regression guard and handles reencoder null/errors cleanly', async () => {
      const srcBytes = await createSyntheticImagePdf({ streamByteSize: 10000 });

      // Larger output (50KB > 10KB)
      const largerRes = await compressSinglePdf(
        { fileName: 'reg.pdf', bytes: srcBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: createMockReencoder(50000) }
      );
      expect(largerRes.success).toBe(true);
      expect(largerRes.files[0].metrics.imagesOptimized).toBe(0);
      expect(largerRes.files[0].metrics.imagesSkipped).toBe(1);

      // Reencoder returns null
      const nullRes = await compressSinglePdf(
        { fileName: 'null.pdf', bytes: srcBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: createMockReencoder('null') }
      );
      expect(nullRes.success).toBe(true);
      expect(nullRes.files[0].metrics.imagesOptimized).toBe(0);

      // Reencoder throws
      const throwRes = await compressSinglePdf(
        { fileName: 'throw.pdf', bytes: srcBytes },
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: createMockReencoder('throw') }
      );
      expect(throwRes.success).toBe(true);
      expect(throwRes.files[0].metrics.imagesOptimized).toBe(0);
    });

    it('strips /Info metadata, XMP /Metadata, and page /Thumb when requested', async () => {
      const bloatedMetaPdf = await createSyntheticTextPdf(2, {
        title: 'Secret Quarterly Merger Strategy ' + 'X'.repeat(500),
        author: 'Internal Legal Counsel ' + 'Y'.repeat(500),
        subject: 'Confidential',
        keywords: ['merger', 'nda'],
        includeXmp: true,
        includeThumb: true,
      });

      const stripped = await compressSinglePdf(
        { fileName: 'meta.pdf', bytes: bloatedMetaPdf },
        { ...DEFAULT_COMPRESSOR_OPTIONS, stripMetadata: true, removeThumbnails: true }
      );
      expect(stripped.success).toBe(true);
      expect(stripped.files[0].metrics.usedOriginalFallback).toBe(false);

      const reloaded = await PDFDocument.load(stripped.files[0].bytes);
      expect(reloaded.getTitle()).toBeUndefined();
      expect(reloaded.getAuthor()).toBeUndefined();
      expect(reloaded.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
      expect(reloaded.getPage(0).node.get(PDFName.of('Thumb'))).toBeUndefined();
    });

    it('falls back to original bytes when re-save does not reduce size (document regression guard)', async () => {
      const tinyTextPdf = await createSyntheticTextPdf(1);
      const res = await compressSinglePdf(
        { fileName: 'tiny.pdf', bytes: tinyTextPdf },
        { ...DEFAULT_COMPRESSOR_OPTIONS, stripMetadata: false, removeThumbnails: false }
      );

      expect(res.success).toBe(true);
      expect(res.files[0].metrics.compressedBytes).toBeLessThanOrEqual(tinyTextPdf.byteLength);
      if (res.files[0].metrics.usedOriginalFallback) {
        expect(res.files[0].bytes).toEqual(tinyTextPdf);
        expect(res.files[0].metrics.savedBytes).toBe(0);
      }
    });
  });

  describe('Slice 3: Full Rasterize Mode', () => {
    it('rebuilds a multi-page PDF via rasterize_pages mode preserving page count and size', async () => {
      const srcBytes = await createSyntheticImagePdf({
        pageCount: 2,
        streamByteSize: 28000,
      });
      const progressEvents: number[] = [];

      const res = await compressSinglePdf(
        { fileName: 'scan.pdf', bytes: srcBytes },
        { ...DEFAULT_COMPRESSOR_OPTIONS, mode: 'rasterize_pages', targetDpi: 150 },
        {
          rasterizePages: createMockRasterizer(1200, 2),
          onProgress: (pct) => progressEvents.push(pct),
        }
      );

      expect(res.success).toBe(true);
      expect(res.files).toHaveLength(1);
      expect(res.files[0].metrics.pageCount).toBe(2);
      expect(res.files[0].metrics.imagesOptimized).toBe(2);
      expect(res.files[0].metrics.compressedBytes).toBeLessThan(srcBytes.byteLength);
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1]).toBe(100);

      const reloaded = await PDFDocument.load(res.files[0].bytes);
      expect(reloaded.getPageCount()).toBe(2);
      const { width, height } = reloaded.getPage(0).getSize();
      expect(Math.round(width)).toBe(595);
      expect(Math.round(height)).toBe(842);
    });

    it('handles rasterizer throwing or returning zero pages cleanly', async () => {
      const srcBytes = await createSyntheticTextPdf(1);
      const throwRes = await compressSinglePdf(
        { fileName: 'scan.pdf', bytes: srcBytes },
        { ...DEFAULT_COMPRESSOR_OPTIONS, mode: 'rasterize_pages' },
        {
          rasterizePages: async () => {
            throw new Error('Canvas allocation failed');
          },
        }
      );
      expect(throwRes.success).toBe(false);
      expect(throwRes.errorCode).toBe('CORRUPT_PDF');

      const emptyRes = await compressSinglePdf(
        { fileName: 'scan.pdf', bytes: srcBytes },
        { ...DEFAULT_COMPRESSOR_OPTIONS, mode: 'rasterize_pages' },
        { rasterizePages: async () => [] }
      );
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCode).toBe('CORRUPT_PDF');
    });
  });

  describe('Slice 4: Batch Compression, Filename Deduplication & ZIP Packaging', () => {
    it('rejects empty batch arrays and invalid options', async () => {
      const emptyBatch = await compressBatchPdfs([], DEFAULT_COMPRESSOR_OPTIONS);
      expect(emptyBatch.success).toBe(false);
      expect(emptyBatch.errorCode).toBe('INVALID_INPUT');

      const doc = await createSyntheticTextPdf(1);
      const badOpts = await compressBatchPdfs(
        [{ fileName: 'a.pdf', bytes: doc }],
        { ...DEFAULT_COMPRESSOR_OPTIONS, jpegQuality: 0.1 }
      );
      expect(badOpts.success).toBe(false);
      expect(badOpts.errorCode).toBe('INVALID_OPTIONS');
    });

    it('skips ZIP creation when compressing a single PDF in batch mode', async () => {
      const doc = await createSyntheticImagePdf({ streamByteSize: 20000 });
      const res = await compressBatchPdfs(
        [{ fileName: 'single.pdf', bytes: doc }],
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: createMockReencoder(1500) }
      );

      expect(res.success).toBe(true);
      expect(res.files).toHaveLength(1);
      expect(res.bundleZipBlob).toBeUndefined();
    });

    it('deduplicates colliding output filenames and bundles multiple PDFs into a valid ZIP archive', async () => {
      const docA = await createSyntheticImagePdf({ streamByteSize: 22000 });
      const docB = await createSyntheticImagePdf({ streamByteSize: 24000 });
      const docC = await createSyntheticImagePdf({ streamByteSize: 26000 });
      const progressValues: number[] = [];

      const res = await compressBatchPdfs(
        [
          { fileName: 'report.pdf', bytes: docA },
          { fileName: 'report.pdf', bytes: docB },
          { fileName: 'report.pdf', bytes: docC },
        ],
        DEFAULT_COMPRESSOR_OPTIONS,
        {
          reencodeImage: createMockReencoder(1500),
          onProgress: (pct) => progressValues.push(pct),
        }
      );

      expect(res.success).toBe(true);
      expect(res.files.map((f) => f.outputFileName)).toEqual([
        'report-compressed.pdf',
        'report-compressed-2.pdf',
        'report-compressed-3.pdf',
      ]);
      expect(res.bundleZipBlob).toBeInstanceOf(Blob);
      expect(res.bundleZipFileName).toBe('privknife-compressed-pdfs.zip');

      // Verify monotonic progress ending at 100
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
      expect(progressValues[progressValues.length - 1]).toBe(100);

      // Independently parse generated ZIP and verify all 3 valid PDFs inside
      const zipBuffer = await res.bundleZipBlob!.arrayBuffer();
      const zip = await JSZip.loadAsync(zipBuffer);
      const entries = Object.keys(zip.files).sort();
      expect(entries).toEqual([
        'report-compressed-2.pdf',
        'report-compressed-3.pdf',
        'report-compressed.pdf',
      ]);
      const firstPdfBytes = await zip.file('report-compressed.pdf')!.async('uint8array');
      expect(new TextDecoder().decode(firstPdfBytes.subarray(0, 5))).toBe('%PDF-');
    });

    it('surfaces descriptive filename error if any file in a batch is corrupt', async () => {
      const validDoc = await createSyntheticImagePdf({ streamByteSize: 20000 });
      const res = await compressBatchPdfs(
        [
          { fileName: 'good.pdf', bytes: validDoc },
          { fileName: 'corrupt-invoice.pdf', bytes: createCorruptPdfBytes() },
        ],
        DEFAULT_COMPRESSOR_OPTIONS,
        { reencodeImage: createMockReencoder(1500) }
      );

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('CORRUPT_PDF');
      expect(res.error).toContain('corrupt-invoice.pdf');
    });
  });
});
