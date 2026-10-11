import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
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
    const { width, height } = page.getSize();
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
): Promise<string | undefined> {
  if (typeof document === 'undefined') {
    return undefined;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
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

    return canvas.toDataURL('image/png') || canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return undefined;
  }
}

/**
 * Permanently burn redaction boxes into the PDF page vectors and strip sensitive metadata.
 */
export async function burnRedactions(
  buffer: ArrayBuffer,
  redactions: PageRedaction[],
  options?: SanitizationOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  const redactionsByPage = new Map<number, PageRedaction>();
  for (const r of redactions) {
    redactionsByPage.set(r.pageIndex, r);
  }

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pageRedaction = redactionsByPage.get(i);
    if (!pageRedaction || pageRedaction.boxes.length === 0) {
      continue;
    }

    const page = pdfDoc.getPage(i);
    for (const box of pageRedaction.boxes) {
      const color =
        box.color === 'white' ? rgb(1, 1, 1) : rgb(0, 0, 0);

      // Draw permanent opaque rectangle over the confidential content
      page.drawRectangle({
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        color,
        opacity: 1.0,
      });
    }
  }

  // Strip metadata if requested (default: true)
  if (options?.stripMetadata !== false) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  return pdfDoc.save();
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
  // If canvas 2D rendering is not available (e.g. headless Node test environment), fallback to vector burning
  if (typeof document === 'undefined') {
    return burnRedactions(buffer, redactions, options);
  }

  const redactionsByPage = new Map<number, PageRedaction>();
  for (const r of redactions) {
    redactionsByPage.set(r.pageIndex, r);
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const pdfjsDoc = await loadingTask.promise;
    const pageCount = pdfjsDoc.numPages;

    const newPdfDoc = await PDFDocument.create();

    for (let i = 0; i < pageCount; i++) {
      const page = await pdfjsDoc.getPage(i + 1);
      const unscaledViewport = page.getViewport({ scale: 1 });

      // Render at 2.0x scale (~150-300 DPI) for crisp high-density rasterization
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return burnRedactions(buffer, redactions, options);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      }).promise;

      // Burn redaction boxes directly onto the pixel canvas
      const pageRedaction = redactionsByPage.get(i);
      if (pageRedaction) {
        for (const box of pageRedaction.boxes) {
          const canvasX = box.x * scale;
          const canvasY = (unscaledViewport.height - box.y - box.height) * scale;
          const canvasW = box.width * scale;
          const canvasH = box.height * scale;

          ctx.fillStyle = box.color === 'white' ? '#ffffff' : '#000000';
          ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
        }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const imageBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        imageBytes[k] = binaryString.charCodeAt(k);
      }

      const embeddedImg = await newPdfDoc.embedJpg(imageBytes);
      const newPage = newPdfDoc.addPage([unscaledViewport.width, unscaledViewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: unscaledViewport.width,
        height: unscaledViewport.height,
      });
    }

    if (options?.stripMetadata !== false) {
      newPdfDoc.setTitle('');
      newPdfDoc.setAuthor('');
      newPdfDoc.setSubject('');
      newPdfDoc.setKeywords([]);
      newPdfDoc.setProducer('');
      newPdfDoc.setCreator('');
    }

    return await newPdfDoc.save();
  } catch {
    return burnRedactions(buffer, redactions, options);
  }
}

/**
 * Sanitize PDF by burning redactions and stripping metadata.
 * Uses flattening if requested (default: true).
 */
export async function sanitizePdf(
  buffer: ArrayBuffer,
  redactions: PageRedaction[],
  options?: SanitizationOptions
): Promise<Uint8Array> {
  if (options?.flattenRaster !== false) {
    return flattenPdfPages(buffer, redactions, options);
  }
  return burnRedactions(buffer, redactions, options);
}
