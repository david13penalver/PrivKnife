import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PageRgbaFrame, PdfCompareOptions } from './types';

export const DEFAULT_COMPARE_OPTIONS: PdfCompareOptions = {
  viewMode: 'overlay',
  overlayStyle: 'overlay',
  renderScale: 1.0,
  pixelSensitivity: 0.15,
  ignoreWhitespace: true,
  ignoreCase: false,
  pageOffsetB: 0,
  showChangedOnly: false,
};

export async function createTextPagesPdf(
  pageTexts: string[],
  size: [number, number] = [595, 842]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const text of pageTexts) {
    const page = doc.addPage(size);
    const lines = String(text ?? '').split('\n');
    let y = size[1] - 72;
    for (const line of lines) {
      if (line.trim()) {
        page.drawText(line, {
          x: 48,
          y,
          size: 13,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
      y -= 20;
    }
  }

  return new Uint8Array(await doc.save());
}

export async function createContractPdfPair(): Promise<{
  pdfA: Uint8Array;
  pdfB: Uint8Array;
}> {
  const pdfA = await createTextPagesPdf([
    'MASTER SERVICE AGREEMENT\nSection 1: Scope of Work unchanged.',
    'Section 2: Compensation\nTotal Fee: $1,000 USD payable upon milestone delivery.',
    'Section 3: Confidentiality and Governing Law unchanged.',
  ]);
  const pdfB = await createTextPagesPdf([
    'MASTER SERVICE AGREEMENT\nSection 1: Scope of Work unchanged.',
    'Section 2: Compensation\nTotal Fee: $1,500 USD payable upon milestone delivery.',
    'Section 3: Confidentiality and Governing Law unchanged.',
  ]);
  return { pdfA, pdfB };
}

export function createSyntheticRgbaFrame(
  width: number,
  height: number,
  blocks: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
    g: number;
    b: number;
  }> = []
): PageRgbaFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  for (const block of blocks) {
    const x0 = Math.max(0, Math.floor(block.x));
    const y0 = Math.max(0, Math.floor(block.y));
    const x1 = Math.min(width - 1, Math.floor(block.x + block.w - 1));
    const y1 = Math.min(height - 1, Math.floor(block.y + block.h - 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = block.r;
        data[idx + 1] = block.g;
        data[idx + 2] = block.b;
        data[idx + 3] = 255;
      }
    }
  }

  return { data, width, height };
}

export function createCorruptPdfBytes(): Uint8Array {
  const s = '%PDF-1.7\n%truncated corrupt compare stream\n';
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}
