import { LocalOcrTextExtractorOptions } from './types';

export const DEFAULT_OCR_OPTIONS: LocalOcrTextExtractorOptions = {
  ocrLanguage: 'eng',
  pageSegmentationMode: 'auto',
  cleanIrregularLinebreaks: true,
  preserveTableSpacing: true,
  exportFormat: 'txt',
  binarizeThreshold: 128,
  enhanceContrast: true,
};

export const MARKDOWN_OCR_OPTIONS: LocalOcrTextExtractorOptions = {
  ocrLanguage: 'spa',
  pageSegmentationMode: 'single_block',
  cleanIrregularLinebreaks: true,
  preserveTableSpacing: true,
  exportFormat: 'markdown',
  binarizeThreshold: 140,
  enhanceContrast: true,
};

export const DOCX_OCR_OPTIONS: LocalOcrTextExtractorOptions = {
  ocrLanguage: 'fra',
  pageSegmentationMode: 'auto',
  cleanIrregularLinebreaks: false,
  preserveTableSpacing: false,
  exportFormat: 'docx',
};

export const SAMPLE_SCANNED_RECEIPT_TEXT = `OFFICE SUPPLIES STORE #441
Date: 2026-10-14  Time: 14:32

Item                 Qty     Price     Total
--------------------------------------------
Laser Paper A4       2       $12.50    $25.00
Gel Pens (12pk)      1       $8.99     $8.99
Wireless Mouse       1       $19.99    $19.99
--------------------------------------------
SUBTOTAL:                             $53.98
TAX (8%):                              $4.32
TOTAL:                                $58.30

Thank you for your purchase!
`;

export const SAMPLE_MULTI_PAGE_TEXT = [
  `PRIVACY-FIRST COMPUTING IN THE BROWSER
Section 1: Zero Cloud Ingestion
Modern web applications can execute complex mathematical and algorithmic transformations
without transmitting confidential user records or media to third-party endpoints.`,
  `Section 2: Offline Document Analysis
Local Optical Character Recognition allows clients to scan legal contracts, medical forms,
and financial statements securely without regulatory compliance breaches.`,
];

export function createSyntheticImageFile(
  name: string = 'scanned-invoice.png',
  byteSize: number = 2048
): File {
  const bytes = new Uint8Array(byteSize);
  for (let i = 0; i < byteSize; i++) {
    bytes[i] = (i * 7) % 256;
  }
  return new File([bytes], name, { type: 'image/png' });
}

export function createSyntheticPdfFile(
  name: string = 'legal-agreement.pdf',
  byteSize: number = 4096
): File {
  const bytes = new Uint8Array(byteSize);
  for (let i = 0; i < byteSize; i++) {
    bytes[i] = (i * 13) % 256;
  }
  return new File([bytes], name, { type: 'application/pdf' });
}
