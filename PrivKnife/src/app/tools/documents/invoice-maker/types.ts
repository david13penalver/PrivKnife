export type DocumentType = 'invoice' | 'receipt';
export type TemplateStyle = 'modern' | 'classic' | 'receipt';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AU$)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
];

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'slate', name: 'Zinc / Slate', hex: '#1e293b' },
  { id: 'indigo', name: 'Navy / Indigo', hex: '#1e3a8a' },
  { id: 'emerald', name: 'Forest / Emerald', hex: '#065f46' },
  { id: 'rose', name: 'Crimson / Rose', hex: '#9f1239' },
  { id: 'amber', name: 'Charcoal / Warm', hex: '#374151' },
];

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceSender {
  name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
  taxId: string;
  logoBase64?: string;
}

export interface InvoiceRecipient {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export interface InvoiceDocument {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  themeColor: string;
  templateStyle: TemplateStyle;
  sender: InvoiceSender;
  recipient: InvoiceRecipient;
  items: InvoiceLineItem[];
  taxRate: number; // percentage, e.g. 10 = 10%
  discountRate: number; // percentage, e.g. 5 = 5%
  shipping: number;
  amountPaid: number;
  notes: string;
  paymentTerms: string;
}

export interface InvoiceTotals {
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  shipping: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

export interface InvoiceValidationResult {
  valid: boolean;
  errors: string[];
}
