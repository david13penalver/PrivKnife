import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  FoldLineGeometry,
  Orientation,
  PanelContent,
  PanelGeometry,
  PaperFormat,
  TableTentConfig,
  TentGeometry,
} from './types';

/**
 * Returns physical page dimensions in millimeters.
 */
export function getPageDimensionsMm(
  format: PaperFormat,
  orientation: Orientation
): { width: number; height: number } {
  let width = format === 'a4' ? 210 : 215.9;
  let height = format === 'a4' ? 297 : 279.4;

  if (orientation === 'landscape') {
    const temp = width;
    width = height;
    height = temp;
  }

  return { width, height };
}

/**
 * Calculates millimeter coordinates and fold lines for table tent panels.
 */
export function calculateTentGeometry(config: TableTentConfig): TentGeometry {
  const { width: pageWidthMm, height: pageHeightMm } = getPageDimensionsMm(
    config.paperFormat,
    config.orientation
  );

  const panels: PanelGeometry[] = [];
  const foldLines: FoldLineGeometry[] = [];

  if (config.foldType === 'bi-fold') {
    const panelHeight = pageHeightMm / 2;

    // Panel 0: Face A (Inverted 180° so it faces forward right-side up when folded)
    panels.push({
      index: 0,
      label: 'Face A (Inverted 180°)',
      xMm: 0,
      yMm: 0,
      widthMm: pageWidthMm,
      heightMm: panelHeight,
      rotationDeg: 180,
    });

    // Panel 1: Face B (Upright 0°)
    panels.push({
      index: 1,
      label: 'Face B (Upright)',
      xMm: 0,
      yMm: panelHeight,
      widthMm: pageWidthMm,
      heightMm: panelHeight,
      rotationDeg: 0,
    });

    // Fold line right at 50%
    foldLines.push({
      yMm: panelHeight,
      label: '- - - FOLD HERE (APEX CREASE) - - -',
    });
  } else {
    // Tri-Fold Triangular Prism with Base Flap
    // Base flap takes ~18% of page height
    const baseFlapHeight = Math.round(pageHeightMm * 0.18 * 10) / 10;
    const faceHeight = (pageHeightMm - baseFlapHeight) / 2;

    // Panel 0: Face A (Inverted 180°)
    panels.push({
      index: 0,
      label: 'Face A (Inverted 180°)',
      xMm: 0,
      yMm: 0,
      widthMm: pageWidthMm,
      heightMm: faceHeight,
      rotationDeg: 180,
    });

    // Panel 1: Face B (Upright 0°)
    panels.push({
      index: 1,
      label: 'Face B (Upright)',
      xMm: 0,
      yMm: faceHeight,
      widthMm: pageWidthMm,
      heightMm: faceHeight,
      rotationDeg: 0,
    });

    // Panel 2: Base Glue/Tape Flap
    panels.push({
      index: 2,
      label: 'Base Flap (Fold under & tape)',
      xMm: 0,
      yMm: faceHeight * 2,
      widthMm: pageWidthMm,
      heightMm: baseFlapHeight,
      rotationDeg: 0,
      isBaseFlap: true,
    });

    foldLines.push({
      yMm: faceHeight,
      label: '- - - FOLD HERE (TOP APEX) - - -',
    });

    foldLines.push({
      yMm: faceHeight * 2,
      label: '- - - FOLD HERE (BASE FLAP - TUCK UNDER) - - -',
    });
  }

  return {
    pageWidthMm,
    pageHeightMm,
    panels,
    foldLines,
  };
}

/**
 * Generate high-res QR code PNG data URI.
 */
export async function generateQrDataUri(
  url: string,
  color = '#000000'
): Promise<string> {
  const safeUrl = url && url.trim() ? url.trim() : 'https://privknife.com';
  return await QRCode.toDataURL(safeUrl, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
    color: {
      dark: color,
      light: '#ffffff',
    },
  });
}

/**
 * Helper to convert HEX to RGB tuple.
 */
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return [r, g, b];
  }
  const r = parseInt(sanitized.substring(0, 2), 16) || 0;
  const g = parseInt(sanitized.substring(2, 4), 16) || 0;
  const b = parseInt(sanitized.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Draw vector QR code on jsPDF canvas.
 */
function drawVectorQr(
  pdf: jsPDF,
  url: string,
  centerX: number,
  centerY: number,
  sizeMm: number,
  isInverted: boolean,
  colorRgb: [number, number, number]
): void {
  try {
    const qr = QRCode.create(url || 'https://privknife.com', {
      errorCorrectionLevel: 'M',
    });
    const moduleCount = qr.modules.size;
    const moduleSize = sizeMm / moduleCount;
    const startX = centerX - sizeMm / 2;
    const startY = centerY - sizeMm / 2;

    pdf.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.modules.get(row, col)) {
          // If inverted, rotate 180 degrees
          const targetCol = isInverted ? moduleCount - 1 - col : col;
          const targetRow = isInverted ? moduleCount - 1 - row : row;

          const mx = startX + targetCol * moduleSize;
          const my = startY + targetRow * moduleSize;
          pdf.rect(mx, my, moduleSize, moduleSize, 'F');
        }
      }
    }
  } catch {
    // fallback square
    pdf.setFillColor(200, 200, 200);
    pdf.rect(centerX - sizeMm / 2, centerY - sizeMm / 2, sizeMm, sizeMm, 'F');
  }
}

/**
 * Render a single panel's content on the PDF document.
 */
function renderPanelContent(
  pdf: jsPDF,
  panel: PanelGeometry,
  content: PanelContent,
  config: TableTentConfig
): void {
  const isInverted = panel.rotationDeg === 180;
  const cx = panel.xMm + panel.widthMm / 2;
  const cy = panel.yMm + panel.heightMm / 2;
  const angle = isInverted ? 180 : 0;

  const textRgb = hexToRgb(config.theme.textColor);
  const accentRgb = hexToRgb(config.theme.accentColor);

  if (panel.isBaseFlap) {
    // Render base flap glue instructions
    pdf.setFont(config.fontFamily, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      'BASE FLAP — Fold inward along dashed line and tape or glue to secure triangular tent',
      cx,
      cy,
      { align: 'center', angle }
    );
    return;
  }

  // Calculate layout vertical offsets relative to panel center (in mm)
  const isLandscape = config.orientation === 'landscape';
  const scale = panel.heightMm / 148.5; // proportional scale factor

  let titleOffset = -35 * scale;
  let subtitleOffset = -25 * scale;
  let bodyOffset = -15 * scale;
  let qrOffset = 18 * scale;
  let qrLabelOffset = (18 + 18) * scale;
  let badgeOffset = -48 * scale;

  if (isLandscape) {
    titleOffset = -25 * scale;
    subtitleOffset = -18 * scale;
    bodyOffset = -10 * scale;
    qrOffset = 14 * scale;
    qrLabelOffset = (14 + 14) * scale;
    badgeOffset = -35 * scale;
  }

  // Table number badge
  if (config.showTableNumberBadge && content.tableNumber) {
    const badgeY = isInverted ? cy - badgeOffset : cy + badgeOffset;
    const badgeText = `TABLE ${content.tableNumber}`.toUpperCase();

    // Badge background capsule
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    const badgeW = Math.max(30, badgeText.length * 4.5);
    const badgeH = 7.5;
    pdf.roundedRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 3.5, 3.5, 'F');

    // Badge text
    pdf.setFont(config.fontFamily, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(badgeText, cx, badgeY + 1.2, { align: 'center', angle });
  }

  // Title
  if (content.title) {
    const titleY = isInverted ? cy - titleOffset : cy + titleOffset;
    pdf.setFont(config.fontFamily, 'bold');
    pdf.setFontSize(Math.min(22, Math.max(14, 18 * scale)));
    pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
    pdf.text(content.title, cx, titleY, { align: 'center', angle });
  }

  // Subtitle
  if (content.subtitle) {
    const subY = isInverted ? cy - subtitleOffset : cy + subtitleOffset;
    pdf.setFont(config.fontFamily, 'normal');
    pdf.setFontSize(Math.min(12, Math.max(9, 11 * scale)));
    pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.text(content.subtitle, cx, subY, { align: 'center', angle });
  }

  // Body
  if (content.body) {
    const bodyY = isInverted ? cy - bodyOffset : cy + bodyOffset;
    pdf.setFont(config.fontFamily, 'normal');
    pdf.setFontSize(Math.min(10, Math.max(7.5, 9 * scale)));
    pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);

    const lines = pdf.splitTextToSize(content.body, panel.widthMm * 0.75);
    pdf.text(lines, cx, bodyY, { align: 'center', angle });
  }

  // QR Code
  if (config.includeQrCode && content.qrUrl) {
    const qrCenterY = isInverted ? cy - qrOffset : cy + qrOffset;
    const qrSize = Math.min(32, Math.max(20, 26 * scale));

    drawVectorQr(pdf, content.qrUrl, cx, qrCenterY, qrSize, isInverted, textRgb);

    if (content.qrLabel) {
      const qrLabelY = isInverted ? cy - qrLabelOffset : cy + qrLabelOffset;
      pdf.setFont(config.fontFamily, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
      pdf.text(content.qrLabel.toUpperCase(), cx, qrLabelY, {
        align: 'center',
        angle,
      });
    }
  }
}

/**
 * Compiles a print-ready vector PDF for table tent with crease fold guides.
 */
export async function generateTableTentPdf(
  config: TableTentConfig
): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }> {
  const geometry = calculateTentGeometry(config);

  const pdf = new jsPDF({
    orientation: config.orientation,
    unit: 'mm',
    format: config.paperFormat === 'a4' ? 'a4' : 'letter',
  });

  const bgRgb = hexToRgb(config.theme.backgroundColor);

  // Background fill
  pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  pdf.rect(0, 0, geometry.pageWidthMm, geometry.pageHeightMm, 'F');

  // Render Panels
  const frontContent = config.frontPanel;
  const backContent = config.mirrorPanels ? config.frontPanel : config.backPanel;

  // Panel 0: Face A (Inverted)
  if (geometry.panels.length > 0) {
    renderPanelContent(pdf, geometry.panels[0], frontContent, config);
  }

  // Panel 1: Face B (Upright)
  if (geometry.panels.length > 1) {
    renderPanelContent(pdf, geometry.panels[1], backContent, config);
  }

  // Panel 2: Base Flap (if Tri-fold)
  if (geometry.panels.length > 2) {
    renderPanelContent(pdf, geometry.panels[2], backContent, config);
  }

  // Render Fold Lines (dashed)
  if (config.showFoldLines) {
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.35);
    pdf.setLineDashPattern([3, 2.5], 0);

    for (const fold of geometry.foldLines) {
      pdf.line(0, fold.yMm, geometry.pageWidthMm, fold.yMm);

      // Fold text label
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(160, 160, 160);
      pdf.text(fold.label, geometry.pageWidthMm / 2, fold.yMm - 1.2, {
        align: 'center',
      });
    }

    pdf.setLineDashPattern([], 0); // reset dash
  }

  // Render Cut / Trim Marks in corners
  if (config.showCutMarks) {
    const margin = 5;
    const tickLen = 4;
    pdf.setDrawColor(120, 120, 120);
    pdf.setLineWidth(0.25);

    // Top-Left
    pdf.line(margin, margin, margin + tickLen, margin);
    pdf.line(margin, margin, margin, margin + tickLen);

    // Top-Right
    pdf.line(
      geometry.pageWidthMm - margin - tickLen,
      margin,
      geometry.pageWidthMm - margin,
      margin
    );
    pdf.line(
      geometry.pageWidthMm - margin,
      margin,
      geometry.pageWidthMm - margin,
      margin + tickLen
    );

    // Bottom-Left
    pdf.line(
      margin,
      geometry.pageHeightMm - margin,
      margin + tickLen,
      geometry.pageHeightMm - margin
    );
    pdf.line(
      margin,
      geometry.pageHeightMm - margin - tickLen,
      margin,
      geometry.pageHeightMm - margin
    );

    // Bottom-Right
    pdf.line(
      geometry.pageWidthMm - margin - tickLen,
      geometry.pageHeightMm - margin,
      geometry.pageWidthMm - margin,
      geometry.pageHeightMm - margin
    );
    pdf.line(
      geometry.pageWidthMm - margin,
      geometry.pageHeightMm - margin - tickLen,
      geometry.pageWidthMm - margin,
      geometry.pageHeightMm - margin
    );
  }

  const blob = pdf.output('blob');
  const buffer = new Uint8Array(pdf.output('arraybuffer'));
  const dataUri = pdf.output('datauristring');

  return { blob, buffer, dataUri };
}
