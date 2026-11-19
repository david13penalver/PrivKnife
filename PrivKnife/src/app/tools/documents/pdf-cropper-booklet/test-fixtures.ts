import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  PdfCropConfig,
  PdfCropperBookletOptions,
  PdfNupBookletConfig,
  PdfResizeConfig,
} from './types';

export const DEFAULT_CROP_CONFIG: PdfCropConfig = {
  insetsPt: { top: 0, right: 0, bottom: 0, left: 0 },
  scope: 'all',
  currentPage: 1,
  pageRange: 'all',
  autoTrimPaddingPt: 8,
  whiteThreshold: 245,
};

export const DEFAULT_RESIZE_CONFIG: PdfResizeConfig = {
  targetPaper: 'a4',
  orientation: 'auto',
  customWidthPt: 595.28,
  customHeightPt: 841.89,
  scaleMode: 'contain',
  gutterMarginPt: 0,
};

export const DEFAULT_NUP_CONFIG: PdfNupBookletConfig = {
  pagesPerSheet: 4,
  targetPaper: 'a4',
  sheetOrientation: 'auto',
  outerMarginPt: 18,
  cellGapPt: 10,
  drawCutGuides: true,
  readingDirection: 'ltr',
};

export const DEFAULT_CROPPER_OPTIONS: PdfCropperBookletOptions = {
  mode: 'crop',
  crop: DEFAULT_CROP_CONFIG,
  resize: DEFAULT_RESIZE_CONFIG,
  nup: DEFAULT_NUP_CONFIG,
};

export async function createSyntheticPdf(
  pageCount = 4,
  options?: {
    width?: number;
    height?: number;
    rotations?: number[];
    leaveBlankPages?: number[];
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const w = options?.width ?? 595;
  const h = options?.height ?? 842;
  const blanks = new Set(options?.leaveBlankPages ?? []);

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const page = doc.addPage([w, h]);
    const rot = options?.rotations?.[i] ?? 0;
    if (rot !== 0) {
      page.setRotation(degrees(rot));
    }

    if (!blanks.has(pageNum)) {
      page.drawRectangle({
        x: 36,
        y: 36,
        width: Math.max(40, w - 72),
        height: Math.max(40, h - 72),
        borderColor: rgb(0.2, 0.4, 0.7),
        borderWidth: 2,
      });
      page.drawText(`PrivKnife Page ${pageNum}`, {
        x: 60,
        y: Math.max(48, h - 80),
        size: 16,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
  }

  return new Uint8Array(await doc.save());
}

export async function createMixedSizePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const dims: Array<[number, number, string]> = [
    [595, 842, 'Portrait A4'],
    [800, 450, 'Landscape Slide'],
    [400, 400, 'Square Sheet'],
  ];

  for (const [w, h, label] of dims) {
    const page = doc.addPage([w, h]);
    page.drawRectangle({
      x: 20,
      y: 20,
      width: w - 40,
      height: h - 40,
      borderColor: rgb(0.15, 0.5, 0.3),
      borderWidth: 1.5,
    });
    page.drawText(label, { x: 40, y: h / 2, size: 14, font, color: rgb(0, 0, 0) });
  }

  return new Uint8Array(await doc.save());
}

export function createCorruptPdfBytes(): Uint8Array {
  const s = '%PDF-1.7\n%corrupted truncated trailer\n';
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
}

export function createNonPdfBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

export function createSyntheticRgbaImage(
  width: number,
  height: number,
  contentRect?: { left: number; top: number; right: number; bottom: number }
): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  if (contentRect) {
    const x0 = Math.max(0, Math.floor(contentRect.left));
    const y0 = Math.max(0, Math.floor(contentRect.top));
    const x1 = Math.min(width - 1, Math.floor(contentRect.right));
    const y1 = Math.min(height - 1, Math.floor(contentRect.bottom));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const idx = (y * width + x) * 4;
        data[idx] = 20;
        data[idx + 1] = 20;
        data[idx + 2] = 20;
        data[idx + 3] = 255;
      }
    }
  }

  return { data, width, height };
}
