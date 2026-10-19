import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  PdfSignerStamperOptions,
  PlacedStamp,
} from './types';

export const DEFAULT_SIGNER_OPTIONS: PdfSignerStamperOptions = {
  signatureInkColor: 'black',
  signaturePenWidth: 2,
  dateFormat: 'YYYY-MM-DD',
  customDateString: '2026-10-19',
  initialsText: 'PK',
  flattenAnnotations: true,
  stamps: [],
};

export const MINIMAL_SIGNER_OPTIONS: PdfSignerStamperOptions = {
  signatureInkColor: 'dark_blue',
  signaturePenWidth: 3,
  dateFormat: 'MMM D, YYYY',
  customDateString: 'Oct 19, 2026',
  initialsText: 'JD',
  flattenAnnotations: false,
  stamps: [],
};

// 1x1 transparent pixel base64 PNG data URL for test signatures
export const DUMMY_SIGNATURE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const SAMPLE_PLACED_STAMPS: PlacedStamp[] = [
  {
    id: 'stamp-1',
    type: 'signature',
    pageIndex: 0,
    x: 100,
    y: 150,
    width: 150,
    height: 50,
    imageDataUrl: DUMMY_SIGNATURE_PNG_DATA_URL,
  },
  {
    id: 'stamp-2',
    type: 'date',
    pageIndex: 0,
    x: 300,
    y: 150,
    width: 100,
    height: 20,
    text: '2026-10-19',
    fontSize: 12,
  },
  {
    id: 'stamp-3',
    type: 'initials',
    pageIndex: 0,
    x: 450,
    y: 150,
    width: 40,
    height: 40,
    text: 'PK',
    fontSize: 14,
  },
];

/**
 * Creates a synthetic single-page test PDF document in memory using pdf-lib.
 */
export async function createSyntheticPdfBytes(
  pageCount: number = 1,
  title: string = 'Test Agreement'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    page.drawText(`${title} - Page ${i + 1}`, {
      x: 50,
      y: 800,
      size: 18,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('Party Signature: __________________   Date: ____________', {
      x: 50,
      y: 150,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  return pdfDoc.save();
}
