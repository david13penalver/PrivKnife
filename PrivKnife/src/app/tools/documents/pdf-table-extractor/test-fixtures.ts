import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PdfTableExtractorOptions } from './types';

export const DEFAULT_TABLE_EXTRACTOR_OPTIONS: PdfTableExtractorOptions = {
  pageRange: 'all',
  rowToleranceFactor: 0.45,
  minColumnGapPt: 10,
  firstRowAsHeader: true,
  mergeAllPages: true,
  stripRepeatedHeaders: true,
  detectNumericTypes: true,
  decimalSeparator: '.',
  sanitizeCsvFormulas: true,
};

export async function createTwoPageLedgerPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page1 = doc.addPage([595, 842]);
  const page2 = doc.addPage([595, 842]);

  const drawRow = (
    page: any,
    y: number,
    cols: [string, string, string, string],
    isHeader = false
  ) => {
    const f = isHeader ? bold : font;
    const xs = [48, 170, 370, 460];
    cols.forEach((val, idx) => {
      page.drawText(val, {
        x: xs[idx],
        y,
        size: 11,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
  };

  drawRow(page1, 760, ['Date', 'Description', 'Qty', 'Amount'], true);
  drawRow(page1, 735, ['2026-01-10', 'Cloud Server Rack', '2', '$1,250.00']);
  drawRow(page1, 710, ['2026-01-12', 'Credit Memo', '1', '-145.20']);
  drawRow(page1, 685, ['2026-01-14', 'Discount Rebate', '1', '(50.00)']);

  // Repeated header row on page 2
  drawRow(page2, 760, ['Date', 'Description', 'Qty', 'Amount'], true);
  drawRow(page2, 735, ['2026-01-20', 'Hardware Support', '3', '$300.00']);
  drawRow(page2, 710, ['2026-01-22', 'Security Audit', '1', '$950.50']);

  return new Uint8Array(await doc.save());
}

export async function createScannedBlankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const p = doc.addPage([595, 842]);
  p.drawRectangle({
    x: 40,
    y: 40,
    width: 515,
    height: 762,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2,
  });
  return new Uint8Array(await doc.save());
}

export async function createFormulaInjectionPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([595, 842]);

  const rows: Array<[string, string, string]> = [
    ['Account', 'Payload', 'Balance'],
    ['ACC-01', '=HYPERLINK("http://evil","Click")', '-145.20'],
    ['ACC-02', "+cmd|' /C calc'!A0", '250.00'],
  ];

  let y = 760;
  for (const [c0, c1, c2] of rows) {
    p.drawText(c0, { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
    p.drawText(c1, { x: 180, y, size: 11, font, color: rgb(0, 0, 0) });
    p.drawText(c2, { x: 450, y, size: 11, font, color: rgb(0, 0, 0) });
    y -= 25;
  }

  return new Uint8Array(await doc.save());
}

export function createCorruptPdfBytes(): Uint8Array {
  const s = '%PDF-1.7\n%corrupted table stream\n';
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
