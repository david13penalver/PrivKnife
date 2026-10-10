import { degrees, PDFDocument } from 'pdf-lib';
import { DocumentPage, LoadedPdfDocument, RotationAngle } from './types';

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
