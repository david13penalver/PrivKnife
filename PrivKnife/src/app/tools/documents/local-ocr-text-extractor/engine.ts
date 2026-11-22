import JSZip from 'jszip';

import {
  ExtractedPageResult,
  LocalOcrTextExtractorOptions,
  LocalOcrTextExtractorResult,
} from './types';

const SUPPORTED_LANGUAGES = ['eng', 'spa', 'fra', 'deu', 'ita', 'por'];
const SUPPORTED_SEGMENTATION = ['auto', 'single_block', 'single_line'];
const SUPPORTED_FORMATS = ['txt', 'markdown', 'docx'];

// -------------------------------------------------------------
// 1. Validation Guardrails & Environment Helpers
// -------------------------------------------------------------
export function validateOcrOptions(options: LocalOcrTextExtractorOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'OCR options are required' };
  }

  if (!SUPPORTED_LANGUAGES.includes(options.ocrLanguage)) {
    return {
      valid: false,
      error: `Unsupported language: ${options.ocrLanguage}. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
    };
  }

  if (!SUPPORTED_SEGMENTATION.includes(options.pageSegmentationMode)) {
    return {
      valid: false,
      error: `Unsupported segmentation mode: ${options.pageSegmentationMode}`,
    };
  }

  if (!SUPPORTED_FORMATS.includes(options.exportFormat)) {
    return {
      valid: false,
      error: `Unsupported export format: ${options.exportFormat}. Must be 'txt', 'markdown', or 'docx'`,
    };
  }

  if (
    options.binarizeThreshold !== undefined &&
    (typeof options.binarizeThreshold !== 'number' ||
      options.binarizeThreshold < 0 ||
      options.binarizeThreshold > 255)
  ) {
    return {
      valid: false,
      error: 'Binarize threshold must be between 0 and 255',
    };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Image Preprocessing Pipeline
// -------------------------------------------------------------
export function preprocessImageBuffer(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    enhanceContrast?: boolean;
    binarizeThreshold?: number;
  }
): Uint8ClampedArray {
  const pixelCount = width * height;
  if (pixelCount <= 0 || data.length < pixelCount * 4) {
    return data;
  }

  // Pass 1: compute luminance values
  const lums = new Uint8ClampedArray(pixelCount);
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    // Standard Rec. 601 luminance
    const lum = Math.round(
      0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
    );
    lums[i] = lum;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum;
  const shouldStretch = options.enhanceContrast && range > 0 && range < 240;
  const threshold = options.binarizeThreshold;

  // Pass 2: apply contrast stretch and/or binarization
  for (let i = 0; i < pixelCount; i++) {
    let val = lums[i];

    if (shouldStretch) {
      val = Math.round(((val - minLum) * 255) / range);
    }

    if (threshold !== undefined) {
      val = val >= threshold ? 255 : 0;
    }

    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    // Alpha remains 255
    data[idx + 3] = 255;
  }

  return data;
}

// -------------------------------------------------------------
// 3. Text Cleaning & Formatting
// -------------------------------------------------------------
export function cleanExtractedText(
  rawText: string,
  options: Pick<
    LocalOcrTextExtractorOptions,
    'cleanIrregularLinebreaks' | 'preserveTableSpacing'
  >
): string {
  if (!rawText) return '';

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  if (options.cleanIrregularLinebreaks) {
    text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
  }

  if (options.preserveTableSpacing) {
    text = text
      .split('\n')
      .map((line) => line.replace(/[ ]{3,}/g, '\t'))
      .join('\n');
  }

  return text;
}

// -------------------------------------------------------------
// 7. Deliverable Package Builders (.txt, .md, .docx)
// -------------------------------------------------------------
export function buildTxtDeliverable(pages: ExtractedPageResult[]): string {
  if (pages.length === 1) {
    return pages[0].text;
  }
  return pages
    .map(
      (p) =>
        `--- Page ${p.pageNumber} ---\n\n${p.text.trim()}\n`
    )
    .join('\n');
}

export function buildMarkdownDeliverable(
  pages: ExtractedPageResult[],
  title: string = 'Extracted Document'
): string {
  const sections: string[] = [`# ${title}\n`];

  for (const page of pages) {
    sections.push(`## Page ${page.pageNumber}\n`);
    sections.push(`${page.text.trim()}\n`);
  }

  return sections.join('\n');
}

export async function buildDocxDeliverable(
  pages: ExtractedPageResult[],
  title: string = 'Extracted Document'
): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  // 3. word/document.xml
  let documentBody = '';
  documentBody += `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>`;

  for (const page of pages) {
    if (pages.length > 1) {
      documentBody += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Page ${page.pageNumber}</w:t></w:r></w:p>`;
    }
    for (const line of page.lines) {
      documentBody += `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentBody}
  </w:body>
</w:document>`;
  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// -------------------------------------------------------------
// 8. File Reading & Local OCR Processing Pipeline
// -------------------------------------------------------------
export async function processLocalOcr(
  source: File | Blob | string,
  options: LocalOcrTextExtractorOptions,
  originalFileName: string = 'document.png',
  onProgress?: (percent: number) => void,
): Promise<LocalOcrTextExtractorResult> {
  const validation = validateOcrOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid OCR options');
  }

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  const isPdf =
    originalFileName.toLowerCase().endsWith('.pdf') ||
    (typeof source !== 'string' &&
      'type' in source &&
      source.type === 'application/pdf');

  const normalizedPage = (pageNumber: number, text: string, confidence: number): ExtractedPageResult => {
    const cleaned = cleanExtractedText(text, options);
    return { pageNumber, text: cleaned, confidence, lines: cleaned ? cleaned.split('\n') : [] };
  };
  const pages = typeof source === 'string'
    ? source.split(/--- Page \d+ ---|\f/).map((page, index) => normalizedPage(index + 1, page, 100))
    : await (await import('./raster-ocr')).recognizeDocument(source, isPdf, options, onProgress)
      .then((recognized) => recognized.map((page) => normalizedPage(page.pageNumber, page.text, page.confidence)));
  const cleaned = pages.map(({ text }) => text).filter(Boolean).join('\n\n');
  if (!cleaned) throw new Error('noText');

  // Format deliverable based on exportFormat
  let deliverableBlob: Blob;
  let outFileName: string;
  let mimeType: string;

  switch (options.exportFormat) {
    case 'markdown':
      const mdContent = buildMarkdownDeliverable(pages, baseName);
      deliverableBlob = new Blob([mdContent], { type: 'text/markdown' });
      outFileName = `${baseName}-ocr.md`;
      mimeType = 'text/markdown';
      break;

    case 'docx':
      deliverableBlob = await buildDocxDeliverable(pages, baseName);
      outFileName = `${baseName}-ocr.docx`;
      mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;

    case 'txt':
    default:
      const txtContent = buildTxtDeliverable(pages);
      deliverableBlob = new Blob([txtContent], { type: 'text/plain' });
      outFileName = `${baseName}-ocr.txt`;
      mimeType = 'text/plain';
      break;
  }

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  const characterCount = cleaned.length;
  const avgConf = Math.round(
    pages.reduce((acc, p) => acc + p.confidence, 0) / pages.length
  );

  return {
    success: true,
    blob: deliverableBlob,
    fileName: outFileName,
    fileSize: deliverableBlob.size,
    mimeType,
    extractedText: cleaned,
    pages,
    metadata: {
      pageCount: pages.length,
      averageConfidence: avgConf,
      wordCount,
      characterCount,
      language: options.ocrLanguage,
      format: options.exportFormat,
    },
  };
}
