import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfProtectOptions } from './types';

export const DEFAULT_PROTECT_OPTIONS: PdfProtectOptions = {
  userPassword: '',
  ownerPassword: '',
  keyLength: 256,
  allowPrint: 'full',
  allowModify: 'none',
  allowExtractText: false,
  allowAccessibility: true,
};

export async function createSyntheticPdf(pageCount = 2): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < Math.max(1, pageCount); i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Confidential Financial Record - Page ${i + 1}`, {
      x: 50,
      y: 780,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.15),
    });
  }

  return pdfDoc.save({ useObjectStreams: false });
}

export function createCorruptPdfBytes(): Uint8Array {
  return Uint8Array.from(
    '%PDF-1.7\n%%CORRUPTED_TRUNCATED_GARBAGE',
    (c) => c.charCodeAt(0)
  );
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
