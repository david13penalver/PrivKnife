import {
  degrees,
  EncryptedPDFError,
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  RGB,
  StandardFonts,
} from 'pdf-lib';
import {
  AnchorPosition,
  NumberingAnchor,
  PdfStandardFontChoice,
  PdfWatermarkDeps,
  PdfWatermarkNumberingOptions,
  PdfWatermarkNumberingResult,
} from './types';

export interface ParsedPageRangeResult {
  valid: boolean;
  pages: number[];
  error?: string;
}

export function parsePageRange(
  expression: string,
  totalPages: number
): ParsedPageRangeResult {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    return { valid: false, pages: [], error: 'Document has zero valid pages.' };
  }

  const raw = String(expression ?? '').trim().toLowerCase();
  if (!raw || raw === 'all') {
    return {
      valid: true,
      pages: Array.from({ length: totalPages }, (_, i) => i + 1),
    };
  }

  if (raw === 'odd') {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i += 2) pages.push(i);
    return { valid: true, pages };
  }

  if (raw === 'even') {
    const pages: number[] = [];
    for (let i = 2; i <= totalPages; i += 2) pages.push(i);
    return { valid: true, pages };
  }

  const segments = raw.split(',');
  const selected = new Set<number>();

  for (const segmentRaw of segments) {
    const seg = segmentRaw.trim();
    if (!seg) {
      return { valid: false, pages: [], error: 'Empty page range segment.' };
    }

    if (/^\d+$/.test(seg)) {
      const pageNum = Number(seg);
      if (pageNum < 1 || pageNum > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${pageNum} is outside 1..${totalPages}.`,
        };
      }
      selected.add(pageNum);
      continue;
    }

    const rangeMatch = seg.match(/^(\d+)\s*-\s*(\d+|end)$/);
    if (!rangeMatch) {
      return {
        valid: false,
        pages: [],
        error: `Invalid page range segment: "${seg}".`,
      };
    }

    const start = Number(rangeMatch[1]);
    const end = rangeMatch[2] === 'end' ? totalPages : Number(rangeMatch[2]);

    if (
      start < 1 ||
      end < 1 ||
      start > totalPages ||
      end > totalPages ||
      start > end
    ) {
      return {
        valid: false,
        pages: [],
        error: `Invalid bounds in segment "${seg}" for ${totalPages} pages.`,
      };
    }

    for (let p = start; p <= end; p++) {
      selected.add(p);
    }
  }

  return {
    valid: true,
    pages: Array.from(selected).sort((a, b) => a - b),
  };
}

const WIN_ANSI_EXTRA_SET = new Set([
  '\u20ac', // €
  '\u201a', // ‚
  '\u0192', // ƒ
  '\u201e', // „
  '\u2026', // …
  '\u2020', // †
  '\u2021', // ‡
  '\u02c6', // ˆ
  '\u2030', // ‰
  '\u0160', // Š
  '\u2039', // ‹
  '\u0152', // Œ
  '\u017d', // Ž
  '\u2018', // ‘
  '\u2019', // ’
  '\u201c', // “
  '\u201d', // ”
  '\u2022', // •
  '\u2013', // –
  '\u2014', // —
  '\u02dc', // ˜
  '\u2122', // ™
  '\u0161', // š
  '\u203a', // ›
  '\u0153', // œ
  '\u017e', // ž
  '\u0178', // Ÿ
]);

export function sanitizeWinAnsiText(input: string): {
  text: string;
  replacedCount: number;
} {
  const normalized = String(input ?? '')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...');

  let out = '';
  let replacedCount = 0;

  for (const ch of normalized) {
    const cp = ch.codePointAt(0) ?? 0;
    const isAsciiPrintable = cp >= 0x20 && cp <= 0x7e;
    const isLatin1Printable = cp >= 0xa0 && cp <= 0xff;
    const isLineBreak = ch === '\n' || ch === '\r' || ch === '\t';

    if (
      isAsciiPrintable ||
      isLatin1Printable ||
      isLineBreak ||
      WIN_ANSI_EXTRA_SET.has(ch)
    ) {
      out += ch;
    } else {
      out += '?';
      replacedCount++;
    }
  }

  return { text: out, replacedCount };
}

export function parseHexColor(hex: string): { r: number; g: number; b: number; pdfRgb: RGB } | null {
  const clean = String(hex ?? '').trim().replace(/^#/, '');
  let fullHex: string;

  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    fullHex = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    fullHex = clean;
  } else {
    return null;
  }

  const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;
  return { r, g, b, pdfRgb: rgb(r, g, b) };
}

export function formatStampLabel(
  template: string,
  seqIndex: number,
  startNumber: number,
  totalPages: number
): string {
  const safeStart = Number.isFinite(startNumber) ? Math.floor(startNumber) : 1;
  const currentNum = safeStart + Math.max(0, Math.floor(seqIndex));
  const safeTotal = Math.max(1, Math.floor(totalPages));

  return String(template ?? '')
    .replace(/\{n\}/gi, String(currentNum))
    .replace(/\{total\}/gi, String(safeTotal))
    .replace(/\{bates(?::(\d+))?\}/gi, (_full, digitsRaw) => {
      const digits = digitsRaw
        ? Math.min(12, Math.max(1, Number.parseInt(digitsRaw, 10)))
        : 6;
      return currentNum >= 0
        ? String(currentNum).padStart(digits, '0')
        : '-' + String(Math.abs(currentNum)).padStart(digits, '0');
    });
}

export interface PdfBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function mirrorAnchorForFacingPage(
  anchor: NumberingAnchor,
  pageNumber: number,
  enabled: boolean
): NumberingAnchor {
  if (!enabled || pageNumber % 2 === 1) {
    return anchor;
  }
  if (anchor.endsWith('-left')) {
    return anchor.replace('-left', '-right') as NumberingAnchor;
  }
  if (anchor.endsWith('-right')) {
    return anchor.replace('-right', '-left') as NumberingAnchor;
  }
  return anchor;
}

export function computeRotatedOrigin(
  centerX: number,
  centerY: number,
  itemWidth: number,
  itemHeight: number,
  rotationDeg: number
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = (itemWidth / 2) * cos - (itemHeight / 2) * sin;
  const dy = (itemWidth / 2) * sin + (itemHeight / 2) * cos;
  return {
    x: centerX - dx,
    y: centerY - dy,
  };
}

export function computeAnchorPosition(
  cropBox: PdfBoxRect,
  anchor: AnchorPosition,
  marginPt: number,
  itemWidth: number,
  itemHeight: number,
  rotationDeg: number
): { x: number; y: number; centerX: number; centerY: number } {
  const safeMargin = Math.max(0, marginPt);

  let centerX: number;
  if (anchor.endsWith('-left')) {
    centerX = cropBox.x + safeMargin + itemWidth / 2;
  } else if (anchor.endsWith('-right')) {
    centerX = cropBox.x + cropBox.width - safeMargin - itemWidth / 2;
  } else {
    centerX = cropBox.x + cropBox.width / 2;
  }

  let centerY: number;
  if (anchor.startsWith('top-')) {
    centerY = cropBox.y + cropBox.height - safeMargin - itemHeight / 2;
  } else if (anchor.startsWith('bottom-')) {
    centerY = cropBox.y + safeMargin + itemHeight / 2;
  } else {
    centerY = cropBox.y + cropBox.height / 2;
  }

  const origin = computeRotatedOrigin(
    centerX,
    centerY,
    itemWidth,
    itemHeight,
    rotationDeg
  );

  return {
    x: origin.x,
    y: origin.y,
    centerX,
    centerY,
  };
}

export function computeTiledPositions(
  cropBox: PdfBoxRect,
  tileGapPt: number
): Array<{ centerX: number; centerY: number }> {
  const MAX_TILES = 200;
  let step = Math.max(40, Number.isFinite(tileGapPt) ? tileGapPt : 160);

  const estCols = Math.ceil(cropBox.width / step) + 1;
  const estRows = Math.ceil(cropBox.height / step) + 1;
  if (estCols * estRows > MAX_TILES) {
    step = Math.max(
      step,
      Math.ceil(Math.sqrt((cropBox.width * cropBox.height) / (MAX_TILES * 0.75)))
    );
  }

  const centers: Array<{ centerX: number; centerY: number }> = [];
  let rowIndex = 0;

  for (
    let cy = cropBox.y + step * 0.35;
    cy <= cropBox.y + cropBox.height - step * 0.1;
    cy += step
  ) {
    const staggerX = rowIndex % 2 === 1 ? step * 0.5 : 0;
    for (
      let cx = cropBox.x + step * 0.35 + staggerX;
      cx <= cropBox.x + cropBox.width;
      cx += step
    ) {
      centers.push({ centerX: cx, centerY: cy });
      if (centers.length >= MAX_TILES) {
        return centers;
      }
    }
    rowIndex++;
  }

  if (centers.length === 0) {
    centers.push({
      centerX: cropBox.x + cropBox.width / 2,
      centerY: cropBox.y + cropBox.height / 2,
    });
  }

  return centers;
}

export function buildStampedFileName(originalName: string): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();

  if (!sanitized) {
    return 'document-stamped.pdf';
  }
  const stem = sanitized.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-stamped.pdf`;
}

export function validateOptions(
  options: PdfWatermarkNumberingOptions | null | undefined
): boolean {
  if (!options || typeof options !== 'object') {
    return false;
  }

  const wm = options.watermark;
  const num = options.numbering;
  if (!wm || !num || (!wm.enabled && !num.enabled)) {
    return false;
  }

  if (wm.enabled) {
    if (
      !Number.isFinite(wm.opacity) ||
      wm.opacity < 0.05 ||
      wm.opacity > 1 ||
      !Number.isFinite(wm.fontSizePt) ||
      wm.fontSizePt < 6 ||
      wm.fontSizePt > 200 ||
      !Number.isFinite(wm.rotationDeg) ||
      wm.rotationDeg < -180 ||
      wm.rotationDeg > 180 ||
      !Number.isFinite(wm.imageScalePercent) ||
      wm.imageScalePercent < 5 ||
      wm.imageScalePercent > 100 ||
      !Number.isFinite(wm.tileGapPt) ||
      wm.tileGapPt < 40 ||
      wm.tileGapPt > 1000 ||
      !Number.isFinite(wm.marginPt) ||
      wm.marginPt < 0 ||
      wm.marginPt > 300
    ) {
      return false;
    }

    if (wm.kind === 'text') {
      if (!wm.text || !wm.text.trim() || !parseHexColor(wm.colorHex)) {
        return false;
      }
    } else if (wm.kind === 'image') {
      if (!wm.imageBytes || wm.imageBytes.byteLength === 0) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (num.enabled) {
    if (
      !num.template ||
      !num.template.trim() ||
      !Number.isFinite(num.fontSizePt) ||
      num.fontSizePt < 6 ||
      num.fontSizePt > 72 ||
      !Number.isInteger(num.skipFirstPages) ||
      num.skipFirstPages < 0 ||
      !Number.isFinite(num.startNumber) ||
      !Number.isFinite(num.marginPt) ||
      num.marginPt < 0 ||
      num.marginPt > 300 ||
      !parseHexColor(num.colorHex)
    ) {
      return false;
    }
  }

  return true;
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

function toStandardFont(choice: PdfStandardFontChoice): StandardFonts {
  switch (choice) {
    case 'times':
      return StandardFonts.TimesRoman;
    case 'courier':
      return StandardFonts.Courier;
    case 'helvetica':
    default:
      return StandardFonts.Helvetica;
  }
}

function visualToRawCoords(
  cropBox: PdfBoxRect,
  pageRotationDeg: number,
  vx: number,
  vy: number,
  visualRotDeg: number
): { rawCx: number; rawCy: number; rawRotDeg: number } {
  const angle = ((pageRotationDeg % 360) + 360) % 360;
  if (angle === 90) {
    return {
      rawCx: cropBox.x + vy,
      rawCy: cropBox.y + cropBox.height - vx,
      rawRotDeg: visualRotDeg - 90,
    };
  }
  if (angle === 180) {
    return {
      rawCx: cropBox.x + cropBox.width - vx,
      rawCy: cropBox.y + cropBox.height - vy,
      rawRotDeg: visualRotDeg + 180,
    };
  }
  if (angle === 270) {
    return {
      rawCx: cropBox.x + cropBox.width - vy,
      rawCy: cropBox.y + vx,
      rawRotDeg: visualRotDeg + 90,
    };
  }
  return {
    rawCx: cropBox.x + vx,
    rawCy: cropBox.y + vy,
    rawRotDeg: visualRotDeg,
  };
}

function getVisualBox(cropBox: PdfBoxRect, pageRotationDeg: number): PdfBoxRect {
  const angle = ((pageRotationDeg % 360) + 360) % 360;
  if (angle === 90 || angle === 270) {
    return { x: 0, y: 0, width: cropBox.height, height: cropBox.width };
  }
  return { x: 0, y: 0, width: cropBox.width, height: cropBox.height };
}

function drawWatermarkOnPage(
  page: PDFPage,
  cropBox: PdfBoxRect,
  pageRotationDeg: number,
  options: PdfWatermarkNumberingOptions,
  wmFont: PDFFont | null,
  wmImage: PDFImage | null
): number {
  const wm = options.watermark;
  if (!wm.enabled) return 0;

  const visualBox = getVisualBox(cropBox, pageRotationDeg);
  let substitutions = 0;

  if (wm.kind === 'text' && wmFont) {
    const sanitized = sanitizeWinAnsiText(wm.text);
    substitutions += sanitized.replacedCount;
    const text = sanitized.text;
    const color = parseHexColor(wm.colorHex)?.pdfRgb ?? rgb(0.5, 0.5, 0.5);
    const textWidth = wmFont.widthOfTextAtSize(text, wm.fontSizePt);
    const textHeight = wmFont.heightAtSize(wm.fontSizePt);

    const centers =
      wm.layout === 'tiled'
        ? computeTiledPositions(visualBox, wm.tileGapPt)
        : [
            computeAnchorPosition(
              visualBox,
              wm.anchor,
              wm.marginPt,
              textWidth,
              textHeight,
              wm.rotationDeg
            ),
          ];

    for (const pt of centers) {
      const mapped = visualToRawCoords(
        cropBox,
        pageRotationDeg,
        pt.centerX,
        pt.centerY,
        wm.rotationDeg
      );
      const origin = computeRotatedOrigin(
        mapped.rawCx,
        mapped.rawCy,
        textWidth,
        textHeight,
        mapped.rawRotDeg
      );
      page.drawText(text, {
        x: origin.x,
        y: origin.y,
        size: wm.fontSizePt,
        font: wmFont,
        color,
        opacity: wm.opacity,
        rotate: degrees(mapped.rawRotDeg),
      });
    }
  } else if (wm.kind === 'image' && wmImage) {
    const targetW = Math.max(8, (visualBox.width * wm.imageScalePercent) / 100);
    const aspect = wmImage.height / Math.max(1, wmImage.width);
    const targetH = Math.max(8, targetW * aspect);

    const centers =
      wm.layout === 'tiled'
        ? computeTiledPositions(visualBox, wm.tileGapPt)
        : [
            computeAnchorPosition(
              visualBox,
              wm.anchor,
              wm.marginPt,
              targetW,
              targetH,
              wm.rotationDeg
            ),
          ];

    for (const pt of centers) {
      const mapped = visualToRawCoords(
        cropBox,
        pageRotationDeg,
        pt.centerX,
        pt.centerY,
        wm.rotationDeg
      );
      const origin = computeRotatedOrigin(
        mapped.rawCx,
        mapped.rawCy,
        targetW,
        targetH,
        mapped.rawRotDeg
      );
      page.drawImage(wmImage, {
        x: origin.x,
        y: origin.y,
        width: targetW,
        height: targetH,
        opacity: wm.opacity,
        rotate: degrees(mapped.rawRotDeg),
      });
    }
  }

  return substitutions;
}

function drawNumberingOnPage(
  page: PDFPage,
  cropBox: PdfBoxRect,
  pageRotationDeg: number,
  pageNumber: number,
  seqIndex: number,
  totalNumberedOrDocPages: number,
  options: PdfWatermarkNumberingOptions,
  numFont: PDFFont
): number {
  const num = options.numbering;
  const rawLabel = formatStampLabel(
    num.template,
    seqIndex,
    num.startNumber,
    totalNumberedOrDocPages
  );
  const sanitized = sanitizeWinAnsiText(rawLabel);
  const label = sanitized.text;
  const color = parseHexColor(num.colorHex)?.pdfRgb ?? rgb(0.2, 0.25, 0.35);
  const textWidth = numFont.widthOfTextAtSize(label, num.fontSizePt);
  const textHeight = numFont.heightAtSize(num.fontSizePt);

  const visualBox = getVisualBox(cropBox, pageRotationDeg);
  const effectiveAnchor = mirrorAnchorForFacingPage(
    num.anchor,
    pageNumber,
    num.mirrorFacingPages
  );
  const pos = computeAnchorPosition(
    visualBox,
    effectiveAnchor,
    num.marginPt,
    textWidth,
    textHeight,
    0
  );
  const mapped = visualToRawCoords(
    cropBox,
    pageRotationDeg,
    pos.centerX,
    pos.centerY,
    0
  );

  if (num.opaqueBackdrop) {
    const padX = 6;
    const padY = 4;
    const bgOrigin = computeRotatedOrigin(
      mapped.rawCx,
      mapped.rawCy,
      textWidth + padX * 2,
      textHeight + padY * 2,
      mapped.rawRotDeg
    );
    page.drawRectangle({
      x: bgOrigin.x,
      y: bgOrigin.y,
      width: textWidth + padX * 2,
      height: textHeight + padY * 2,
      color: rgb(1, 1, 1),
      opacity: 0.92,
      rotate: degrees(mapped.rawRotDeg),
    });
  }

  const textOrigin = computeRotatedOrigin(
    mapped.rawCx,
    mapped.rawCy,
    textWidth,
    textHeight,
    mapped.rawRotDeg
  );
  page.drawText(label, {
    x: textOrigin.x,
    y: textOrigin.y,
    size: num.fontSizePt,
    font: numFont,
    color,
    rotate: degrees(mapped.rawRotDeg),
  });

  return sanitized.replacedCount;
}

async function embedWatermarkImage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array,
  mimeType?: 'image/png' | 'image/jpeg'
): Promise<PDFImage> {
  const normalized = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes);
  const isPng =
    mimeType === 'image/png' ||
    (normalized[0] === 0x89 && normalized[1] === 0x50 && normalized[2] === 0x4e && normalized[3] === 0x47);
  const isJpeg =
    mimeType === 'image/jpeg' || (normalized[0] === 0xff && normalized[1] === 0xd8);

  if (isPng) {
    return pdfDoc.embedPng(normalized);
  }
  if (isJpeg) {
    return pdfDoc.embedJpg(normalized);
  }
  throw new Error('Unsupported watermark image format. Expected PNG or JPEG.');
}

export async function applyWatermarkAndNumbering(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfWatermarkNumberingOptions,
  deps: PdfWatermarkDeps = {}
): Promise<PdfWatermarkNumberingResult> {
  const outName = buildStampedFileName(fileName);

  if (!validateOptions(options)) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      pagesStamped: 0,
      totalPages: 0,
      winAnsiSubstitutions: 0,
      errorCode: 'INVALID_OPTIONS',
      error: 'Invalid watermark or page numbering options.',
    };
  }

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      pagesStamped: 0,
      totalPages: 0,
      winAnsiSubstitutions: 0,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      pagesStamped: 0,
      totalPages: 0,
      winAnsiSubstitutions: 0,
      errorCode: 'CORRUPT_PDF',
      error: 'File does not begin with a valid %PDF- header.',
    };
  }

  const normalizedPdf = new Uint8Array(pdfBytes);
  let srcDoc: PDFDocument;
  let totalPages: number;
  try {
    srcDoc = await PDFDocument.load(normalizedPdf, {
      updateMetadata: false,
      ignoreEncryption: false,
    });
    totalPages = srcDoc.getPageCount();
    if (!Number.isFinite(totalPages) || totalPages <= 0) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        pagesStamped: 0,
        totalPages: 0,
        winAnsiSubstitutions: 0,
        errorCode: 'CORRUPT_PDF',
        error: 'The PDF contains no valid pages.',
      };
    }
  } catch (err: unknown) {
    if (
      err instanceof EncryptedPDFError ||
      (err instanceof Error && /encrypted/i.test(err.message))
    ) {
      return {
        success: false,
        fileName: outName,
        fileSize: 0,
        pagesStamped: 0,
        totalPages: 0,
        winAnsiSubstitutions: 0,
        errorCode: 'ENCRYPTED_PDF',
        error: 'PDF is encrypted. Please unlock it first before stamping.',
      };
    }
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      pagesStamped: 0,
      totalPages: 0,
      winAnsiSubstitutions: 0,
      errorCode: 'CORRUPT_PDF',
      error: err instanceof Error ? err.message : 'Unable to parse PDF file.',
    };
  }

  const parsedRange = parsePageRange(options.pageRange, totalPages);
  if (!parsedRange.valid) {
    return {
      success: false,
      fileName: outName,
      fileSize: 0,
      pagesStamped: 0,
      totalPages,
      winAnsiSubstitutions: 0,
      errorCode: 'INVALID_RANGE',
      error: parsedRange.error || 'Invalid page range.',
    };
  }

  const targetPageSet = new Set<number>(parsedRange.pages);
  const useUnderlayRebuild =
    options.watermark.enabled && options.watermark.layer === 'under';

  deps.onProgress?.(10, 'Preparing fonts & assets');

  let workDoc: PDFDocument;
  if (useUnderlayRebuild) {
    workDoc = await PDFDocument.create();
  } else {
    workDoc = srcDoc;
  }

  let wmFont: PDFFont | null = null;
  let wmImage: PDFImage | null = null;
  if (options.watermark.enabled) {
    if (options.watermark.kind === 'text') {
      wmFont = await workDoc.embedFont(toStandardFont(options.watermark.fontFamily));
    } else if (options.watermark.kind === 'image' && options.watermark.imageBytes) {
      try {
        wmImage = await embedWatermarkImage(
          workDoc,
          options.watermark.imageBytes,
          options.watermark.imageMimeType
        );
      } catch (err: unknown) {
        return {
          success: false,
          fileName: outName,
          fileSize: 0,
          pagesStamped: 0,
          totalPages,
          winAnsiSubstitutions: 0,
          errorCode: 'INVALID_IMAGE',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to decode watermark image.',
        };
      }
    }
  }

  const numFont = options.numbering.enabled
    ? await workDoc.embedFont(toStandardFont(options.numbering.fontFamily))
    : null;

  let pagesStamped = 0;
  let winAnsiSubstitutions = 0;
  let numberingSequence = 0;

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const srcPage = srcDoc.getPage(i);
    const cropBox = srcPage.getCropBox();
    const mediaBox = srcPage.getMediaBox();
    const rotDeg = srcPage.getRotation().angle;
    const isTargeted = targetPageSet.has(pageNum);

    let targetPage: PDFPage;
    if (useUnderlayRebuild) {
      targetPage = workDoc.addPage([mediaBox.width, mediaBox.height]);
      targetPage.setCropBox(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      if (rotDeg !== 0) {
        targetPage.setRotation(degrees(rotDeg));
      }

      if (isTargeted && options.watermark.enabled) {
        winAnsiSubstitutions += drawWatermarkOnPage(
          targetPage,
          cropBox,
          rotDeg,
          options,
          wmFont,
          wmImage
        );
      }

      if (srcPage.node.Contents()) {
        const embedded = await workDoc.embedPage(srcPage, {
          left: mediaBox.x,
          bottom: mediaBox.y,
          right: mediaBox.x + mediaBox.width,
          top: mediaBox.y + mediaBox.height,
        });
        targetPage.drawPage(embedded, {
          x: mediaBox.x,
          y: mediaBox.y,
          width: mediaBox.width,
          height: mediaBox.height,
        });
      }
    } else {
      targetPage = srcPage;
      if (isTargeted && options.watermark.enabled) {
        winAnsiSubstitutions += drawWatermarkOnPage(
          targetPage,
          cropBox,
          rotDeg,
          options,
          wmFont,
          wmImage
        );
      }
    }

    const shouldStampNumbering =
      isTargeted &&
      options.numbering.enabled &&
      pageNum > options.numbering.skipFirstPages;

    if (shouldStampNumbering && numFont) {
      winAnsiSubstitutions += drawNumberingOnPage(
        targetPage,
        cropBox,
        rotDeg,
        pageNum,
        numberingSequence,
        totalPages,
        options,
        numFont
      );
      numberingSequence++;
    }

    if ((isTargeted && options.watermark.enabled) || shouldStampNumbering) {
      pagesStamped++;
    }

    const pct = 15 + Math.round((pageNum / totalPages) * 75);
    deps.onProgress?.(pct, `Stamping page ${pageNum} of ${totalPages}`);
  }

  deps.onProgress?.(95, 'Saving stamped PDF');
  const savedBytes = await workDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
  const blobBytes = new Uint8Array(savedBytes.byteLength);
  blobBytes.set(savedBytes);
  const blob = new Blob([blobBytes], { type: 'application/pdf' });

  deps.onProgress?.(100, 'Complete');
  return {
    success: true,
    blob,
    bytes: savedBytes,
    fileName: outName,
    fileSize: savedBytes.byteLength,
    pagesStamped,
    totalPages,
    winAnsiSubstitutions,
  };
}
