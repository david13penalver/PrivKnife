import { jsPDF } from 'jspdf';
import {
  InvoiceDocument,
  InvoiceLineItem,
  InvoiceTotals,
  InvoiceValidationResult,
} from './types';

/**
 * Precision round to 2 decimal places.
 */
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate line item totals and overall financial figures.
 */
export function calculateTotals(
  doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'>
): InvoiceTotals {
  const items = doc.items || [];
  const taxRate = Math.max(0, doc.taxRate || 0);
  const discountRate = Math.max(0, Math.min(100, doc.discountRate || 0));
  const shipping = Math.max(0, doc.shipping || 0);
  const amountPaid = Math.max(0, doc.amountPaid || 0);

  // Subtotal = sum of (qty * unitPrice)
  let rawSubtotal = 0;
  for (const item of items) {
    const qty = Math.max(0, item.quantity || 0);
    const unitPrice = Math.max(0, item.unitPrice || 0);
    rawSubtotal += qty * unitPrice;
  }
  const subtotal = round2(rawSubtotal);

  // Discount
  const discountAmount = round2(subtotal * (discountRate / 100));

  // Taxable amount
  const taxableAmount = Math.max(0, round2(subtotal - discountAmount));

  // Tax
  const taxAmount = round2(taxableAmount * (taxRate / 100));

  // Grand total
  const grandTotal = Math.max(0, round2(taxableAmount + taxAmount + shipping));

  // Balance due
  const balanceDue = Math.max(0, round2(grandTotal - amountPaid));

  return {
    subtotal,
    discountRate,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    shipping,
    grandTotal,
    amountPaid,
    balanceDue,
  };
}

/**
 * Format currency amount with symbol and thousand separators.
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  const formatted = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Validate required fields for an invoice document.
 */
export function validateInvoice(doc: Partial<InvoiceDocument>): InvoiceValidationResult {
  const errors: string[] = [];

  if (!doc.documentNumber || !doc.documentNumber.trim()) {
    errors.push('Document number is required');
  }

  if (!doc.sender?.name || !doc.sender.name.trim()) {
    errors.push('Sender business name is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a fresh default draft invoice.
 */
export function createDefaultInvoice(): InvoiceDocument {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 14);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return {
    id: `draft-${Date.now()}`,
    documentType: 'invoice',
    documentNumber: `INV-${today.getFullYear()}-${randomNum}`,
    issueDate: formatDate(today),
    dueDate: formatDate(dueDate),
    currency: '$',
    themeColor: '#1e293b',
    templateStyle: 'modern',
    sender: {
      name: 'Freelance Design & Engineering',
      email: 'alex@example.com',
      address: '123 Market Street, Suite 400\nSan Francisco, CA 94105',
      phone: '+1 (555) 019-2834',
      website: 'https://example.com',
      taxId: 'US-123456789',
    },
    recipient: {
      name: 'Acme Corporation',
      email: 'billing@acme.corp',
      address: '500 Technology Drive\nAustin, TX 78701',
      phone: '+1 (555) 987-6543',
    },
    items: [
      {
        id: 'item-1',
        description: 'Web Application Design & Architecture Consulting',
        quantity: 20,
        unitPrice: 95,
      },
      {
        id: 'item-2',
        description: 'Client-Side Vector PDF Engine Implementation',
        quantity: 12,
        unitPrice: 110,
      },
    ],
    taxRate: 8.25,
    discountRate: 0,
    shipping: 0,
    amountPaid: 0,
    notes: 'Thank you for your business! Payment is requested within 14 days.',
    paymentTerms: 'Payment via Bank ACH or Stripe Direct Wire.',
  };
}

/**
 * Serialize an invoice document to a JSON string.
 */
export function serializeDraft(doc: InvoiceDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Deserialize and validate an invoice document from JSON.
 */
export function deserializeDraft(jsonStr: string): InvoiceDocument | null {
  try {
    if (!jsonStr || !jsonStr.trim()) return null;
    const parsed = JSON.parse(jsonStr) as InvoiceDocument;
    if (
      typeof parsed !== 'object' ||
      !parsed.id ||
      !parsed.documentNumber ||
      !Array.isArray(parsed.items) ||
      !parsed.sender
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Parse hex color to RGB tuple.
 */
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return [r, g, b];
  }
  if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return [r, g, b];
  }
  return [30, 41, 59]; // fallback slate
}

/**
 * Generate a clean vector PDF using jsPDF.
 */
export async function generateInvoicePdf(
  doc: InvoiceDocument
): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }> {
  const isReceipt = doc.documentType === 'receipt';
  const isCompactReceipt = doc.templateStyle === 'receipt';
  const totals = calculateTotals(doc);
  const currency = doc.currency || '$';

  // Choose page format: receipt style can use 80mm roll or standard A4; standard A4 is most universally printable
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = isCompactReceipt ? 15 : 18;
  const contentWidth = pageWidth - margin * 2;

  const [themeR, themeG, themeB] = hexToRgb(doc.themeColor || '#1e293b');

  let y = margin;

  // 1. Header Banner or Accent Line
  if (doc.templateStyle === 'modern') {
    // Top colored accent bar
    pdf.setFillColor(themeR, themeG, themeB);
    pdf.rect(0, 0, pageWidth, 6, 'F');
    y = margin + 4;
  } else if (doc.templateStyle === 'classic') {
    // Elegant double rule
    pdf.setDrawColor(themeR, themeG, themeB);
    pdf.setLineWidth(1.2);
    pdf.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 8;
  }

  // 2. Company Logo & Document Header
  const titleText = isReceipt ? 'RECEIPT' : 'INVOICE';

  if (doc.sender.logoBase64 && doc.sender.logoBase64.startsWith('data:image/')) {
    try {
      const logoFormat = doc.sender.logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(doc.sender.logoBase64, logoFormat, margin, y, 28, 18, undefined, 'FAST');
    } catch {
      // Graceful fallback if image data is invalid
    }
  }

  // Right-aligned Document Title & Identifier
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(themeR, themeG, themeB);
  pdf.text(titleText, pageWidth - margin, y + 8, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`# ${doc.documentNumber}`, pageWidth - margin, y + 14, { align: 'right' });

  y += 24;

  // 3. Sender Details & Meta Information (Date, Due Date)
  const leftX = margin;
  const rightX = pageWidth - margin;

  // Sender details on left
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 41, 59);
  pdf.text(doc.sender.name || 'Sender', leftX, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);

  let senderY = y + 5;
  if (doc.sender.address) {
    const lines = doc.sender.address.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        pdf.text(line.trim(), leftX, senderY);
        senderY += 4.2;
      }
    }
  }
  if (doc.sender.email) {
    pdf.text(doc.sender.email, leftX, senderY);
    senderY += 4.2;
  }
  if (doc.sender.phone) {
    pdf.text(doc.sender.phone, leftX, senderY);
    senderY += 4.2;
  }
  if (doc.sender.taxId) {
    pdf.text(`Tax ID / VAT: ${doc.sender.taxId}`, leftX, senderY);
    senderY += 4.2;
  }

  // Meta Table on Right (Issue Date, Due Date, Status)
  let metaY = y;
  const labelX = rightX - 45;
  const valX = rightX;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Date of Issue:', labelX, metaY);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 41, 59);
  pdf.text(doc.issueDate || '-', valX, metaY, { align: 'right' });
  metaY += 5;

  if (!isReceipt && doc.dueDate) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Due Date:', labelX, metaY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);
    pdf.text(doc.dueDate, valX, metaY, { align: 'right' });
    metaY += 5;
  }

  if (totals.balanceDue === 0 && totals.grandTotal > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(16, 185, 129); // green paid tag
    pdf.text('Status:', labelX, metaY);
    pdf.text('PAID IN FULL', valX, metaY, { align: 'right' });
    metaY += 5;
  }

  y = Math.max(senderY, metaY) + 6;

  // 4. "Billed To" / "Recipient" Section
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(isReceipt ? 'ISSUED TO:' : 'BILLED TO:', margin + 6, y + 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.recipient.name || 'Valued Customer', margin + 6, y + 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  const recipientSub = [doc.recipient.email, doc.recipient.phone, doc.recipient.address]
    .filter(Boolean)
    .join(' • ');
  pdf.text(recipientSub || '-', margin + 6, y + 17);

  y += 28;

  // 5. Line Items Table Header
  const colXDesc = margin + 4;
  const colXQty = margin + contentWidth - 75;
  const colXPrice = margin + contentWidth - 45;
  const colXTotal = margin + contentWidth - 4;

  pdf.setFillColor(themeR, themeG, themeB);
  pdf.rect(margin, y, contentWidth, 8, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('ITEM & DESCRIPTION', colXDesc, y + 5.5);
  pdf.text('QTY', colXQty, y + 5.5, { align: 'right' });
  pdf.text('UNIT PRICE', colXPrice, y + 5.5, { align: 'right' });
  pdf.text('AMOUNT', colXTotal, y + 5.5, { align: 'right' });

  y += 8;

  // Line items rows
  pdf.setFontSize(9);
  for (let i = 0; i < doc.items.length; i++) {
    const item = doc.items[i];
    const itemAmount = (item.quantity || 0) * (item.unitPrice || 0);

    // Zebra striping
    if (i % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentWidth, 8.5, 'F');
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 41, 59);

    // Truncate long descriptions if needed to fit line
    const desc = pdf.splitTextToSize(item.description || 'Item', 90)[0] || '';
    pdf.text(desc, colXDesc, y + 5.5);

    pdf.text(String(item.quantity || 0), colXQty, y + 5.5, { align: 'right' });
    pdf.text(formatCurrency(item.unitPrice || 0, currency), colXPrice, y + 5.5, {
      align: 'right',
    });
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(itemAmount, currency), colXTotal, y + 5.5, { align: 'right' });

    // Subtle row divider line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 8.5, margin + contentWidth, y + 8.5);

    y += 8.5;
  }

  y += 4;

  // 6. Totals & Notes Section
  const totalsBoxWidth = 75;
  const totalsLeftX = pageWidth - margin - totalsBoxWidth;
  const totalsLabelX = totalsLeftX + 4;
  const totalsValX = pageWidth - margin - 4;

  // Notes on left side
  const notesWidth = contentWidth - totalsBoxWidth - 10;
  let notesY = y + 2;

  if (doc.notes || doc.paymentTerms) {
    if (doc.notes) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('NOTES & REMARKS', margin, notesY);
      notesY += 4.5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const splitNotes = pdf.splitTextToSize(doc.notes, notesWidth);
      pdf.text(splitNotes, margin, notesY);
      notesY += splitNotes.length * 4 + 4;
    }

    if (doc.paymentTerms) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text('PAYMENT INSTRUCTIONS', margin, notesY);
      notesY += 4.5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const splitTerms = pdf.splitTextToSize(doc.paymentTerms, notesWidth);
      pdf.text(splitTerms, margin, notesY);
    }
  }

  // Totals Breakdown Table on Right Side
  let currentTotalsY = y + 2;
  const rowHeight = 5.2;

  const drawTotalLine = (label: string, value: string, isBold = false) => {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(isBold ? 15 : 100, isBold ? 23 : 116, isBold ? 42 : 139);
    pdf.text(label, totalsLabelX, currentTotalsY);
    pdf.setTextColor(isBold ? 15 : 30, isBold ? 23 : 41, isBold ? 42 : 59);
    pdf.text(value, totalsValX, currentTotalsY, { align: 'right' });
    currentTotalsY += rowHeight;
  };

  drawTotalLine('Subtotal:', formatCurrency(totals.subtotal, currency));

  if (totals.discountAmount > 0) {
    drawTotalLine(
      `Discount (${totals.discountRate}%):`,
      `-${formatCurrency(totals.discountAmount, currency)}`
    );
  }

  if (totals.taxAmount > 0) {
    drawTotalLine(`Tax (${totals.taxRate}%):`, formatCurrency(totals.taxAmount, currency));
  }

  if (totals.shipping > 0) {
    drawTotalLine('Shipping / Fee:', formatCurrency(totals.shipping, currency));
  }

  // Grand Total highlight box
  currentTotalsY += 1;
  pdf.setFillColor(themeR, themeG, themeB);
  pdf.roundedRect(totalsLeftX, currentTotalsY - 1, totalsBoxWidth, 9, 1.5, 1.5, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL:', totalsLabelX + 2, currentTotalsY + 5.5);
  pdf.text(formatCurrency(totals.grandTotal, currency), totalsValX - 2, currentTotalsY + 5.5, {
    align: 'right',
  });

  currentTotalsY += 12;

  if (totals.amountPaid > 0) {
    drawTotalLine('Amount Paid:', formatCurrency(totals.amountPaid, currency));
  }

  if (totals.balanceDue > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(185, 28, 28); // red balance due
    pdf.text('Balance Due:', totalsLabelX, currentTotalsY);
    pdf.text(formatCurrency(totals.balanceDue, currency), totalsValX, currentTotalsY, {
      align: 'right',
    });
    currentTotalsY += rowHeight;
  }

  // 7. Footer Notice (Privacy by Architecture banner)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'Generated securely and private in-browser with PrivKnife • Zero server ingestion • Zero telemetry',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Return generated artifacts
  const blob = pdf.output('blob');
  const buffer = new Uint8Array(pdf.output('arraybuffer'));
  const dataUri = pdf.output('datauristring');

  return { blob, buffer, dataUri };
}
