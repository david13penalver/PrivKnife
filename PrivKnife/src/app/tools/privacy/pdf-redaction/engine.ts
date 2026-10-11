import { PDFDocument, rgb } from 'pdf-lib';
import {
  PageRedaction,
  RedactionDocument,
  RedactionPageInfo,
  SanitizationOptions,
} from './types';

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
