import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  DateFormat,
  PdfDocumentSummary,
  PdfSignerStamperOptions,
  PdfSignerStamperResult,
  PlacedStamp,
} from './types';

// -------------------------------------------------------------
// 1. Validation Guardrails
// -------------------------------------------------------------
export function validateSignerOptions(options: PdfSignerStamperOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.signaturePenWidth !== 'number' ||
    options.signaturePenWidth < 1 ||
    options.signaturePenWidth > 10
  ) {
    return { valid: false, error: 'Signature pen width must be between 1 and 10' };
  }

  const validFormats: DateFormat[] = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'MMM D, YYYY',
  ];
  if (!validFormats.includes(options.dateFormat)) {
    return { valid: false, error: 'Invalid date format' };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Date Helpers
// -------------------------------------------------------------
export function formatDateString(
  format: DateFormat,
  date: Date = new Date()
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const d = date.getDate();

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const mmm = months[date.getMonth()];

  switch (format) {
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'MMM D, YYYY':
      return `${mmm} ${d}, ${yyyy}`;
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

// -------------------------------------------------------------
// 3. PDF Document Inspection
// -------------------------------------------------------------
export async function inspectPdfDocument(
  pdfBuffer: ArrayBuffer,
  fileName: string = 'document.pdf'
): Promise<PdfDocumentSummary> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const pages: { pageIndex: number; width: number; height: number }[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    pages.push({
      pageIndex: i,
      width,
      height,
    });
  }

  return {
    name: fileName,
    size: pdfBuffer.byteLength,
    pageCount,
    pages,
  };
}

// -------------------------------------------------------------
// 4. Stamp Application & Embedding Pipeline
// -------------------------------------------------------------
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(';base64,');
  const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 8) : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function applyStampsToPdf(
  pdfBuffer: ArrayBuffer,
  stamps: PlacedStamp[],
  options: PdfSignerStamperOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const blackColor = rgb(0.05, 0.05, 0.05);
  const darkBlueColor = rgb(0.05, 0.15, 0.45);

  const defaultInk =
    options.signatureInkColor === 'dark_blue' ? darkBlueColor : blackColor;

  for (const stamp of stamps) {
    if (stamp.pageIndex < 0 || stamp.pageIndex >= pageCount) {
      continue;
    }

    const page = pdfDoc.getPage(stamp.pageIndex);

    if (stamp.type === 'signature' && stamp.imageDataUrl) {
      try {
        const imageBytes = dataUrlToUint8Array(stamp.imageDataUrl);
        const embeddedImage = await pdfDoc.embedPng(imageBytes);

        page.drawImage(embeddedImage, {
          x: stamp.x,
          y: stamp.y,
          width: stamp.width,
          height: stamp.height,
        });
      } catch {
        // Fallback text if image embedding fails
        page.drawText(stamp.text || '[Digitally Signed]', {
          x: stamp.x,
          y: stamp.y,
          size: 14,
          font: timesItalicFont,
          color: defaultInk,
        });
      }
    } else if (stamp.type === 'date') {
      const dateText =
        stamp.text ||
        options.customDateString ||
        formatDateString(options.dateFormat);

      page.drawText(dateText, {
        x: stamp.x,
        y: stamp.y,
        size: stamp.fontSize || 11,
        font: helveticaFont,
        color: defaultInk,
      });
    } else if (stamp.type === 'initials') {
      const initialsText = stamp.text || options.initialsText || 'INITIALS';

      // Draw subtle circular border around initials
      const circleRadius = (stamp.width || 30) / 2;
      page.drawCircle({
        x: stamp.x + circleRadius,
        y: stamp.y + circleRadius,
        size: circleRadius,
        borderWidth: 1.5,
        borderColor: defaultInk,
      });

      page.drawText(initialsText, {
        x: stamp.x + circleRadius - 8,
        y: stamp.y + circleRadius - 4,
        size: stamp.fontSize || 12,
        font: helveticaFont,
        color: defaultInk,
      });
    } else if (stamp.type === 'text') {
      page.drawText(stamp.text || '', {
        x: stamp.x,
        y: stamp.y,
        size: stamp.fontSize || 12,
        font: helveticaFont,
        color: defaultInk,
      });
    }
  }

  // Flatten annotations & forms if requested
  if (options.flattenAnnotations) {
    try {
      const form = pdfDoc.getForm();
      if (form) {
        form.flatten();
      }
    } catch {
      // Ignored if document does not contain interactive acroform fields
    }
  }

  return pdfDoc.save();
}

// -------------------------------------------------------------
// 5. Deliverable Serialization
// -------------------------------------------------------------
export async function processSignedPdf(
  pdfBuffer: ArrayBuffer,
  options: PdfSignerStamperOptions,
  originalFileName: string = 'document.pdf'
): Promise<PdfSignerStamperResult> {
  const validation = validateSignerOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid options');
  }

  const stamps = options.stamps || [];
  const signedBytes = await applyStampsToPdf(pdfBuffer, stamps, options);

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const outFileName = `${baseName}-signed.pdf`;
  const blob = new Blob([signedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

  // Read page count
  let pageCount = 1;
  try {
    const summary = await inspectPdfDocument(pdfBuffer, originalFileName);
    pageCount = summary.pageCount;
  } catch {
    // Default
  }

  return {
    success: true,
    blob,
    fileName: outFileName,
    fileSize: blob.size,
    mimeType: 'application/pdf',
    metadata: {
      pageCount,
      stampsPlaced: stamps.length,
      flattened: options.flattenAnnotations,
    },
  };
}
