import { InvoiceDocument } from './types';

/**
 * 1x1 pixel PNG data URL for testing logo embedding client-side.
 */
export const SAMPLE_LOGO_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const SAMPLE_INVOICE: InvoiceDocument = {
  id: 'inv-sample-1',
  documentType: 'invoice',
  documentNumber: 'INV-2026-001',
  issueDate: '2026-10-11',
  dueDate: '2026-10-25',
  currency: '$',
  themeColor: '#1e293b',
  templateStyle: 'modern',
  sender: {
    name: 'Apex Studio Design LLC',
    email: 'billing@apexstudio.design',
    address: '742 Evergreen Terrace, Suite 100, Springfield, OR',
    phone: '+1 (555) 234-5678',
    website: 'https://apexstudio.design',
    taxId: 'US-987654321',
    logoBase64: SAMPLE_LOGO_BASE64,
  },
  recipient: {
    name: 'Acme Global Ventures',
    email: 'accounts@acmeglobal.io',
    address: '100 Market Street, 14th Floor, San Francisco, CA 94105',
    phone: '+1 (415) 890-1234',
  },
  items: [
    {
      id: 'item-1',
      description: 'Web Application UI/UX Design System & Prototypes',
      quantity: 40,
      unitPrice: 120,
    },
    {
      id: 'item-2',
      description: 'Frontend Architecture Consultation (Angular Signals & Web Workers)',
      quantity: 15,
      unitPrice: 150,
    },
    {
      id: 'item-3',
      description: 'Client-Side PDF Compilation & Privacy Hardening',
      quantity: 10,
      unitPrice: 140,
    },
  ],
  taxRate: 8.5,
  discountRate: 5,
  shipping: 50,
  amountPaid: 2000,
  notes: 'Thank you for your business! Please wire payments within 14 days of issue.',
  paymentTerms: 'Bank Wire / ACH: First National Bank • Routing: 123456789 • Account: 9876543210',
};

export const SAMPLE_RECEIPT: InvoiceDocument = {
  id: 'rec-sample-1',
  documentType: 'receipt',
  documentNumber: 'REC-2026-894',
  issueDate: '2026-10-11',
  dueDate: '2026-10-11',
  currency: '€',
  themeColor: '#065f46',
  templateStyle: 'receipt',
  sender: {
    name: 'Alpine Artisan Coffee & Bakery',
    email: 'hello@alpinecoffee.eu',
    address: 'Bahnhofstrasse 42, 8001 Zurich, Switzerland',
    phone: '+41 44 123 4567',
    website: 'https://alpinecoffee.eu',
    taxId: 'CHE-112.345.678 MWST',
  },
  recipient: {
    name: 'Walk-in Customer',
    email: 'guest@example.com',
    address: 'Counter Order #42',
    phone: '',
  },
  items: [
    {
      id: 'rec-1',
      description: 'Specialty Single-Origin Espresso Roast (250g)',
      quantity: 2,
      unitPrice: 14.5,
    },
    {
      id: 'rec-2',
      description: 'Almond Croissant',
      quantity: 3,
      unitPrice: 4.2,
    },
  ],
  taxRate: 7.7,
  discountRate: 0,
  shipping: 0,
  amountPaid: 44.8, // fully paid
  notes: 'Payment confirmed via Contactless Card Terminal. Keep this receipt for warranty and tax purposes.',
  paymentTerms: 'PAID IN FULL — Authorization: #TX-998812',
};
