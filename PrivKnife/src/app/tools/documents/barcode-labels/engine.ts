import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { AVERY_5160, STANDARD_LABEL_TEMPLATES } from './test-fixtures';
import {
  BarcodeSymbology,
  LabelItem,
  LabelPosition,
  LabelSheetConfig,
  LabelTemplate,
} from './types';

/**
 * Get preset label template by ID with fallback.
 */
export function getPresetTemplate(id: string): LabelTemplate {
  const found = STANDARD_LABEL_TEMPLATES.find((t) => t.id === id);
  return found || AVERY_5160;
}

/**
 * Calculate millimeter coordinates for every label slot on the sheet.
 */
export function calculateLabelPositions(template: LabelTemplate): LabelPosition[] {
  const positions: LabelPosition[] = [];
  let index = 0;

  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.columns; col++) {
      const xMm = template.marginLeftMm + col * template.pitchHorizontalMm;
      const yMm = template.marginTopMm + row * template.pitchVerticalMm;

      positions.push({
        index,
        row,
        col,
        xMm,
        yMm,
        widthMm: template.labelWidthMm,
        heightMm: template.labelHeightMm,
      });
      index++;
    }
  }

  return positions;
}

/**
 * Generate sequential numbering items.
 */
export function generateSequenceItems(
  prefix: string,
  start: number,
  count: number,
  digits = 4,
  suffix = ''
): LabelItem[] {
  const items: LabelItem[] = [];
  const safeCount = Math.max(1, count);

  for (let i = 0; i < safeCount; i++) {
    const num = start + i;
    const padded = String(num).padStart(digits, '0');
    items.push({
      value: `${prefix}${padded}${suffix}`,
    });
  }

  return items;
}

/**
 * Parse CSV or multi-line text into label items.
 */
export function parseCsvItems(csvText: string): LabelItem[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const items: LabelItem[] = [];
  let startIndex = 0;

  // Check if first line is a header
  const firstLower = lines[0].toLowerCase();
  if (
    firstLower.includes('title') ||
    firstLower.includes('sku') ||
    firstLower.includes('barcode') ||
    firstLower.includes('value') ||
    firstLower.includes('price')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma or tab, handling basic quotes
    const parts = line.split(/[,\t]/).map((p) => p.replace(/^["']|["']$/g, '').trim());

    if (parts.length === 1) {
      items.push({ value: parts[0] });
    } else if (parts.length === 2) {
      items.push({ title: parts[0], value: parts[1] });
    } else if (parts.length >= 3) {
      items.push({ title: parts[0], value: parts[1], subtext: parts[2] });
    }
  }

  return items;
}

/**
 * Generate image data URI for UI preview rendering.
 */
export async function generateBarcodeDataUri(
  value: string,
  symbology: BarcodeSymbology,
  options?: { showText?: boolean }
): Promise<string> {
  const safeValue = value && value.trim() ? value.trim() : '000000';

  if (symbology === 'QR') {
    return await QRCode.toDataURL(safeValue, {
      margin: 1,
      width: 180,
      errorCorrectionLevel: 'M',
    });
  }

  // 1D Barcodes via JsBarcode
  try {
    const format = symbology === 'UPC' ? 'UPC' : symbology;
    const targetObj: any = {};
    JsBarcode(targetObj, safeValue, {
      format,
      displayValue: options?.showText ?? false,
      margin: 2,
    });

    const encoding = targetObj.encodings?.[0];
    if (encoding && encoding.data) {
      const bits: string = encoding.data;
      const barCount = bits.length;
      const width = barCount * 2 + 10;
      const height = 60;

      let rects = '';
      for (let i = 0; i < barCount; i++) {
        if (bits[i] === '1') {
          rects += `<rect x="${5 + i * 2}" y="5" width="2" height="40" fill="#000000" />`;
        }
      }

      let textSvg = '';
      if (options?.showText) {
        textSvg = `<text x="${width / 2}" y="54" text-anchor="middle" font-family="monospace" font-size="10" fill="#000000">${safeValue}</text>`;
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#ffffff">${rects}${textSvg}</svg>`;
      const base64 =
        typeof btoa !== 'undefined'
          ? btoa(unescape(encodeURIComponent(svg)))
          : Buffer.from(svg).toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    }
  } catch {
    // fallback if format validation fails
  }

  // Fallback 1x1 png
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

/**
 * Render barcode as precision vector paths directly in jsPDF.
 */
function drawVectorBarcodeOnPdf(
  pdf: jsPDF,
  value: string,
  symbology: BarcodeSymbology,
  x: number,
  y: number,
  width: number,
  height: number,
  showText: boolean
): void {
  const safeVal = value && value.trim() ? value.trim() : '000000';

  if (symbology === 'QR') {
    try {
      const qr = QRCode.create(safeVal, { errorCorrectionLevel: 'M' });
      const moduleCount = qr.modules.size;
      const moduleSize = Math.min(width, height) / moduleCount;
      const offsetX = x + (width - moduleCount * moduleSize) / 2;
      const offsetY = y + (height - moduleCount * moduleSize) / 2;

      pdf.setFillColor(0, 0, 0);
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr.modules.get(r, c)) {
            pdf.rect(offsetX + c * moduleSize, offsetY + r * moduleSize, moduleSize, moduleSize, 'F');
          }
        }
      }
      return;
    } catch {
      // Fallback
    }
  }

  // 1D Barcode direct vector rendering
  try {
    const format = symbology === 'UPC' ? 'UPC' : symbology;
    const targetObj: any = {};
    JsBarcode(targetObj, safeVal, { format });

    const encoding = targetObj.encodings?.[0];
    if (encoding && encoding.data) {
      const bits: string = encoding.data;
      const barCount = bits.length;
      const barWidth = width / barCount;

      pdf.setFillColor(0, 0, 0);
      for (let i = 0; i < barCount; i++) {
        if (bits[i] === '1') {
          pdf.rect(x + i * barWidth, y, barWidth, height, 'F');
        }
      }

      if (showText) {
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(safeVal, x + width / 2, y + height + 2.2, { align: 'center' });
      }
      return;
    }
  } catch {
    // If format invalid, draw placeholder text
  }

  // Fallback text
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`[${safeVal}]`, x + width / 2, y + height / 2, { align: 'center' });
}

/**
 * Compile a full print-ready label sheet PDF with sub-millimeter precision.
 */
export async function generateLabelSheetPdf(
  config: LabelSheetConfig
): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }> {
  const template = config.template;
  const positions = calculateLabelPositions(template);
  const startOffset = Math.max(0, config.startOffsetIndex || 0);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [template.paperWidthMm, template.paperHeightMm],
    compress: true,
  });

  // 1. Draw subtle guide cutting/bleed lines if enabled
  if (config.showGuideLines) {
    pdf.setDrawColor(226, 232, 240); // very light gray
    pdf.setLineWidth(0.1);
    for (const pos of positions) {
      pdf.rect(pos.xMm, pos.yMm, pos.widthMm, pos.heightMm);
    }
  }

  // 2. Prepare items list
  let labelItems: LabelItem[] = [];

  if (config.dataMode === 'single') {
    labelItems = Array(positions.length).fill(config.singleItem);
  } else if (config.dataMode === 'sequence') {
    labelItems = generateSequenceItems(
      config.sequenceConfig.prefix,
      config.sequenceConfig.startNumber,
      positions.length,
      config.sequenceConfig.digits,
      config.sequenceConfig.suffix
    );
  } else {
    // CSV / batch
    labelItems = config.items.length > 0 ? config.items : [config.singleItem];
  }

  // 3. Render labels into positions starting from startOffset
  let itemIndex = 0;
  for (let i = startOffset; i < positions.length; i++) {
    const pos = positions[i];
    const item = labelItems[itemIndex % labelItems.length];
    itemIndex++;

    const paddingX = 3;
    const paddingY = 2;
    const contentW = pos.widthMm - paddingX * 2;
    const contentH = pos.heightMm - paddingY * 2;

    const hasTitle = Boolean(item.title && item.title.trim());
    const hasSubtext = Boolean(item.subtext && item.subtext.trim());

    let currentY = pos.yMm + paddingY;

    // Top Title
    if (hasTitle) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(config.titleFontSize || 8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(item.title!.trim(), pos.xMm + pos.widthMm / 2, currentY + 2.5, {
        align: 'center',
      });
      currentY += 4.5;
    }

    // Barcode dimensions calculation
    const bottomReserve = hasSubtext ? 4.5 : config.showHumanReadableBarcode ? 3.5 : 0;
    const barcodeH = Math.max(6, pos.heightMm - (currentY - pos.yMm) - bottomReserve - paddingY);
    const barcodeW = config.symbology === 'QR' ? Math.min(contentW * 0.8, barcodeH) : contentW * 0.9;
    const barcodeX = pos.xMm + (pos.widthMm - barcodeW) / 2;

    drawVectorBarcodeOnPdf(
      pdf,
      item.value,
      config.symbology,
      barcodeX,
      currentY,
      barcodeW,
      barcodeH,
      config.showHumanReadableBarcode && config.symbology !== 'QR'
    );

    // Bottom Subtext
    if (hasSubtext) {
      const subtextY = pos.yMm + pos.heightMm - paddingY - 0.5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(config.subtextFontSize || 7);
      pdf.setTextColor(71, 85, 105);
      pdf.text(item.subtext!.trim(), pos.xMm + pos.widthMm / 2, subtextY, {
        align: 'center',
      });
    }
  }

  const blob = pdf.output('blob');
  const buffer = new Uint8Array(pdf.output('arraybuffer'));
  const dataUri = pdf.output('datauristring');

  return { blob, buffer, dataUri };
}
