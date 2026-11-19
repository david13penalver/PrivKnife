import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import {
  CropBookletMode,
  ImpositionSheetEntry,
  MarginInsetsPt,
  MeasurementUnit,
  PaperOrientation,
  PdfBoxRect,
  PdfCropConfig,
  PdfCropperBookletDeps,
  PdfCropperBookletOptions,
  PdfCropperBookletResult,
  PdfNupBookletConfig,
  PdfResizeConfig,
  TargetPaperPreset,
  WhitespaceScanResult,
} from './types';

const PAPER_SIZES_PT: Record<Exclude<TargetPaperPreset, 'custom'>, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  a5: { width: 419.53, height: 595.28 },
};

const PT_PER_INCH = 72;
const MM_PER_INCH = 25.4;
const MIN_REMAINING_DIMENSION_PT = 10;

export function ptToUnit(pt: number, unit: MeasurementUnit): number {
  if (!Number.isFinite(pt)) return 0;
  if (unit === 'in') return Number((pt / PT_PER_INCH).toFixed(3));
  if (unit === 'mm') return Number(((pt * MM_PER_INCH) / PT_PER_INCH).toFixed(2));
  return Number(pt.toFixed(2));
}

export function unitToPt(value: number, unit: MeasurementUnit): number {
  if (!Number.isFinite(value)) return 0;
  if (unit === 'in') return value * PT_PER_INCH;
  if (unit === 'mm') return (value * PT_PER_INCH) / MM_PER_INCH;
  return value;
}

export function normalizeRotationDeg(rotationDeg: number): 0 | 90 | 180 | 270 {
  if (!Number.isFinite(rotationDeg)) return 0;
  const mod = ((Math.round(rotationDeg / 90) * 90) % 360 + 360) % 360;
  if (mod === 90 || mod === 180 || mod === 270) return mod;
  return 0;
}

export function visualRectToPdfCropBox(
  insets: MarginInsetsPt,
  baseBox: PdfBoxRect,
  rotationDeg: number
): PdfBoxRect | null {
  if (!insets || !baseBox) return null;
  const values = [
    insets.top,
    insets.right,
    insets.bottom,
    insets.left,
    baseBox.x,
    baseBox.y,
    baseBox.width,
    baseBox.height,
  ];
  if (values.some((v) => !Number.isFinite(v))) return null;
  if (
    insets.top < 0 ||
    insets.right < 0 ||
    insets.bottom < 0 ||
    insets.left < 0
  ) {
    return null;
  }

  const rot = normalizeRotationDeg(rotationDeg);
  const { x, y, width: w, height: h } = baseBox;
  const { top, right, bottom, left } = insets;

  let newX = x;
  let newY = y;
  let newW = w;
  let newH = h;

  if (rot === 0) {
    newX = x + left;
    newY = y + bottom;
    newW = w - left - right;
    newH = h - top - bottom;
  } else if (rot === 90) {
    newX = x + top;
    newY = y + left;
    newW = w - top - bottom;
    newH = h - left - right;
  } else if (rot === 180) {
    newX = x + right;
    newY = y + top;
    newW = w - left - right;
    newH = h - top - bottom;
  } else {
    newX = x + bottom;
    newY = y + right;
    newW = w - top - bottom;
    newH = h - left - right;
  }

  if (newW < MIN_REMAINING_DIMENSION_PT || newH < MIN_REMAINING_DIMENSION_PT) {
    return null;
  }

  return {
    x: Number(newX.toFixed(4)),
    y: Number(newY.toFixed(4)),
    width: Number(newW.toFixed(4)),
    height: Number(newH.toFixed(4)),
  };
}

export function detectWhitespaceMarginsFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: { paddingPt?: number; whiteThreshold?: number; scale?: number } = {}
): WhitespaceScanResult {
  const zero: MarginInsetsPt = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!rgba || width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return { isBlank: true, insetsPt: zero };
  }

  const paddingPt = Math.max(0, options.paddingPt ?? 8);
  const threshold = Math.min(254, Math.max(100, options.whiteThreshold ?? 245));
  const scale = options.scale && options.scale > 0 ? options.scale : 1;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const alpha = rgba[idx + 3];
      if (alpha < 10) continue;

      const lum =
        0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
      if (lum < threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { isBlank: true, insetsPt: zero };
  }

  const top = Math.max(0, Number((minY / scale - paddingPt).toFixed(2)));
  const left = Math.max(0, Number((minX / scale - paddingPt).toFixed(2)));
  const right = Math.max(
    0,
    Number(((width - 1 - maxX) / scale - paddingPt).toFixed(2))
  );
  const bottom = Math.max(
    0,
    Number(((height - 1 - maxY) / scale - paddingPt).toFixed(2))
  );

  return {
    isBlank: false,
    insetsPt: { top, right, bottom, left },
  };
}

export function parsePageRange(expr: string, totalPages: number): number[] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return [];
  const raw = String(expr ?? '').trim().toLowerCase();
  if (!raw || raw === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const picked = new Set<number>();
  for (const part of raw.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    if (/^\d+$/.test(seg)) {
      const p = Number(seg);
      if (p >= 1 && p <= totalPages) picked.add(p);
    } else {
      const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const start = Number(m[1]);
        const end = Number(m[2]);
        const lo = Math.max(1, Math.min(start, end));
        const hi = Math.min(totalPages, Math.max(start, end));
        for (let p = lo; p <= hi; p++) {
          picked.add(p);
        }
      }
    }
  }

  return Array.from(picked).sort((a, b) => a - b);
}

export function buildOutputFileName(
  originalName: string,
  mode: CropBookletMode
): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();

  const suffixMap: Record<CropBookletMode, string> = {
    crop: 'cropped',
    resize: 'resized',
    nup: 'nup',
    booklet: 'booklet',
  };
  const suffix = suffixMap[mode] ?? 'output';
  if (!sanitized) return `document-${suffix}.pdf`;
  const stem = sanitized.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-${suffix}.pdf`;
}

export function computeBookletImposition(
  pageCount: number,
  direction: 'ltr' | 'rtl' = 'ltr'
): ImpositionSheetEntry[] {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return [];

  const paddedTotal = Math.ceil(pageCount / 4) * 4;
  const physicalSheets = paddedTotal / 4;
  const entries: ImpositionSheetEntry[] = [];

  const pageOrNull = (p: number): number | null =>
    p >= 1 && p <= pageCount ? p : null;

  for (let s = 0; s < physicalSheets; s++) {
    const frontLeft = pageOrNull(paddedTotal - 2 * s);
    const frontRight = pageOrNull(2 * s + 1);
    const backLeft = pageOrNull(2 * s + 2);
    const backRight = pageOrNull(paddedTotal - 2 * s - 1);

    entries.push({
      sheet: s + 1,
      side: 'front',
      pages:
        direction === 'rtl'
          ? [frontRight, frontLeft]
          : [frontLeft, frontRight],
    });
    entries.push({
      sheet: s + 1,
      side: 'back',
      pages:
        direction === 'rtl' ? [backRight, backLeft] : [backLeft, backRight],
    });
  }

  return entries;
}

export function computeNupImposition(
  pageCount: number,
  pagesPerSheet: 2 | 4 | 6,
  direction: 'ltr' | 'rtl' = 'ltr'
): ImpositionSheetEntry[] {
  if (!Number.isFinite(pageCount) || pageCount <= 0) return [];
  const totalSheets = Math.ceil(pageCount / pagesPerSheet);
  const cols = pagesPerSheet === 2 ? 2 : pagesPerSheet === 4 ? 2 : 3;
  const entries: ImpositionSheetEntry[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const cells: Array<number | null> = [];
    for (let i = 0; i < pagesPerSheet; i++) {
      const p = s * pagesPerSheet + i + 1;
      cells.push(p <= pageCount ? p : null);
    }

    if (direction === 'rtl') {
      const reordered: Array<number | null> = [];
      for (let r = 0; r < cells.length; r += cols) {
        const row = cells.slice(r, r + cols).reverse();
        reordered.push(...row);
      }
      entries.push({ sheet: s + 1, side: 'front', pages: reordered });
    } else {
      entries.push({ sheet: s + 1, side: 'front', pages: cells });
    }
  }

  return entries;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function resolvePaperDimensions(
  preset: TargetPaperPreset,
  orientation: PaperOrientation,
  sourceRatioPortrait: boolean,
  customW?: number,
  customH?: number
): { width: number; height: number } | null {
  let w: number;
  let h: number;

  if (preset === 'custom') {
    if (
      !Number.isFinite(customW) ||
      !Number.isFinite(customH) ||
      (customW ?? 0) < 20 ||
      (customH ?? 0) < 20
    ) {
      return null;
    }
    w = customW!;
    h = customH!;
  } else {
    const base = PAPER_SIZES_PT[preset];
    w = base.width;
    h = base.height;
  }

  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);
  if (orientation === 'portrait') {
    return { width: shortSide, height: longSide };
  }
  if (orientation === 'landscape') {
    return { width: longSide, height: shortSide };
  }
  return sourceRatioPortrait
    ? { width: shortSide, height: longSide }
    : { width: longSide, height: shortSide };
}

function isPageDrawable(page: PDFPage): boolean {
  try {
    return Boolean(page.node.Contents());
  } catch {
    return false;
  }
}

async function runCropPipeline(
  srcDoc: PDFDocument,
  crop: PdfCropConfig,
  outName: string,
  deps: PdfCropperBookletDeps
): Promise<PdfCropperBookletResult> {
  const pages = srcDoc.getPages();
  const total = pages.length;

  let targetSet: Set<number>;
  if (crop.scope === 'current') {
    const p = Math.min(Math.max(1, Math.round(crop.currentPage || 1)), total);
    targetSet = new Set([p]);
  } else if (crop.scope === 'range') {
    const parsed = parsePageRange(crop.pageRange, total);
    if (parsed.length === 0) {
      return {
        success: false,
        mode: 'crop',
        fileName: outName,
        fileSize: 0,
        outputPageCount: 0,
        errorCode: 'INVALID_OPTIONS',
        error: 'No valid pages matched the specified page range.',
      };
    }
    targetSet = new Set(parsed);
  } else {
    targetSet = new Set(Array.from({ length: total }, (_, i) => i + 1));
  }

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1;
    deps.onProgress?.(Math.round(20 + (i / total) * 60), `Cropping page ${pageNum}/${total}`);
    if (!targetSet.has(pageNum)) continue;

    const page = pages[i];
    const baseBox = page.getCropBox();
    const rot = page.getRotation().angle;

    const effectiveInsets: MarginInsetsPt =
      crop.scope === 'odd_even_mirrored' && pageNum % 2 === 0
        ? {
            top: crop.insetsPt.top,
            bottom: crop.insetsPt.bottom,
            left: crop.insetsPt.right,
            right: crop.insetsPt.left,
          }
        : crop.insetsPt;

    const nextBox = visualRectToPdfCropBox(effectiveInsets, baseBox, rot);
    if (!nextBox) {
      return {
        success: false,
        mode: 'crop',
        fileName: outName,
        fileSize: 0,
        outputPageCount: 0,
        errorCode: 'INVALID_INSETS',
        error: `Crop insets on page ${pageNum} leave less than 10 pt width or height.`,
      };
    }

    page.setCropBox(nextBox.x, nextBox.y, nextBox.width, nextBox.height);
    page.setMediaBox(nextBox.x, nextBox.y, nextBox.width, nextBox.height);
  }

  deps.onProgress?.(90, 'Saving cropped PDF');
  const outBytes = new Uint8Array(await srcDoc.save());
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  deps.onProgress?.(100, 'Complete');

  return {
    success: true,
    mode: 'crop',
    blob,
    bytes: outBytes,
    fileName: outName,
    fileSize: outBytes.byteLength,
    outputPageCount: total,
  };
}

async function runResizePipeline(
  srcDoc: PDFDocument,
  resize: PdfResizeConfig,
  outName: string,
  deps: PdfCropperBookletDeps
): Promise<PdfCropperBookletResult> {
  const srcPages = srcDoc.getPages();
  const total = srcPages.length;
  const gutter = Math.max(0, Number.isFinite(resize.gutterMarginPt) ? resize.gutterMarginPt : 0);

  const testDims = resolvePaperDimensions(
    resize.targetPaper,
    resize.orientation,
    true,
    resize.customWidthPt,
    resize.customHeightPt
  );
  if (!testDims) {
    return {
      success: false,
      mode: 'resize',
      fileName: outName,
      fileSize: 0,
      outputPageCount: 0,
      errorCode: 'INVALID_OPTIONS',
      error: 'Custom page dimensions must be at least 20 pt x 20 pt.',
    };
  }

  const outDoc = await PDFDocument.create();
  for (let i = 0; i < total; i++) {
    deps.onProgress?.(
      Math.round(20 + (i / total) * 65),
      `Resizing page ${i + 1}/${total}`
    );
    const srcPage = srcPages[i];
    const srcSize = srcPage.getSize();
    const isSrcPortrait = srcSize.height >= srcSize.width;
    const targetDims = resolvePaperDimensions(
      resize.targetPaper,
      resize.orientation,
      isSrcPortrait,
      resize.customWidthPt,
      resize.customHeightPt
    )!;

    const outPage = outDoc.addPage([targetDims.width, targetDims.height]);
    if (!isPageDrawable(srcPage)) continue;

    const embedded = await outDoc.embedPage(srcPage);
    const availW = Math.max(10, targetDims.width - gutter * 2);
    const availH = Math.max(10, targetDims.height - gutter * 2);

    let drawW = embedded.width;
    let drawH = embedded.height;

    if (resize.scaleMode === 'contain') {
      const scale = Math.min(availW / embedded.width, availH / embedded.height);
      drawW = embedded.width * scale;
      drawH = embedded.height * scale;
    } else if (resize.scaleMode === 'stretch') {
      drawW = availW;
      drawH = availH;
    }

    const x = (targetDims.width - drawW) / 2;
    const y = (targetDims.height - drawH) / 2;
    outPage.drawPage(embedded, { x, y, width: drawW, height: drawH });
  }

  deps.onProgress?.(92, 'Saving resized PDF');
  const outBytes = new Uint8Array(await outDoc.save());
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  deps.onProgress?.(100, 'Complete');

  return {
    success: true,
    mode: 'resize',
    blob,
    bytes: outBytes,
    fileName: outName,
    fileSize: outBytes.byteLength,
    outputPageCount: total,
  };
}

async function runImpositionPipeline(
  srcDoc: PDFDocument,
  mode: 'nup' | 'booklet',
  nup: PdfNupBookletConfig,
  outName: string,
  deps: PdfCropperBookletDeps
): Promise<PdfCropperBookletResult> {
  const srcPages = srcDoc.getPages();
  const total = srcPages.length;
  const outer = Math.max(0, nup.outerMarginPt || 0);
  const gap = Math.max(0, nup.cellGapPt || 0);

  const map: ImpositionSheetEntry[] =
    mode === 'booklet'
      ? computeBookletImposition(total, nup.readingDirection)
      : computeNupImposition(total, nup.pagesPerSheet, nup.readingDirection);

  const defaultLandscape =
    mode === 'booklet' || nup.pagesPerSheet === 2 || nup.pagesPerSheet === 6;
  const orientation: PaperOrientation =
    nup.sheetOrientation === 'auto'
      ? defaultLandscape
        ? 'landscape'
        : 'portrait'
      : nup.sheetOrientation;

  const sheetDims = resolvePaperDimensions(
    nup.targetPaper,
    orientation,
    orientation === 'portrait'
  )!;

  let cols: number;
  let rows: number;
  if (mode === 'booklet') {
    cols = 2;
    rows = 1;
  } else if (nup.pagesPerSheet === 2) {
    cols = sheetDims.width >= sheetDims.height ? 2 : 1;
    rows = sheetDims.width >= sheetDims.height ? 1 : 2;
  } else if (nup.pagesPerSheet === 4) {
    cols = 2;
    rows = 2;
  } else {
    cols = sheetDims.width >= sheetDims.height ? 3 : 2;
    rows = sheetDims.width >= sheetDims.height ? 2 : 3;
  }

  const usableW = Math.max(20, sheetDims.width - outer * 2 - gap * (cols - 1));
  const usableH = Math.max(20, sheetDims.height - outer * 2 - gap * (rows - 1));
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  const outDoc = await PDFDocument.create();
  const embeddedCache = new Map<number, Awaited<ReturnType<PDFDocument['embedPage']>>>();

  for (let sIdx = 0; sIdx < map.length; sIdx++) {
    const entry = map[sIdx];
    deps.onProgress?.(
      Math.round(20 + (sIdx / Math.max(1, map.length)) * 65),
      `Imposing sheet ${sIdx + 1}/${map.length}`
    );

    const sheet = outDoc.addPage([sheetDims.width, sheetDims.height]);

    for (let idx = 0; idx < entry.pages.length; idx++) {
      const pNum = entry.pages[idx];
      if (!pNum || pNum < 1 || pNum > total) continue;

      const srcPage = srcPages[pNum - 1];
      if (!isPageDrawable(srcPage)) continue;

      let embedded = embeddedCache.get(pNum);
      if (!embedded) {
        embedded = await outDoc.embedPage(srcPage);
        embeddedCache.set(pNum, embedded);
      }

      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellX = outer + col * (cellW + gap);
      const cellY = sheetDims.height - outer - (row + 1) * cellH - row * gap;

      const scale = Math.min(cellW / embedded.width, cellH / embedded.height);
      const drawW = embedded.width * scale;
      const drawH = embedded.height * scale;

      sheet.drawPage(embedded, {
        x: cellX + (cellW - drawW) / 2,
        y: cellY + (cellH - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }

    if (nup.drawCutGuides) {
      const guideColor = rgb(0.75, 0.78, 0.82);
      for (let c = 1; c < cols; c++) {
        const x = outer + c * cellW + (c - 0.5) * gap;
        sheet.drawLine({
          start: { x, y: outer },
          end: { x, y: sheetDims.height - outer },
          thickness: 0.5,
          color: guideColor,
          dashArray: [4, 4],
        });
      }
      for (let r = 1; r < rows; r++) {
        const y = sheetDims.height - outer - r * cellH - (r - 0.5) * gap;
        sheet.drawLine({
          start: { x: outer, y },
          end: { x: sheetDims.width - outer, y },
          thickness: 0.5,
          color: guideColor,
          dashArray: [4, 4],
        });
      }
    }
  }

  deps.onProgress?.(92, `Saving ${mode} PDF`);
  const outBytes = new Uint8Array(await outDoc.save());
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  deps.onProgress?.(100, 'Complete');

  return {
    success: true,
    mode,
    blob,
    bytes: outBytes,
    fileName: outName,
    fileSize: outBytes.byteLength,
    outputPageCount: map.length,
    impositionMap: map,
  };
}

export async function processPdfCropperBooklet(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfCropperBookletOptions,
  deps: PdfCropperBookletDeps = {}
): Promise<PdfCropperBookletResult> {
  const mode: CropBookletMode = options?.mode ?? 'crop';
  const outName = buildOutputFileName(fileName, mode);

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      mode,
      fileName: outName,
      fileSize: 0,
      outputPageCount: 0,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      mode,
      fileName: outName,
      fileSize: 0,
      outputPageCount: 0,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(10, 'Loading PDF document');

  try {
    const normalized = new Uint8Array(pdfBytes);
    const srcDoc = await PDFDocument.load(normalized, { updateMetadata: false });
    const pageCount = srcDoc.getPageCount();
    if (pageCount <= 0) {
      return {
        success: false,
        mode,
        fileName: outName,
        fileSize: 0,
        outputPageCount: 0,
        errorCode: 'INVALID_PDF',
        error: 'PDF contains zero pages.',
      };
    }

    if (mode === 'crop') {
      return await runCropPipeline(srcDoc, options.crop, outName, deps);
    }
    if (mode === 'resize') {
      return await runResizePipeline(srcDoc, options.resize, outName, deps);
    }
    return await runImpositionPipeline(srcDoc, mode, options.nup, outName, deps);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to parse PDF.';
    const isEncrypted = /encrypt/i.test(msg);
    return {
      success: false,
      mode,
      fileName: outName,
      fileSize: 0,
      outputPageCount: 0,
      errorCode: isEncrypted ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
      error: isEncrypted
        ? 'PDF is encrypted. Unlock it first with PDF Password Protector & Unlocker.'
        : msg,
    };
  }
}
