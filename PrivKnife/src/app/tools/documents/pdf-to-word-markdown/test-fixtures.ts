import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfToWordMarkdownOptions } from './types';

export const DEFAULT_PDF_TO_WORD_OPTIONS: PdfToWordMarkdownOptions = {
  pageRange: 'all',
  detectMultiColumn: true,
  stripHeadersFooters: true,
  dehyphenateWords: true,
  preserveInlineStyles: true,
  includePageBreaks: false,
};

export async function createStructuredSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([595, 842]);

  page.drawText('Annual Privacy Architecture Report', {
    x: 48,
    y: 770,
    size: 24,
    font: bold,
    color: rgb(0.1, 0.1, 0.15),
  });

  page.drawText('Executive Summary', {
    x: 48,
    y: 735,
    size: 14,
    font: bold,
    color: rgb(0.15, 0.2, 0.3),
  });

  page.drawText('Zero-knowledge systems guarantee that confidential docu-', {
    x: 48,
    y: 708,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('ments remain solely on the user device.', {
    x: 48,
    y: 694,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('- End-to-end local browser execution', {
    x: 56,
    y: 664,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('- Zero telemetry or analytics', {
    x: 56,
    y: 648,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('1. Verify client-side containment', {
    x: 56,
    y: 620,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Payload: A & B < C > "D" <img src=x onerror=alert(1)>', {
    x: 48,
    y: 588,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  return new Uint8Array(await doc.save());
}

export async function createThreePageRunningHeaderPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 3; i++) {
    const p = doc.addPage([595, 842]);
    // Top running header (< 10% from top, y ~ 812)
    p.drawText('Confidential Draft', {
      x: 48,
      y: 812,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    // Unique body content
    p.drawText(`Chapter ${i} Body Content Section`, {
      x: 48,
      y: 680,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    // Bottom running footer (y ~ 28)
    p.drawText(`Page ${i} of 3`, {
      x: 48,
      y: 28,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return new Uint8Array(await doc.save());
}

export async function createScannedBlankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const p = doc.addPage([595, 842]);
  p.drawRectangle({
    x: 50,
    y: 50,
    width: 495,
    height: 742,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2,
  });
  return new Uint8Array(await doc.save());
}

export function createCorruptPdfBytes(): Uint8Array {
  const s = '%PDF-1.7\n%corrupt truncated word-md input\n';
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
