import JSZip from 'jszip';
import { degrees, PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentPage, LoadedPdfDocument, RotationAngle, SplitPdfResult } from './types';

// Configure PDF.js worker in browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Load and inspect an uploaded PDF document.
 */
export async function loadPdfDocument(
  buffer: ArrayBuffer,
  fileName: string
): Promise<LoadedPdfDocument> {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const pages: DocumentPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    const existingRotation = (page.getRotation().angle % 360) as RotationAngle;

    pages.push({
      id: `${docId}-page-${i}`,
      documentId: docId,
      documentName: fileName,
      pageIndex: i,
      displayPageNumber: i + 1,
      rotation: existingRotation,
      width,
      height,
      selected: false,
    });
  }

  return {
    id: docId,
    name: fileName,
    size: buffer.byteLength,
    pageCount,
    buffer,
    pages,
  };
}

/**
 * Render a single PDF page into a visual canvas thumbnail (data URL).
 * Returns undefined if canvas 2D rendering is unsupported in the current environment.
 */
export async function renderPageThumbnail(
  buffer: ArrayBuffer,
  pageIndex: number,
  targetWidth = 160
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

    return canvas.toDataURL('image/webp', 0.8) || canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return undefined;
  }
}

/**
 * Rotate a single document page clockwise by 90 degrees.
 */
export function rotatePage(page: DocumentPage): DocumentPage {
  const nextRotation = ((page.rotation + 90) % 360) as RotationAngle;
  return {
    ...page,
    rotation: nextRotation,
  };
}

/**
 * Rotate an array of document pages clockwise by 90 degrees.
 */
export function rotateAllPages(pages: DocumentPage[]): DocumentPage[] {
  return pages.map(rotatePage);
}

/**
 * Compile and assemble pages from multiple source PDF buffers into a single unified PDF.
 */
export async function assemblePdf(
  pages: DocumentPage[],
  sourceDocuments: Map<string, ArrayBuffer>
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  // Cache loaded PDFDocument instances to avoid redundant parsing
  const loadedDocs = new Map<string, PDFDocument>();
  for (const [docId, buffer] of sourceDocuments.entries()) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    loadedDocs.set(docId, doc);
  }

  for (const pageItem of pages) {
    const sourceDoc = loadedDocs.get(pageItem.documentId);
    if (!sourceDoc) {
      continue;
    }

    const [copiedPage] = await mergedPdf.copyPages(sourceDoc, [pageItem.pageIndex]);

    // Apply rotation
    if (pageItem.rotation !== 0) {
      copiedPage.setRotation(degrees(pageItem.rotation));
    }

    mergedPdf.addPage(copiedPage);
  }

  return mergedPdf.save();
}

/**
 * Split document pages into individual single-page PDF files.
 */
export async function splitPdfIntoSinglePages(
  pages: DocumentPage[],
  sourceDocuments: Map<string, ArrayBuffer>
): Promise<SplitPdfResult[]> {
  const results: SplitPdfResult[] = [];
  const loadedDocs = new Map<string, PDFDocument>();

  for (const [docId, buffer] of sourceDocuments.entries()) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    loadedDocs.set(docId, doc);
  }

  for (const pageItem of pages) {
    const sourceDoc = loadedDocs.get(pageItem.documentId);
    if (!sourceDoc) {
      continue;
    }

    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(sourceDoc, [pageItem.pageIndex]);

    if (pageItem.rotation !== 0) {
      copiedPage.setRotation(degrees(pageItem.rotation));
    }

    singleDoc.addPage(copiedPage);
    const bytes = await singleDoc.save();

    const baseName = pageItem.documentName.replace(/\.pdf$/i, '');
    results.push({
      fileName: `${baseName}-p${pageItem.displayPageNumber}.pdf`,
      bytes,
      pageCount: 1,
    });
  }

  return results;
}

/**
 * Bundle multiple split PDF documents into a single .zip archive.
 */
export async function createSplitZip(splitResults: SplitPdfResult[]): Promise<Blob> {
  const zip = new JSZip();
  for (const item of splitResults) {
    zip.file(item.fileName, item.bytes);
  }
  return zip.generateAsync({ type: 'blob' });
}
