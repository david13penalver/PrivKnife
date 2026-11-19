import JSZip from 'jszip';
import { degrees, EncryptedPDFError, PDFDocument, PDFImage } from 'pdf-lib';
import {
  ImageNormalizerFn,
  ImagePageInput,
  ImagesToPdfOptions,
  NormalizedImageAsset,
  OutputImageFormat,
  PageSizePreset,
  PdfImageConverterDeps,
  PdfImageConverterResult,
  PdfPageImageRendererFn,
  PdfToImagesOptions,
  RenderedPageAsset,
  ScanFilterPreset,
} from './types';

export const PAPER_DIMENSIONS_PT: Record<
  Exclude<PageSizePreset, 'fit_to_image'>,
  { width: number; height: number }
> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
};

export function computeRenderDimensions(
  widthPt: number,
  heightPt: number,
  dpi: number,
  maxEdgePx = 8192
): { width: number; height: number; scale: number; wasClamped: boolean } {
  const safeW = Number.isFinite(widthPt) && widthPt > 0 ? widthPt : 1;
  const safeH = Number.isFinite(heightPt) && heightPt > 0 ? heightPt : 1;
  const safeDpi = Number.isFinite(dpi) && dpi > 0 ? dpi : 72;
  const safeMax = Number.isFinite(maxEdgePx) && maxEdgePx >= 64 ? maxEdgePx : 8192;

  const rawScale = safeDpi / 72;
  const rawW = Math.round(safeW * rawScale);
  const rawH = Math.round(safeH * rawScale);
  const maxRaw = Math.max(rawW, rawH);

  if (maxRaw > safeMax) {
    const clampedScale = safeMax / Math.max(safeW, safeH);
    return {
      width: Math.max(1, Math.round(safeW * clampedScale)),
      height: Math.max(1, Math.round(safeH * clampedScale)),
      scale: clampedScale,
      wasClamped: true,
    };
  }

  return {
    width: Math.max(1, rawW),
    height: Math.max(1, rawH),
    scale: rawScale,
    wasClamped: false,
  };
}

export interface ComputedPageLayout {
  pageWidth: number;
  pageHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

export function computePdfPageLayout(
  imgWidthPx: number,
  imgHeightPx: number,
  rotationDeg: 0 | 90 | 180 | 270,
  options: ImagesToPdfOptions
): ComputedPageLayout {
  const swap = rotationDeg === 90 || rotationDeg === 270;
  const effW = Math.max(1, swap ? imgHeightPx : imgWidthPx);
  const effH = Math.max(1, swap ? imgWidthPx : imgHeightPx);

  const safeMargin = Math.max(0, Number.isFinite(options.marginPt) ? options.marginPt : 0);

  let pageWidth: number;
  let pageHeight: number;

  if (options.pageSize === 'fit_to_image') {
    const ptW = effW * 0.75;
    const ptH = effH * 0.75;
    pageWidth = ptW + safeMargin * 2;
    pageHeight = ptH + safeMargin * 2;
    return {
      pageWidth,
      pageHeight,
      drawX: safeMargin,
      drawY: safeMargin,
      drawWidth: ptW,
      drawHeight: ptH,
    };
  }

  const base = PAPER_DIMENSIONS_PT[options.pageSize];
  const isLandscape =
    options.orientation === 'landscape' ||
    (options.orientation === 'auto' && effW > effH);

  pageWidth = isLandscape ? base.height : base.width;
  pageHeight = isLandscape ? base.width : base.height;

  const clampedMargin = Math.min(
    safeMargin,
    Math.max(0, Math.min(pageWidth, pageHeight) / 2 - 10)
  );
  const boxW = Math.max(20, pageWidth - clampedMargin * 2);
  const boxH = Math.max(20, pageHeight - clampedMargin * 2);

  const scale = Math.min(boxW / effW, boxH / effH);
  const drawWidth = effW * scale;
  const drawHeight = effH * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;

  return {
    pageWidth,
    pageHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}

function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
}

export function applyScanFilterToRgba(
  rgba: Uint8ClampedArray,
  filter: ScanFilterPreset
): void {
  if (filter === 'none') return;

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    if (filter === 'bw_document') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let boosted: number;
      if (lum >= 195) {
        boosted = 255;
      } else if (lum <= 80) {
        boosted = Math.max(0, lum * 0.72);
      } else {
        boosted = ((lum - 80) / 115) * 255;
      }
      const c = clampByte(boosted);
      rgba[i] = c;
      rgba[i + 1] = c;
      rgba[i + 2] = c;
    } else if (filter === 'enhanced_color') {
      const contrast = 1.28;
      const lift = 10;
      rgba[i] = clampByte((r - 128) * contrast + 128 + lift);
      rgba[i + 1] = clampByte((g - 128) * contrast + 128 + lift);
      rgba[i + 2] = clampByte((b - 128) * contrast + 128 + lift);
    }
  }
}

export function validatePdfToImagesOptions(
  options: PdfToImagesOptions | null | undefined
): boolean {
  if (!options || typeof options !== 'object') return false;
  if (
    options.format !== 'image/png' &&
    options.format !== 'image/jpeg' &&
    options.format !== 'image/webp'
  ) {
    return false;
  }
  if (!Number.isFinite(options.dpi) || options.dpi < 72 || options.dpi > 300) {
    return false;
  }
  if (
    !Number.isFinite(options.quality) ||
    options.quality < 0.5 ||
    options.quality > 1.0
  ) {
    return false;
  }
  if (!Array.isArray(options.selectedPages) || options.selectedPages.length === 0) {
    return false;
  }
  return options.selectedPages.every((n) => Number.isInteger(n) && n >= 1);
}

export function validateImagesToPdfOptions(
  options: ImagesToPdfOptions | null | undefined
): boolean {
  if (!options || typeof options !== 'object') return false;
  const sizes: PageSizePreset[] = ['fit_to_image', 'a4', 'letter', 'legal'];
  if (!sizes.includes(options.pageSize)) return false;
  if (
    options.orientation !== 'auto' &&
    options.orientation !== 'portrait' &&
    options.orientation !== 'landscape'
  ) {
    return false;
  }
  if (
    !Number.isFinite(options.marginPt) ||
    options.marginPt < 0 ||
    options.marginPt > 144
  ) {
    return false;
  }
  if (
    !Number.isFinite(options.jpegQuality) ||
    options.jpegQuality < 0.5 ||
    options.jpegQuality > 1.0
  ) {
    return false;
  }
  return true;
}

function sanitizeBaseName(name: string, fallback: string): string {
  const base = String(name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();
  if (!base) return fallback;
  return base.replace(/\.pdf$/i, '').trim() || fallback;
}

export function buildImageOutputFileName(
  pdfName: string,
  pageNumber: number,
  totalPages: number,
  format: OutputImageFormat
): string {
  const stem = sanitizeBaseName(pdfName, 'document');
  const digits = Math.max(2, String(Math.max(1, totalPages)).length);
  const padded = String(Math.max(1, pageNumber)).padStart(digits, '0');
  const ext =
    format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  return `${stem}-page-${padded}.${ext}`;
}

export function buildPdfOutputFileName(outputName: string): string {
  const stem = sanitizeBaseName(outputName, 'images-compiled');
  return `${stem}.pdf`;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function isPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isJpegSignature(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function createCanvasElement(
  width: number,
  height: number
): OffscreenCanvas | HTMLCanvasElement | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const el = document.createElement('canvas');
    el.width = width;
    el.height = height;
    return el;
  }
  return null;
}

async function canvasToBytes(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Uint8Array | null> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    return new Uint8Array(await blob.arrayBuffer());
  }
  if (typeof HTMLCanvasElement !== 'undefined' && canvas instanceof HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    );
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  }
  return null;
}

export const defaultBrowserPageRenderer: PdfPageImageRendererFn = async (
  pdfBytes,
  pageNumbers,
  options,
  hooks
): Promise<RenderedPageAsset[]> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const assets: RenderedPageAsset[] = [];
  try {
    const doc = await loadingTask.promise;

    for (let i = 0; i < pageNumbers.length; i++) {
      if (hooks?.signal?.aborted) {
        throw new DOMException('Cancelled by user', 'AbortError');
      }

      const pageNum = pageNumbers[i];
      const page = await doc.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1 });
      const dims = computeRenderDimensions(
        baseVp.width,
        baseVp.height,
        options.dpi,
        8192
      );
      const viewport = page.getViewport({ scale: dims.scale });

      const canvas = createCanvasElement(dims.width, dims.height);
      if (!canvas) {
        throw new Error('Canvas 2D context is unavailable.');
      }

      try {
        const ctx = canvas.getContext('2d') as
          | OffscreenCanvasRenderingContext2D
          | CanvasRenderingContext2D
          | null;
        if (!ctx) {
          throw new Error('Unable to acquire 2D canvas context.');
        }

        if (options.format === 'image/jpeg' || !options.transparentBackground) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, dims.width, dims.height);
        }

        await page.render({
          canvas: canvas as any,
          canvasContext: ctx as any,
          viewport,
        }).promise;

        let encoded = await canvasToBytes(canvas, options.format, options.quality);
        let actualMime: OutputImageFormat = options.format;
        if (!encoded && options.format === 'image/webp') {
          actualMime = 'image/png';
          encoded = await canvasToBytes(canvas, 'image/png', 1);
        }
        if (!encoded) {
          throw new Error(`Failed to encode page ${pageNum} as ${options.format}`);
        }

        assets.push({
          pageNumber: pageNum,
          bytes: encoded,
          mimeType: actualMime,
          wasClamped: dims.wasClamped,
        });
        hooks?.onProgress?.(i + 1, pageNumbers.length);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return assets;
};

export const defaultBrowserImageNormalizer: ImageNormalizerFn = async (
  input: ImagePageInput,
  jpegQuality: number
): Promise<NormalizedImageAsset> => {
  const bytes = new Uint8Array(input.bytes);
  const isPng = isPngSignature(bytes);
  const isJpeg = isJpegSignature(bytes);

  const canUseBitmap =
    typeof createImageBitmap === 'function' &&
    (typeof OffscreenCanvas !== 'undefined' || typeof document !== 'undefined');

  if (
    !canUseBitmap ||
    (input.scanFilter === 'none' && input.rotationDeg === 0 && (isPng || isJpeg))
  ) {
    if (!isPng && !isJpeg) {
      throw new Error(`Unsupported or corrupt image format in ${input.fileName}.`);
    }
    return {
      bytes,
      format: isPng ? 'png' : 'jpeg',
      widthPx: 0,
      heightPx: 0,
      appliedRotation: false,
    };
  }

  let bitmap: ImageBitmap | null = null;
  let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  try {
    const blob = new Blob([bytes], { type: input.mimeType || 'image/png' });
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });

    const swap = input.rotationDeg === 90 || input.rotationDeg === 270;
    const outW = Math.max(1, swap ? bitmap.height : bitmap.width);
    const outH = Math.max(1, swap ? bitmap.width : bitmap.height);

    canvas = createCanvasElement(outW, outH);
    if (!canvas) {
      throw new Error('Canvas unavailable for image normalization.');
    }

    const ctx = canvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((input.rotationDeg * Math.PI) / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    ctx.restore();

    if (input.scanFilter !== 'none') {
      const imgData = ctx.getImageData(0, 0, outW, outH);
      applyScanFilterToRgba(imgData.data, input.scanFilter);
      ctx.putImageData(imgData, 0, 0);
    }

    const usePng = isPng && input.scanFilter === 'none';
    const outBytes = await canvasToBytes(
      canvas,
      usePng ? 'image/png' : 'image/jpeg',
      jpegQuality
    );
    if (!outBytes) {
      throw new Error(`Failed to encode normalized image ${input.fileName}.`);
    }

    return {
      bytes: outBytes,
      format: usePng ? 'png' : 'jpeg',
      widthPx: outW,
      heightPx: outH,
      appliedRotation: true,
    };
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};

export async function convertPdfToImages(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfToImagesOptions,
  deps: PdfImageConverterDeps = {}
): Promise<PdfImageConverterResult> {
  if (!validatePdfToImagesOptions(options)) {
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options?.format ?? 'image/png',
      itemCount: 0,
      warnings: [],
      errorCode: 'INVALID_OPTIONS',
      error: 'Invalid PDF-to-Images export options.',
    };
  }

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'CORRUPT_PDF',
      error: 'Selected file does not have a valid %PDF- signature.',
    };
  }

  const normalizedPdf = new Uint8Array(pdfBytes);
  let totalPages: number;
  try {
    const doc = await PDFDocument.load(normalizedPdf, {
      updateMetadata: false,
      ignoreEncryption: false,
    });
    totalPages = doc.getPageCount();
    if (!Number.isFinite(totalPages) || totalPages <= 0) {
      return {
        success: false,
        fileName: 'export.png',
        fileSize: 0,
        mimeType: options.format,
        itemCount: 0,
        warnings: [],
        errorCode: 'CORRUPT_PDF',
        error: 'The PDF contains no pages.',
      };
    }
  } catch (err: unknown) {
    if (
      err instanceof EncryptedPDFError ||
      (err instanceof Error && /encrypted/i.test(err.message))
    ) {
      return {
        success: false,
        fileName: 'export.png',
        fileSize: 0,
        mimeType: options.format,
        itemCount: 0,
        warnings: [],
        errorCode: 'ENCRYPTED_PDF',
        error: 'PDF is encrypted. Unlock it before converting to images.',
      };
    }
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'CORRUPT_PDF',
      error: err instanceof Error ? err.message : 'Unable to parse PDF.',
    };
  }

  const uniquePages = Array.from(new Set(options.selectedPages)).sort((a, b) => a - b);
  if (uniquePages.some((p) => p < 1 || p > totalPages)) {
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'INVALID_RANGE',
      error: `Selected page numbers must be between 1 and ${totalPages}.`,
    };
  }

  if (deps.signal?.aborted) {
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'CANCELLED',
      error: 'Conversion cancelled.',
    };
  }

  const renderer = deps.renderPages ?? defaultBrowserPageRenderer;
  deps.onProgress?.(10, 'Rendering PDF pages');

  let rendered: RenderedPageAsset[];
  try {
    rendered = await renderer(normalizedPdf, uniquePages, options, {
      signal: deps.signal,
      onProgress: (done, total) => {
        const pct = 10 + Math.round((done / Math.max(1, total)) * 75);
        deps.onProgress?.(pct, `Rendered page ${done} of ${total}`);
      },
    });
  } catch (err: unknown) {
    if (
      deps.signal?.aborted ||
      (err instanceof DOMException && err.name === 'AbortError')
    ) {
      return {
        success: false,
        fileName: 'export.png',
        fileSize: 0,
        mimeType: options.format,
        itemCount: 0,
        warnings: [],
        errorCode: 'CANCELLED',
        error: 'Conversion cancelled.',
      };
    }
    return {
      success: false,
      fileName: 'export.png',
      fileSize: 0,
      mimeType: options.format,
      itemCount: 0,
      warnings: [],
      errorCode: 'CORRUPT_PDF',
      error: err instanceof Error ? err.message : 'Failed to render PDF pages.',
    };
  }

  const warnings: string[] = [];
  if (rendered.some((r) => r.wasClamped)) {
    warnings.push(
      'One or more oversized pages were clamped to 8192px maximum edge for browser safety.'
    );
  }

  if (rendered.length === 1) {
    const item = rendered[0];
    const outName = buildImageOutputFileName(
      fileName,
      item.pageNumber,
      totalPages,
      item.mimeType
    );
    const copy = new Uint8Array(item.bytes);
    const blob = new Blob([copy], { type: item.mimeType });
    deps.onProgress?.(100, 'Complete');
    return {
      success: true,
      blob,
      bytes: copy,
      fileName: outName,
      fileSize: copy.byteLength,
      mimeType: item.mimeType,
      itemCount: 1,
      warnings,
    };
  }

  deps.onProgress?.(90, 'Packaging ZIP archive');
  const zip = new JSZip();
  for (const item of rendered) {
    const entryName = buildImageOutputFileName(
      fileName,
      item.pageNumber,
      totalPages,
      item.mimeType
    );
    zip.file(entryName, item.bytes);
  }

  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'STORE',
  });
  const zipCopy = new Uint8Array(zipBytes);
  const zipBlob = new Blob([zipCopy], { type: 'application/zip' });
  const zipName = `${sanitizeBaseName(fileName, 'document')}-images.zip`;

  deps.onProgress?.(100, 'Complete');
  return {
    success: true,
    blob: zipBlob,
    bytes: zipCopy,
    fileName: zipName,
    fileSize: zipCopy.byteLength,
    mimeType: 'application/zip',
    itemCount: rendered.length,
    warnings,
  };
}

export async function convertImagesToPdf(
  images: ImagePageInput[],
  options: ImagesToPdfOptions,
  deps: PdfImageConverterDeps = {}
): Promise<PdfImageConverterResult> {
  const outName = buildPdfOutputFileName(options?.outputFileName ?? '');

  if (!validateImagesToPdfOptions(options)) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      mimeType: 'application/pdf',
      itemCount: 0,
      warnings: [],
      errorCode: 'INVALID_OPTIONS',
      error: 'Invalid Images-to-PDF layout options.',
    };
  }

  if (!Array.isArray(images) || images.length === 0) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      mimeType: 'application/pdf',
      itemCount: 0,
      warnings: [],
      errorCode: 'INVALID_INPUT',
      error: 'Please add at least one image to compile into a PDF.',
    };
  }

  const normalize = deps.normalizeImage ?? defaultBrowserImageNormalizer;
  const pdfDoc = await PDFDocument.create();
  const total = images.length;

  for (let i = 0; i < total; i++) {
    if (deps.signal?.aborted) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        mimeType: 'application/pdf',
        itemCount: 0,
        warnings: [],
        errorCode: 'CANCELLED',
        error: 'PDF compilation cancelled.',
      };
    }

    const item = images[i];
    if (!item?.bytes || item.bytes.byteLength === 0) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        mimeType: 'application/pdf',
        itemCount: 0,
        warnings: [],
        errorCode: 'INVALID_IMAGE',
        error: `${item?.fileName || 'Image'} has empty bytes.`,
      };
    }

    let normalized: NormalizedImageAsset;
    let embedded: PDFImage;
    try {
      normalized = await normalize(item, options.jpegQuality);
      const copy = new Uint8Array(normalized.bytes);
      embedded =
        normalized.format === 'png'
          ? await pdfDoc.embedPng(copy)
          : await pdfDoc.embedJpg(copy);
    } catch (err: unknown) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        mimeType: 'application/pdf',
        itemCount: 0,
        warnings: [],
        errorCode: 'INVALID_IMAGE',
        error: `${item.fileName}: ${
          err instanceof Error ? err.message : 'Unable to decode image.'
        }`,
      };
    }

    const pxW = normalized.widthPx > 0 ? normalized.widthPx : embedded.width;
    const pxH = normalized.heightPx > 0 ? normalized.heightPx : embedded.height;
    const effectiveRot: 0 | 90 | 180 | 270 = normalized.appliedRotation
      ? 0
      : item.rotationDeg;

    const layout = computePdfPageLayout(pxW, pxH, effectiveRot, options);
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);

    if (effectiveRot === 0) {
      page.drawImage(embedded, {
        x: layout.drawX,
        y: layout.drawY,
        width: layout.drawWidth,
        height: layout.drawHeight,
      });
    } else if (effectiveRot === 90) {
      page.drawImage(embedded, {
        x: layout.drawX,
        y: layout.drawY + layout.drawHeight,
        width: layout.drawHeight,
        height: layout.drawWidth,
        rotate: degrees(-90),
      });
    } else if (effectiveRot === 180) {
      page.drawImage(embedded, {
        x: layout.drawX + layout.drawWidth,
        y: layout.drawY + layout.drawHeight,
        width: layout.drawWidth,
        height: layout.drawHeight,
        rotate: degrees(-180),
      });
    } else {
      page.drawImage(embedded, {
        x: layout.drawX + layout.drawWidth,
        y: layout.drawY,
        width: layout.drawHeight,
        height: layout.drawWidth,
        rotate: degrees(90),
      });
    }

    const pct = 10 + Math.round(((i + 1) / total) * 80);
    deps.onProgress?.(pct, `Added image ${i + 1} of ${total}`);
  }

  deps.onProgress?.(95, 'Finalizing PDF document');
  const savedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  const copy = new Uint8Array(savedBytes);
  const blob = new Blob([copy], { type: 'application/pdf' });

  deps.onProgress?.(100, 'Complete');
  return {
    success: true,
    blob,
    bytes: copy,
    fileName: outName,
    fileSize: copy.byteLength,
    mimeType: 'application/pdf',
    itemCount: total,
    warnings: [],
  };
}
