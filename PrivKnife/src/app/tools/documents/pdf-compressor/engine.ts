import JSZip from 'jszip';
import {
  EncryptedPDFError,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from 'pdf-lib';
import {
  CompressionPreset,
  ImageReencoderFn,
  ImageReencodeRequest,
  PageRasterizerFn,
  PdfCompressionMetrics,
  PdfCompressorDeps,
  PdfCompressorFileInput,
  PdfCompressorFileResult,
  PdfCompressorOptions,
  PdfCompressorResult,
  RasterizedPageImage,
} from './types';

export const PRESET_CONFIGS: Record<
  Exclude<CompressionPreset, 'custom'>,
  Omit<PdfCompressorOptions, 'preset' | 'convertToGrayscale'>
> = {
  extreme: {
    mode: 'smart_stream',
    targetDpi: 96,
    maxImageDimensionPx: 1200,
    jpegQuality: 0.5,
    stripMetadata: true,
    removeThumbnails: true,
  },
  recommended: {
    mode: 'smart_stream',
    targetDpi: 150,
    maxImageDimensionPx: 1800,
    jpegQuality: 0.72,
    stripMetadata: true,
    removeThumbnails: true,
  },
  high_quality: {
    mode: 'smart_stream',
    targetDpi: 240,
    maxImageDimensionPx: 2800,
    jpegQuality: 0.86,
    stripMetadata: false,
    removeThumbnails: true,
  },
};

export function getPresetOptions(
  preset: Exclude<CompressionPreset, 'custom'>,
  overrides: Partial<PdfCompressorOptions> = {}
): PdfCompressorOptions {
  return {
    preset,
    convertToGrayscale: false,
    ...PRESET_CONFIGS[preset],
    ...overrides,
  };
}

export function validateOptions(options: PdfCompressorOptions | null | undefined): boolean {
  if (!options || typeof options !== 'object') {
    return false;
  }

  const validPresets: CompressionPreset[] = ['extreme', 'recommended', 'high_quality', 'custom'];
  if (!validPresets.includes(options.preset)) {
    return false;
  }

  if (options.mode !== 'smart_stream' && options.mode !== 'rasterize_pages') {
    return false;
  }

  if (
    !Number.isFinite(options.targetDpi) ||
    options.targetDpi < 72 ||
    options.targetDpi > 300
  ) {
    return false;
  }

  if (
    !Number.isFinite(options.maxImageDimensionPx) ||
    options.maxImageDimensionPx < 800 ||
    options.maxImageDimensionPx > 4000
  ) {
    return false;
  }

  if (
    !Number.isFinite(options.jpegQuality) ||
    options.jpegQuality < 0.25 ||
    options.jpegQuality > 0.95
  ) {
    return false;
  }

  return true;
}

export function buildCompressedFileName(originalName: string): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();

  if (!sanitized) {
    return 'document-compressed.pdf';
  }

  const stem = sanitized.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-compressed.pdf`;
}

export function computeTargetDimensions(
  width: number,
  height: number,
  maxEdgePx: number
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { width: 1, height: 1 };
  }

  const safeMax = Number.isFinite(maxEdgePx) && maxEdgePx >= 1 ? maxEdgePx : 1;
  const longest = Math.max(width, height);
  if (longest <= safeMax) {
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  }

  const scale = safeMax / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

async function encodeCanvasToJpeg(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number
): Promise<Uint8Array | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return new Uint8Array(await blob.arrayBuffer());
  }

  if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    );
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  }

  return null;
}

export const defaultBrowserReencoder: ImageReencoderFn = async (
  req: ImageReencodeRequest
): Promise<Uint8Array | null> => {
  if (typeof createImageBitmap !== 'function') {
    return null;
  }

  let bitmap: ImageBitmap | null = null;
  let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;

  try {
    const copy = new Uint8Array(req.bytes);
    const inputBlob = new Blob([copy], { type: req.mimeType });
    bitmap = await createImageBitmap(inputBlob);

    const w = Math.max(1, req.targetWidth);
    const h = Math.max(1, req.targetHeight);

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(w, h);
    } else if (typeof document !== 'undefined') {
      const el = document.createElement('canvas');
      el.width = w;
      el.height = h;
      canvas = el;
    } else {
      return null;
    }

    const ctx = canvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) {
      return null;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    if (req.grayscale) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return await encodeCanvasToJpeg(canvas, req.quality);
  } catch {
    return null;
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};

function resolveSinglePdfName(obj: unknown): string | null {
  if (obj instanceof PDFName) {
    return obj.decodeText();
  }
  if (obj instanceof PDFArray && obj.size() === 1) {
    const first = obj.get(0);
    if (first instanceof PDFName) {
      return first.decodeText();
    }
  }
  return null;
}

function collectMaskRefs(pdfDoc: PDFDocument): Set<PDFRef> {
  const maskRefs = new Set<PDFRef>();
  for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.get(PDFName.of('Subtype'));
    if (subtype !== PDFName.of('Image')) continue;

    const sMask = obj.dict.get(PDFName.of('SMask'));
    if (sMask instanceof PDFRef) {
      maskRefs.add(sMask);
    }
    const mask = obj.dict.get(PDFName.of('Mask'));
    if (mask instanceof PDFRef) {
      maskRefs.add(mask);
    }
  }
  return maskRefs;
}

function isSupportedColorSpace(csObj: unknown): boolean {
  if (!csObj) return true;
  if (csObj instanceof PDFName) {
    const name = csObj.decodeText();
    return name === 'DeviceRGB' || name === 'DeviceGray';
  }
  return false;
}

function stripDocumentMetadataAndThumbs(
  pdfDoc: PDFDocument,
  options: PdfCompressorOptions
): void {
  if (options.stripMetadata) {
    const infoObj = pdfDoc.context.trailerInfo.Info;
    if (infoObj instanceof PDFRef) {
      pdfDoc.context.delete(infoObj);
    }
    pdfDoc.context.trailerInfo.Info = undefined;

    const metaRef = pdfDoc.catalog.get(PDFName.of('Metadata'));
    if (metaRef instanceof PDFRef) {
      pdfDoc.context.delete(metaRef);
    }
    pdfDoc.catalog.delete(PDFName.of('Metadata'));
  }

  if (options.removeThumbnails) {
    for (const page of pdfDoc.getPages()) {
      const thumbRef = page.node.get(PDFName.of('Thumb'));
      if (thumbRef instanceof PDFRef) {
        pdfDoc.context.delete(thumbRef);
      }
      page.node.delete(PDFName.of('Thumb'));
    }
  }
}

function buildMetrics(
  originalBytes: number,
  compressedBytes: number,
  pageCount: number,
  imagesOptimized: number,
  imagesSkipped: number,
  usedOriginalFallback: boolean,
  durationMs: number
): PdfCompressionMetrics {
  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const savingsPercent =
    originalBytes > 0 ? Number(((savedBytes / originalBytes) * 100).toFixed(1)) : 0;

  return {
    originalBytes,
    compressedBytes,
    savedBytes,
    savingsPercent,
    pageCount,
    imagesOptimized,
    imagesSkipped,
    usedOriginalFallback,
    durationMs,
  };
}

export const defaultBrowserRasterizer: PageRasterizerFn = async (
  bytes: Uint8Array,
  options: PdfCompressorOptions,
  onProgress?: (done: number, total: number) => void
): Promise<RasterizedPageImage[]> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const pages: RasterizedPageImage[] = [];
  try {
    const pdfDoc = await loadingTask.promise;
    const total = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const rawScale = options.targetDpi / 72;
      const maxEdge = Math.max(baseViewport.width, baseViewport.height) * rawScale;
      const clampedScale =
        maxEdge > options.maxImageDimensionPx
          ? options.maxImageDimensionPx / Math.max(1, Math.max(baseViewport.width, baseViewport.height))
          : rawScale;

      const viewport = page.getViewport({ scale: Math.max(0.25, clampedScale) });
      const w = Math.max(1, Math.floor(viewport.width));
      const h = Math.max(1, Math.floor(viewport.height));

      let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(w, h);
      } else if (typeof document !== 'undefined') {
        const el = document.createElement('canvas');
        el.width = w;
        el.height = h;
        canvas = el;
      }

      if (!canvas) {
        throw new Error('Canvas 2D context is unavailable for PDF rasterization.');
      }

      try {
        const ctx = canvas.getContext('2d') as
          | OffscreenCanvasRenderingContext2D
          | CanvasRenderingContext2D
          | null;
        if (!ctx) {
          throw new Error('Unable to acquire 2D rendering context.');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        await page.render({
          canvas: canvas as any,
          canvasContext: ctx as any,
          viewport,
        }).promise;

        if (options.convertToGrayscale) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            data[i] = lum;
            data[i + 1] = lum;
            data[i + 2] = lum;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const jpegBytes = await encodeCanvasToJpeg(canvas, options.jpegQuality);
        if (!jpegBytes) {
          throw new Error('Failed to encode rasterized PDF page to JPEG.');
        }

        pages.push({
          jpegBytes,
          widthPt: baseViewport.width,
          heightPt: baseViewport.height,
        });
        onProgress?.(pageNum, total);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages;
};

async function compressViaRasterization(
  input: PdfCompressorFileInput,
  normalizedBytes: Uint8Array,
  options: PdfCompressorOptions,
  deps: PdfCompressorDeps,
  startedAt: number
): Promise<PdfCompressorResult> {
  const rasterize = deps.rasterizePages ?? defaultBrowserRasterizer;
  let renderedPages: RasterizedPageImage[];
  try {
    renderedPages = await rasterize(normalizedBytes, options, (done, total) => {
      const pct = 10 + Math.round((done / Math.max(1, total)) * 75);
      deps.onProgress?.(pct, `Rasterizing page ${done} of ${total}`);
    });
  } catch (err: unknown) {
    return {
      success: false,
      files: [],
      errorCode: 'CORRUPT_PDF',
      error:
        err instanceof Error
          ? err.message
          : 'Failed to rasterize PDF pages.',
    };
  }

  if (!renderedPages || renderedPages.length === 0) {
    return {
      success: false,
      files: [],
      errorCode: 'CORRUPT_PDF',
      error: 'Rasterization produced zero pages.',
    };
  }

  const outDoc = await PDFDocument.create();
  for (const frame of renderedPages) {
    const embedded = await outDoc.embedJpg(frame.jpegBytes);
    const page = outDoc.addPage([frame.widthPt, frame.heightPt]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: frame.widthPt,
      height: frame.heightPt,
    });
  }

  deps.onProgress?.(90, 'Saving rasterized PDF');
  const savedBytes = await outDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const usedOriginalFallback = savedBytes.byteLength >= normalizedBytes.byteLength;
  const finalBytes = usedOriginalFallback ? normalizedBytes : savedBytes;
  const outputFileName = buildCompressedFileName(input.fileName);
  const blobBytes = new Uint8Array(finalBytes.byteLength);
  blobBytes.set(finalBytes);
  const blob = new Blob([blobBytes], { type: 'application/pdf' });

  deps.onProgress?.(100, 'Complete');
  const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

  return {
    success: true,
    files: [
      {
        fileName: input.fileName,
        outputFileName,
        blob,
        bytes: finalBytes,
        metrics: buildMetrics(
          normalizedBytes.byteLength,
          finalBytes.byteLength,
          renderedPages.length,
          usedOriginalFallback ? 0 : renderedPages.length,
          0,
          usedOriginalFallback,
          durationMs
        ),
      },
    ],
  };
}

function deduplicateFileName(candidate: string, usedLowerNames: Set<string>): string {
  const lower = candidate.toLowerCase();
  if (!usedLowerNames.has(lower)) {
    usedLowerNames.add(lower);
    return candidate;
  }

  const dotIdx = candidate.lastIndexOf('.');
  const stem = dotIdx > 0 ? candidate.slice(0, dotIdx) : candidate;
  const ext = dotIdx > 0 ? candidate.slice(dotIdx) : '';

  let counter = 2;
  while (usedLowerNames.has(`${stem}-${counter}${ext}`.toLowerCase())) {
    counter++;
  }
  const unique = `${stem}-${counter}${ext}`;
  usedLowerNames.add(unique.toLowerCase());
  return unique;
}

export async function compressSinglePdf(
  input: PdfCompressorFileInput,
  options: PdfCompressorOptions,
  deps: PdfCompressorDeps = {}
): Promise<PdfCompressorResult> {
  const startedAt = performance.now();

  if (!validateOptions(options)) {
    return {
      success: false,
      files: [],
      errorCode: 'INVALID_OPTIONS',
      error: 'Invalid PDF compression options supplied.',
    };
  }

  if (!input?.bytes || input.bytes.byteLength < 8) {
    return {
      success: false,
      files: [],
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or truncated.',
    };
  }

  if (!hasPdfSignature(input.bytes)) {
    return {
      success: false,
      files: [],
      errorCode: 'CORRUPT_PDF',
      error: 'The selected file does not contain a valid %PDF- header.',
    };
  }

  const normalizedBytes =
    input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);

  let pdfDoc: PDFDocument;
  let pageCount: number;
  try {
    pdfDoc = await PDFDocument.load(normalizedBytes, {
      updateMetadata: false,
      ignoreEncryption: false,
    });
    pageCount = pdfDoc.getPageCount();
    if (!Number.isFinite(pageCount) || pageCount <= 0) {
      return {
        success: false,
        files: [],
        errorCode: 'CORRUPT_PDF',
        error: 'The PDF contains no valid pages or has a missing page tree.',
      };
    }
  } catch (err: unknown) {
    if (
      err instanceof EncryptedPDFError ||
      (err instanceof Error && /encrypted/i.test(err.message))
    ) {
      return {
        success: false,
        files: [],
        errorCode: 'ENCRYPTED_PDF',
        error:
          'This PDF is password-protected or encrypted. Unlock it first before compressing.',
      };
    }
    return {
      success: false,
      files: [],
      errorCode: 'CORRUPT_PDF',
      error:
        err instanceof Error
          ? err.message
          : 'Unable to parse PDF document structure.',
    };
  }
  if (options.mode === 'rasterize_pages') {
    return compressViaRasterization(input, normalizedBytes, options, deps, startedAt);
  }

  const reencode = deps.reencodeImage ?? defaultBrowserReencoder;
  const maskRefs = collectMaskRefs(pdfDoc);

  let imagesOptimized = 0;
  let imagesSkipped = 0;

  const indirectObjects = pdfDoc.context.enumerateIndirectObjects();
  const imageEntries = indirectObjects.filter(([, obj]) => {
    if (!(obj instanceof PDFRawStream)) return false;
    return obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image');
  }) as Array<[PDFRef, PDFRawStream]>;

  deps.onProgress?.(10, 'Inspecting embedded PDF streams');

  for (let idx = 0; idx < imageEntries.length; idx++) {
    const [ref, stream] = imageEntries[idx];

    if (maskRefs.has(ref)) {
      imagesSkipped++;
      continue;
    }

    const width = stream.dict.lookupMaybe(PDFName.of('Width'), PDFNumber)?.asNumber() ?? 0;
    const height = stream.dict.lookupMaybe(PDFName.of('Height'), PDFNumber)?.asNumber() ?? 0;

    if (width <= 0 || height <= 0 || (width < 64 && height < 64)) {
      imagesSkipped++;
      continue;
    }

    const filterName = resolveSinglePdfName(stream.dict.get(PDFName.of('Filter')));
    const colorSpaceObj = stream.dict.get(PDFName.of('ColorSpace'));

    if (filterName !== 'DCTDecode' || !isSupportedColorSpace(colorSpaceObj)) {
      imagesSkipped++;
      continue;
    }

    const target = computeTargetDimensions(width, height, options.maxImageDimensionPx);
    let optimizedBytes: Uint8Array | null = null;
    try {
      optimizedBytes = await reencode({
        bytes: stream.contents,
        mimeType: 'image/jpeg',
        width,
        height,
        targetWidth: target.width,
        targetHeight: target.height,
        quality: options.jpegQuality,
        grayscale: options.convertToGrayscale,
      });
    } catch {
      optimizedBytes = null;
    }

    if (!optimizedBytes || optimizedBytes.byteLength >= stream.contents.byteLength) {
      imagesSkipped++;
    } else {
      const nextDict: PDFDict = stream.dict.clone(pdfDoc.context);
      nextDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
      nextDict.set(PDFName.of('Width'), PDFNumber.of(target.width));
      nextDict.set(PDFName.of('Height'), PDFNumber.of(target.height));
      nextDict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
      nextDict.set(
        PDFName.of('ColorSpace'),
        PDFName.of(options.convertToGrayscale ? 'DeviceGray' : 'DeviceRGB')
      );
      nextDict.set(PDFName.of('Length'), PDFNumber.of(optimizedBytes.byteLength));
      nextDict.delete(PDFName.of('DecodeParms'));

      const replacement = PDFRawStream.of(nextDict, optimizedBytes);
      pdfDoc.context.assign(ref, replacement);
      imagesOptimized++;
    }

    const pct = 10 + Math.round(((idx + 1) / Math.max(1, imageEntries.length)) * 75);
    deps.onProgress?.(pct, `Optimizing image ${idx + 1} of ${imageEntries.length}`);
  }

  stripDocumentMetadataAndThumbs(pdfDoc, options);
  deps.onProgress?.(90, 'Compacting PDF object streams');

  const savedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const usedOriginalFallback = savedBytes.byteLength >= input.bytes.byteLength;
  const finalBytes = usedOriginalFallback ? input.bytes : savedBytes;
  const outputFileName = buildCompressedFileName(input.fileName);
  const blobBytes = new Uint8Array(finalBytes.byteLength);
  blobBytes.set(finalBytes);
  const blob = new Blob([blobBytes], { type: 'application/pdf' });

  deps.onProgress?.(100, 'Complete');
  const durationMs = Math.max(0, Math.round(performance.now() - startedAt));

  const fileResult: PdfCompressorFileResult = {
    fileName: input.fileName,
    outputFileName,
    blob,
    bytes: finalBytes,
    metrics: buildMetrics(
      input.bytes.byteLength,
      finalBytes.byteLength,
      pageCount,
      imagesOptimized,
      imagesSkipped,
      usedOriginalFallback,
      durationMs
    ),
  };

  return {
    success: true,
    files: [fileResult],
  };
}

export async function compressBatchPdfs(
  inputs: PdfCompressorFileInput[],
  options: PdfCompressorOptions,
  deps: PdfCompressorDeps = {}
): Promise<PdfCompressorResult> {
  if (!validateOptions(options)) {
    return {
      success: false,
      files: [],
      errorCode: 'INVALID_OPTIONS',
      error: 'Invalid PDF compression options supplied.',
    };
  }

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return {
      success: false,
      files: [],
      errorCode: 'INVALID_INPUT',
      error: 'Please provide at least one PDF file to compress.',
    };
  }

  const results: PdfCompressorFileResult[] = [];
  const usedNames = new Set<string>();
  const total = inputs.length;

  for (let i = 0; i < total; i++) {
    const item = inputs[i];
    const basePct = Math.round((i / total) * 90);
    const spanPct = Math.max(1, Math.round(90 / total));

    const singleRes = await compressSinglePdf(item, options, {
      reencodeImage: deps.reencodeImage,
      rasterizePages: deps.rasterizePages,
      onProgress: (subPct, stage) => {
        const mapped = Math.min(90, basePct + Math.round((subPct / 100) * spanPct));
        deps.onProgress?.(mapped, `${item.fileName}: ${stage}`);
      },
    });

    if (!singleRes.success || singleRes.files.length === 0) {
      return {
        success: false,
        files: [],
        errorCode: singleRes.errorCode ?? 'CORRUPT_PDF',
        error: `${item.fileName}: ${singleRes.error || 'Compression failed'}`,
      };
    }

    const fileRes = singleRes.files[0];
    const uniqueName = deduplicateFileName(fileRes.outputFileName, usedNames);
    results.push({
      ...fileRes,
      outputFileName: uniqueName,
    });
  }

  if (results.length === 1) {
    deps.onProgress?.(100, 'Complete');
    return {
      success: true,
      files: results,
    };
  }

  deps.onProgress?.(95, 'Creating ZIP archive');
  const zip = new JSZip();
  for (const res of results) {
    zip.file(res.outputFileName, res.bytes);
  }
  const bundleZipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });
  deps.onProgress?.(100, 'Complete');

  return {
    success: true,
    files: results,
    bundleZipBlob,
    bundleZipFileName: 'privknife-compressed-pdfs.zip',
  };
}
