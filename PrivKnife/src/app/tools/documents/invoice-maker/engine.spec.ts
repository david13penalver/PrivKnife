import { describe, expect, it } from 'vitest';
import {
  calculateTotals,
  createDefaultInvoice,
  deserializeDraft,
  formatCurrency,
  generateInvoicePdf,
  serializeDraft,
  validateInvoice,
} from './engine';
import { SAMPLE_INVOICE, SAMPLE_LOGO_BASE64, SAMPLE_RECEIPT } from './test-fixtures';
import { InvoiceDocument } from './types';

describe('InvoiceEngine (Seam 1: Calculation, Serialization & jsPDF Generation)', () => {
  describe('calculateTotals', () => {
    it('should accurately compute line item subtotals without floating point error', () => {
      const doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'> = {
        items: [
          { id: '1', description: 'Item A', quantity: 2, unitPrice: 19.99 },
          { id: '2', description: 'Item B', quantity: 3, unitPrice: 10.5 },
        ],
        taxRate: 0,
        discountRate: 0,
        shipping: 0,
        amountPaid: 0,
      };

      const totals = calculateTotals(doc);
      // 2 * 19.99 = 39.98, 3 * 10.50 = 31.50 => subtotal = 71.48
      expect(totals.subtotal).toBe(71.48);
      expect(totals.grandTotal).toBe(71.48);
      expect(totals.balanceDue).toBe(71.48);
    });

    it('should correctly apply percentage discount and tax on discounted amount', () => {
      const doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'> = {
        items: [{ id: '1', description: 'Consulting', quantity: 1, unitPrice: 1000 }],
        taxRate: 10, // 10%
        discountRate: 20, // 20%
        shipping: 50,
        amountPaid: 400,
      };

      const totals = calculateTotals(doc);
      // Subtotal = 1000
      // Discount = 20% of 1000 = 200
      // Taxable = 800
      // Tax = 10% of 800 = 80
      // Shipping = 50
      // Grand Total = 800 + 80 + 50 = 930
      // Balance Due = 930 - 400 = 530
      expect(totals.subtotal).toBe(1000);
      expect(totals.discountAmount).toBe(200);
      expect(totals.taxableAmount).toBe(800);
      expect(totals.taxAmount).toBe(80);
      expect(totals.shipping).toBe(50);
      expect(totals.grandTotal).toBe(930);
      expect(totals.amountPaid).toBe(400);
      expect(totals.balanceDue).toBe(530);
    });

    it('should clamp balance due to 0 when amount paid exceeds grand total', () => {
      const doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'> = {
        items: [{ id: '1', description: 'Coffee', quantity: 1, unitPrice: 5 }],
        taxRate: 0,
        discountRate: 0,
        shipping: 0,
        amountPaid: 20,
      };

      const totals = calculateTotals(doc);
      expect(totals.grandTotal).toBe(5);
      expect(totals.balanceDue).toBe(0);
    });

    it('should handle zero line items gracefully', () => {
      const doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'> = {
        items: [],
        taxRate: 15,
        discountRate: 10,
        shipping: 0,
        amountPaid: 0,
      };

      const totals = calculateTotals(doc);
      expect(totals.subtotal).toBe(0);
      expect(totals.discountAmount).toBe(0);
      expect(totals.taxAmount).toBe(0);
      expect(totals.grandTotal).toBe(0);
      expect(totals.balanceDue).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format amounts with symbol and 2 decimal places', () => {
      expect(formatCurrency(1234.5, '$')).toBe('$1,234.50');
      expect(formatCurrency(0, '€')).toBe('€0.00');
      expect(formatCurrency(99.99, '£')).toBe('£99.99');
    });
  });

  describe('serializeDraft & deserializeDraft', () => {
    it('should round-trip an invoice document faithfully', () => {
      const json = serializeDraft(SAMPLE_INVOICE);
      const parsed = deserializeDraft(json);

      expect(parsed).not.toBeNull();
      expect(parsed?.documentNumber).toBe(SAMPLE_INVOICE.documentNumber);
      expect(parsed?.items.length).toBe(SAMPLE_INVOICE.items.length);
      expect(parsed?.sender.name).toBe(SAMPLE_INVOICE.sender.name);
    });

    it('should return null when deserializing malformed JSON or invalid schema', () => {
      expect(deserializeDraft('{"invalid": true')).toBeNull();
      expect(deserializeDraft('{"randomKey": 123}')).toBeNull();
      expect(deserializeDraft('')).toBeNull();
    });
  });

  describe('validateInvoice', () => {
    it('should return valid for a complete invoice', () => {
      const res = validateInvoice(SAMPLE_INVOICE);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('should return errors for missing document number or sender name', () => {
      const invalid = { ...SAMPLE_INVOICE, documentNumber: '', sender: { ...SAMPLE_INVOICE.sender, name: '' } };
      const res = validateInvoice(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Document number is required');
      expect(res.errors).toContain('Sender business name is required');
    });
  });

  describe('createDefaultInvoice', () => {
    it('should create an initial invoice with valid defaults and non-empty items', () => {
      const draft = createDefaultInvoice();
      expect(draft.id).toBeDefined();
      expect(draft.documentNumber).toMatch(/^INV-\d{4}-\d+/);
      expect(draft.items.length).toBeGreaterThan(0);
      expect(draft.currency).toBe('$');
    });
  });

  describe('generateInvoicePdf', () => {
    it('should generate a valid vector PDF for modern invoice with logo', async () => {
      const result = await generateInvoicePdf(SAMPLE_INVOICE);
      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/pdf');
      expect(result.buffer.byteLength).toBeGreaterThan(100);
      expect(result.dataUri).toContain('data:application/pdf');

      // Check PDF header signature (%PDF-)
      const headerStr = new TextDecoder().decode(result.buffer.slice(0, 5));
      expect(headerStr).toBe('%PDF-');
    });

    it('should generate a valid vector PDF for receipt style with euro symbol', async () => {
      const result = await generateInvoicePdf(SAMPLE_RECEIPT);
      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(100);

      const headerStr = new TextDecoder().decode(result.buffer.slice(0, 5));
      expect(headerStr).toBe('%PDF-');
    });

    it('should generate a valid vector PDF for classic template without logo', async () => {
      const classicInvoice: InvoiceDocument = {
        ...SAMPLE_INVOICE,
        templateStyle: 'classic',
        sender: {
          ...SAMPLE_INVOICE.sender,
          logoBase64: undefined,
        },
      };

      const result = await generateInvoicePdf(classicInvoice);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(100);
    });
  });
});
