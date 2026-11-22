import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { openOffscreenPdf } from '../../../core/pdf/offscreen-pdf';
import {
  PageRedaction,
  RedactionDocument,
  RedactionPageInfo,
  SanitizationOptions,
} from './types';

// Configure PDF.js worker in browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Load and inspect a PDF file for redactions.
 */
export async function loadPdfForRedaction(
  buffer: ArrayBuffer,
  fileName: string
): Promise<RedactionDocument> {
  const docId = `redact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const pages: RedactionPageInfo[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const crop = page.getCropBox();
    const rotated = Math.abs(page.getRotation().angle % 180) === 90;
    const width = rotated ? crop.height : crop.width;
    const height = rotated ? crop.width : crop.height;
    pages.push({
      pageIndex: i,
      displayNumber: i + 1,
      width,
      height,
    });
  }

  return {
    id: docId,
    name: fileName,
    pageCount,
    pages,
    buffer,
  };
}

/**
 * Render a single PDF page into a visual data URL preview using PDF.js.
 * Returns undefined if canvas 2D rendering is unsupported in the current environment.
 */
export async function renderPagePreview(
  buffer: ArrayBuffer,
  pageIndex: number,
  targetWidth = 600
): Promise<{ url: string; width: number; height: number } | undefined> {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer.slice(0)),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
  try {
    const pdfDoc = await loadingTask.promise;
    if (pageIndex < 0 || pageIndex >= pdfDoc.numPages) {
      return undefined;
    }

    const page = await pdfDoc.getPage(pageIndex + 1);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / (unscaledViewport.width || targetWidth);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }

    await page.render({
      canvas,
      canvasContext: ctx,
      viewport,
    }).promise;

    const url = canvas.toDataURL('image/png');
    return url.startsWith('data:image/png,') || url.startsWith('data:image/png;')
      ? { url, width: unscaledViewport.width, height: unscaledViewport.height }
      : undefined;
  } catch {
    return undefined;
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Flatten PDF pages into pure high-density raster imagery with redactions permanently burned in.
 * Eliminates all underlying vector text layers, bookmarks, annotations, and form streams.
 */
export async function flattenPdfPages(
  buffer: ArrayBuffer,
  redactions: PageRedaction[],
  options?: SanitizationOptions
): Promise<Uint8Array> {
  const task = openOffscreenPdf(buffer);
  try {
    const source = await task.promise;
    const output = await PDFDocument.create();
    const boxesByPage = new Map<number, PageRedaction['boxes']>();
    for (const { pageIndex, boxes } of redactions) {
      if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= source.numPages) {
        throw new Error('A redaction refers to a page outside the document.');
      }
      const pageBoxes = boxesByPage.get(pageIndex) ?? [];
      pageBoxes.push(...boxes);
      boxesByPage.set(pageIndex, pageBoxes);
    }

    for (let index = 0; index < source.numPages; index++) {
      const page = await source.getPage(index + 1);
      const native = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 2 });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      if (width * height > 32_000_000) throw new Error('The rendered PDF page is too large.');
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PDF canvas rendering is unavailable.');

      try {
        await page.render({
          canvas: null,
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
          annotationMode: pdfjsLib.AnnotationMode.DISABLE,
          background: '#ffffff',
        }).promise;
        for (const box of boxesByPage.get(index) ?? []) {
          if (![box.x, box.y, box.width, box.height].every(Number.isFinite) ||
              box.width <= 0 || box.height <= 0 ||
              (box.color !== 'black' && box.color !== 'white')) {
            throw new Error('A redaction has invalid bounds.');
          }
          const left = Math.floor(box.x * viewport.scale);
          const right = Math.ceil((box.x + box.width) * viewport.scale);
          const top = Math.floor((native.height - box.y - box.height) * viewport.scale);
          const bottom = Math.ceil((native.height - box.y) * viewport.scale);
          context.fillStyle = box.color === 'white' ? '#ffffff' : '#000000';
          context.fillRect(left, top, right - left, bottom - top);
        }
        const raster = await canvas.convertToBlob({ type: 'image/png' });
        const image = await output.embedPng(await raster.arrayBuffer());
        output.addPage([native.width, native.height]).drawImage(image, {
          x: 0,
          y: 0,
          width: native.width,
          height: native.height,
        });
      } finally {
        canvas.width = canvas.height = 0;
        page.cleanup();
      }
    }

    if (options?.stripMetadata !== false) {
      output.setTitle('');
      output.setAuthor('');
      output.setSubject('');
      output.setKeywords([]);
      output.setProducer('');
      output.setCreator('');
    }
    return await output.save();
  } finally {
    await task.destroy();
  }
}

export async function sanitizePdf(
  buffer: ArrayBuffer,
  redactions: PageRedaction[],
  options?: SanitizationOptions,
): Promise<Uint8Array> {
  if (options?.flattenRaster === false) {
    throw new Error('Sanitized PDF export requires raster flattening.');
  }
  return flattenPdfPages(buffer, redactions, options);
}
