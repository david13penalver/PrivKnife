import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
} from 'pdf-lib';
import { runQpdfCommand } from '../../../core/pdf/qpdf-runner';
import {
  ArchivalCheckItem,
  DEFAULT_PDF_REPAIR_OPTIONS,
  EMPTY_PDF_METADATA,
  PdfHealthReport,
  PdfMetadataFields,
  PdfRepairDeps,
  PdfRepairMetadataOptions,
  PdfRepairMetadataResult,
  RenderedArchivalPageImage,
} from './types';

function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function encodeAscii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0x7f;
  }
  return out;
}

function buildIccDescTag(description: string): Uint8Array {
  const asciiBytes = encodeAscii(`${description}\0`);
  // ICC 'desc' tag: sig(4) + reserved(4) + count(4) + ascii + unicodeLang(4) + unicodeCount(4) + script(2+1+67)
  const totalLen = 12 + asciiBytes.length + 4 + 4 + 2 + 1 + 67;
  const buf = new Uint8Array(totalLen);
  const view = new DataView(buf.buffer);
  buf.set(encodeAscii('desc'), 0);
  view.setUint32(8, asciiBytes.length, false);
  buf.set(asciiBytes, 12);
  return buf;
}

function buildIccTextTag(text: string): Uint8Array {
  const asciiBytes = encodeAscii(`${text}\0`);
  const buf = new Uint8Array(8 + asciiBytes.length);
  buf.set(encodeAscii('text'), 0);
  buf.set(asciiBytes, 8);
  return buf;
}

function buildIccXyzTag(xFix: number, yFix: number, zFix: number): Uint8Array {
  const buf = new Uint8Array(20);
  const view = new DataView(buf.buffer);
  buf.set(encodeAscii('XYZ '), 0);
  view.setInt32(8, xFix, false);
  view.setInt32(12, yFix, false);
  view.setInt32(16, zFix, false);
  return buf;
}

function buildIccGammaCurvTag(gamma: number): Uint8Array {
  // 'curv'(4) + reserved(4) + count=1(4) + u8Fixed8 gamma(2) = 14 bytes
  const buf = new Uint8Array(14);
  const view = new DataView(buf.buffer);
  buf.set(encodeAscii('curv'), 0);
  view.setUint32(8, 1, false);
  view.setUint16(12, Math.round(gamma * 256), false);
  return buf;
}

/**
 * Generates a compact, structurally compliant ICC v2.1.0 sRGB display profile (~470 bytes).
 */
export function buildMinimalSrgbIccProfile(): Uint8Array {
  const tags: Array<{ sig: string; data: Uint8Array }> = [
    { sig: 'desc', data: buildIccDescTag('sRGB IEC61966-2.1') },
    { sig: 'cprt', data: buildIccTextTag('Public Domain - PrivKnife Local sRGB') },
    { sig: 'wtpt', data: buildIccXyzTag(0x0000f6d6, 0x00010000, 0x0000d32d) }, // D50
    { sig: 'rXYZ', data: buildIccXyzTag(0x00006fa2, 0x000038f5, 0x00000390) },
    { sig: 'gXYZ', data: buildIccXyzTag(0x00006299, 0x0000b785, 0x000018da) },
    { sig: 'bXYZ', data: buildIccXyzTag(0x000024a0, 0x00000f84, 0x0000b6cf) },
    { sig: 'rTRC', data: buildIccGammaCurvTag(2.2) },
    { sig: 'gTRC', data: buildIccGammaCurvTag(2.2) },
    { sig: 'bTRC', data: buildIccGammaCurvTag(2.2) },
  ];

  const headerSize = 128;
  const tagTableSize = 4 + tags.length * 12;
  let dataCursor = headerSize + tagTableSize;
  const tagEntries: Array<{ sig: string; offset: number; size: number; padded: Uint8Array }> = [];

  for (const tag of tags) {
    const paddedSize = (tag.data.length + 3) & ~3;
    const padded = new Uint8Array(paddedSize);
    padded.set(tag.data, 0);
    tagEntries.push({
      sig: tag.sig,
      offset: dataCursor,
      size: tag.data.length,
      padded,
    });
    dataCursor += paddedSize;
  }

  const profile = new Uint8Array(dataCursor);
  const view = new DataView(profile.buffer);

  // 128-byte ICC Header
  view.setUint32(0, dataCursor, false); // Total size
  profile.set(encodeAscii('PRIV'), 4); // Preferred CMM
  view.setUint32(8, 0x02100000, false); // Version 2.1.0.0
  profile.set(encodeAscii('mntr'), 12); // Display device class
  profile.set(encodeAscii('RGB '), 16); // Data color space
  profile.set(encodeAscii('XYZ '), 20); // PCS
  view.setUint16(24, 2026, false);
  view.setUint16(26, 1, false);
  view.setUint16(28, 1, false);
  profile.set(encodeAscii('acsp'), 36); // Magic signature
  // PCS Illuminant D50 (X=0.9642, Y=1.0, Z=0.8249)
  view.setInt32(68, 0x0000f6d6, false);
  view.setInt32(72, 0x00010000, false);
  view.setInt32(76, 0x0000d32d, false);

  // Tag count & table
  view.setUint32(headerSize, tagEntries.length, false);
  for (let i = 0; i < tagEntries.length; i++) {
    const entry = tagEntries[i];
    const rowPos = headerSize + 4 + i * 12;
    profile.set(encodeAscii(entry.sig), rowPos);
    view.setUint32(rowPos + 4, entry.offset, false);
    view.setUint32(rowPos + 8, entry.size, false);
    profile.set(entry.padded, entry.offset);
  }

  return profile;
}

/**
 * Generates an uncompressed ISO 19005-2 (PDF/A-2b) XMP metadata packet
 * synchronized with Document Info properties.
 */
export function buildPdfA2bXmpPacket(
  fields: PdfMetadataFields,
  isoTimestamp = '2026-01-01T00:00:00Z'
): string {
  const title = escapeXml(fields.title || '');
  const author = escapeXml(fields.author || '');
  const subject = escapeXml(fields.subject || '');
  const keywords = escapeXml(fields.keywords || '');
  const creator = escapeXml(fields.creator || 'PrivKnife');
  const producer = escapeXml(fields.producer || 'PrivKnife Local PDF/A Packager');
  const safeDate = escapeXml(isoTimestamp);

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <pdfaid:part>2</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${title}</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${subject}</rdf:li>
        </rdf:Alt>
      </dc:description>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>${author}</rdf:li>
        </rdf:Seq>
      </dc:creator>
      <pdf:Keywords>${keywords}</pdf:Keywords>
      <pdf:Producer>${producer}</pdf:Producer>
      <xmp:CreatorTool>${creator}</xmp:CreatorTool>
      <xmp:CreateDate>${safeDate}</xmp:CreateDate>
      <xmp:ModifyDate>${safeDate}</xmp:ModifyDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export function locatePdfHeader(bytes: Uint8Array): {
  offset: number;
  version: string;
} {
  if (!bytes || bytes.byteLength === 0) {
    throw new Error('Input file is empty (0 bytes).');
  }

  const limit = Math.min(bytes.byteLength - 7, 65536);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      const ver = String.fromCharCode(
        bytes[i + 5] ?? 0x31,
        bytes[i + 6] ?? 0x2e,
        bytes[i + 7] ?? 0x37
      );
      return { offset: i, version: /^\d\.\d$/.test(ver) ? ver : '1.7' };
    }
  }

  // Sniff common non-PDF signatures to provide a transparent diagnostic error
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    throw new Error('Missing %PDF header — detected PNG image signature.');
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    throw new Error('Missing %PDF header — detected JPEG image signature.');
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new Error('Missing %PDF header — detected ZIP/Office archive signature.');
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    throw new Error('Missing %PDF header — detected GIF image signature.');
  }

  throw new Error('Missing %PDF header — file does not appear to be a PDF document.');
}

function lookupDict(doc: PDFDocument, val: unknown): PDFDict | null {
  const resolved = val instanceof PDFRef ? doc.context.lookup(val) : val;
  return resolved instanceof PDFDict ? resolved : null;
}

function isDangerousActionDict(doc: PDFDocument, actionVal: unknown): boolean {
  const dict = lookupDict(doc, actionVal);
  if (!dict) return false;
  const s = dict.get(PDFName.of('S'));
  if (!(s instanceof PDFName)) return false;
  const actionName = s.decodeText();
  return (
    actionName === 'JavaScript' ||
    actionName === 'Launch' ||
    actionName === 'Sound' ||
    actionName === 'Movie' ||
    actionName === 'Rendition' ||
    actionName === 'ImportData'
  );
}

function detectJavaScriptOrActiveContent(doc: PDFDocument): boolean {
  const catalog = doc.catalog;
  if (catalog.has(PDFName.of('OpenAction'))) return true;
  if (catalog.has(PDFName.of('AA'))) return true;
  if (catalog.has(PDFName.of('JavaScript'))) return true;

  const namesDict = lookupDict(doc, catalog.get(PDFName.of('Names')));
  if (namesDict && namesDict.has(PDFName.of('JavaScript'))) {
    return true;
  }

  const acroFormDict = lookupDict(doc, catalog.get(PDFName.of('AcroForm')));
  if (acroFormDict) {
    const fieldsVal = doc.context.lookup(acroFormDict.get(PDFName.of('Fields')));
    if (fieldsVal instanceof PDFArray) {
      for (let i = 0; i < fieldsVal.size(); i++) {
        const fDict = lookupDict(doc, fieldsVal.get(i));
        if (!fDict) continue;
        if (fDict.has(PDFName.of('AA'))) return true;
        if (isDangerousActionDict(doc, fDict.get(PDFName.of('A')))) return true;
      }
    }
  }

  for (const page of doc.getPages()) {
    if (page.node.has(PDFName.of('AA'))) return true;
    const annotsVal = page.node.get(PDFName.of('Annots'));
    const resolvedAnnots =
      annotsVal instanceof PDFRef ? doc.context.lookup(annotsVal) : annotsVal;
    if (resolvedAnnots instanceof PDFArray) {
      for (let i = 0; i < resolvedAnnots.size(); i++) {
        const annotDict = lookupDict(doc, resolvedAnnots.get(i));
        if (!annotDict) continue;
        if (annotDict.has(PDFName.of('AA'))) return true;
        if (isDangerousActionDict(doc, annotDict.get(PDFName.of('A')))) return true;
      }
    }
  }

  return false;
}

function detectPieceInfo(doc: PDFDocument): boolean {
  if (doc.catalog.has(PDFName.of('PieceInfo'))) return true;
  for (const page of doc.getPages()) {
    if (page.node.has(PDFName.of('PieceInfo'))) return true;
  }
  return false;
}

function countUnembeddedFonts(doc: PDFDocument): number {
  const checkedFontRefs = new Set<string>();
  let unembedded = 0;

  for (const page of doc.getPages()) {
    const resDict = lookupDict(doc, page.node.get(PDFName.of('Resources')));
    if (!resDict) continue;
    const fontDict = lookupDict(doc, resDict.get(PDFName.of('Font')));
    if (!fontDict) continue;

    for (const key of fontDict.keys()) {
      const rawRefOrDict = fontDict.get(key);
      const refKey =
        rawRefOrDict instanceof PDFRef ? rawRefOrDict.toString() : `${key.asString()}`;
      if (checkedFontRefs.has(refKey)) continue;
      checkedFontRefs.add(refKey);

      const fDict = lookupDict(doc, rawRefOrDict);
      if (!fDict) continue;
      const subtypeVal = fDict.get(PDFName.of('Subtype'));
      const subtype = subtypeVal instanceof PDFName ? subtypeVal.decodeText() : '';

      // Type3 fonts define CharProcs inline; check Type0 DescendantFonts if composite
      if (subtype === 'Type3') continue;

      if (subtype === 'Type0') {
        const descendants = doc.context.lookup(fDict.get(PDFName.of('DescendantFonts')));
        if (descendants instanceof PDFArray && descendants.size() > 0) {
          const cidFont = lookupDict(doc, descendants.get(0));
          const cidDesc = cidFont
            ? lookupDict(doc, cidFont.get(PDFName.of('FontDescriptor')))
            : null;
          if (
            !cidDesc ||
            (!cidDesc.has(PDFName.of('FontFile')) &&
              !cidDesc.has(PDFName.of('FontFile2')) &&
              !cidDesc.has(PDFName.of('FontFile3')))
          ) {
            unembedded++;
          }
          continue;
        }
      }

      const descriptor = lookupDict(doc, fDict.get(PDFName.of('FontDescriptor')));
      if (
        !descriptor ||
        (!descriptor.has(PDFName.of('FontFile')) &&
          !descriptor.has(PDFName.of('FontFile2')) &&
          !descriptor.has(PDFName.of('FontFile3')))
      ) {
        unembedded++;
      }
    }
  }

  return unembedded;
}

function readRawXmpSize(doc: PDFDocument): number {
  const metaVal = doc.catalog.get(PDFName.of('Metadata'));
  if (!metaVal) return 0;
  const resolved = metaVal instanceof PDFRef ? doc.context.lookup(metaVal) : metaVal;
  if (resolved instanceof PDFRawStream) {
    return resolved.contents.byteLength;
  }
  return 0;
}

export function extractMetadataFromPdfDoc(doc: PDFDocument): PdfMetadataFields {
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
  };
}

function filterDiagnosticLines(stdout: string, stderr: string): string[] {
  const combined = `${stderr}\n${stdout}`
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('checking ') &&
        !l.startsWith('No syntax or stream encoding errors') &&
        !l.startsWith('errors that qpdf cannot detect') &&
        !l.startsWith('may still contain')
    );
  return combined.slice(0, 20);
}

/**
 * Inspects PDF structural integrity, leading garbage offset, linearization,
 * active JavaScript/launch actions, embedded font state, and Document/XMP metadata.
 */
export async function inspectPdfHealth(
  rawBytes: Uint8Array
): Promise<PdfHealthReport> {
  const headerInfo = locatePdfHeader(rawBytes);
  const leadingGarbageBytes = headerInfo.offset;
  const trimmedBytes =
    leadingGarbageBytes > 0 ? rawBytes.subarray(leadingGarbageBytes) : rawBytes;

  // Run QPDF --check on the original raw bytes first so garbage/XRef warnings surface
  const qpdfCheck = await runQpdfCommand(
    rawBytes,
    (inPath) => ['--check', inPath],
    { readOutput: false }
  );

  // If leading garbage masked structural XRef warnings, also check trimmed payload
  let qpdfTrimmedCheck = qpdfCheck;
  if (leadingGarbageBytes > 0) {
    qpdfTrimmedCheck = await runQpdfCommand(
      trimmedBytes,
      (inPath) => ['--check', inPath],
      { readOutput: false }
    );
  }

  const combinedStdout = `${qpdfCheck.stdout}\n${qpdfTrimmedCheck.stdout}`;
  const combinedStderr = `${qpdfCheck.stderr}\n${qpdfTrimmedCheck.stderr}`;
  const hasQpdfWarning =
    qpdfCheck.exitCode !== 0 ||
    qpdfTrimmedCheck.exitCode !== 0 ||
    /warning|damaged|error|reconstruct|xref|offset/i.test(combinedStderr) ||
    /warning|reconstruct|xref/i.test(combinedStdout);

  const isLinearized = /File is linearized/i.test(combinedStdout);
  const isEncryptedFlag = /File is encrypted/i.test(combinedStdout);
  const versionMatch = /PDF Version:\s*([0-9]+\.[0-9]+)/i.exec(combinedStdout);
  const pdfVersion = versionMatch?.[1] ?? headerInfo.version;

  let loadedDoc: PDFDocument | null = null;
  try {
    loadedDoc = await PDFDocument.load(trimmedBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
  } catch {
    // Attempt non-linearized QPDF salvage solely for inspection
    const salvaged = await runQpdfCommand(trimmedBytes, (inP, outP) => [
      '--warning-exit-0',
      inP,
      outP,
    ]);
    if (salvaged.outputBytes && salvaged.outputBytes.byteLength > 0) {
      try {
        loadedDoc = await PDFDocument.load(salvaged.outputBytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: false,
        });
      } catch {
        loadedDoc = null;
      }
    }
  }

  if (!loadedDoc) {
    return {
      pdfVersion,
      pageCount: 0,
      isLinearized,
      isEncrypted: isEncryptedFlag,
      hasXrefWarnings: true,
      hasJavaScriptOrActions: false,
      leadingGarbageBytes,
      metadata: { ...EMPTY_PDF_METADATA },
      rawXmpBytes: 0,
      qpdfDiagnostics: filterDiagnosticLines(combinedStdout, combinedStderr),
      healthStatus: 'corrupted',
      hasPieceInfo: false,
      unembeddedFontsCount: 0,
    };
  }

  const hasJavaScriptOrActions = detectJavaScriptOrActiveContent(loadedDoc);
  const hasPieceInfo = detectPieceInfo(loadedDoc);
  const rawXmpBytes = readRawXmpSize(loadedDoc);
  const metadata = extractMetadataFromPdfDoc(loadedDoc);
  const unembeddedFontsCount = countUnembeddedFonts(loadedDoc);
  const isEncrypted = isEncryptedFlag || loadedDoc.isEncrypted;
  const pageCount = loadedDoc.getPageCount();
  const hasXrefWarnings = hasQpdfWarning || leadingGarbageBytes > 0;

  let healthStatus: PdfHealthReport['healthStatus'] = 'healthy';
  if (pageCount === 0) {
    healthStatus = 'corrupted';
  } else if (hasXrefWarnings || hasJavaScriptOrActions || isEncrypted) {
    healthStatus = 'recoverable';
  }

  return {
    pdfVersion,
    pageCount,
    isLinearized,
    isEncrypted,
    hasXrefWarnings,
    hasJavaScriptOrActions,
    leadingGarbageBytes,
    metadata,
    rawXmpBytes,
    qpdfDiagnostics: filterDiagnosticLines(combinedStdout, combinedStderr),
    healthStatus,
    hasPieceInfo,
    unembeddedFontsCount,
  };
}

// ============================================================================
// Seam 1B: Structural Recovery, Metadata Sanitization & PDF/A-2b Packaging
// ============================================================================

function toSameRealmUint8Array(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function deriveOutputPdfName(
  sourceFileName: string,
  options: PdfRepairMetadataOptions
): string {
  const cleanBase = (sourceFileName || 'document.pdf')
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
  const suffix =
    options.mode === 'pdfa'
      ? '_pdfa'
      : options.mode === 'metadata' && options.scrubAllMetadata
        ? '_scrubbed'
        : options.mode === 'metadata'
          ? '_metadata'
          : '_repaired';
  return `${cleanBase || 'document'}${suffix}.pdf`;
}

function stripForbiddenPdfFeatures(
  doc: PDFDocument,
  stripMultimedia: boolean
): { removedCount: number; actions: string[] } {
  let removedCount = 0;
  const actions: string[] = [];
  const catalog = doc.catalog;

  for (const key of ['OpenAction', 'AA', 'JavaScript']) {
    if (catalog.has(PDFName.of(key))) {
      catalog.delete(PDFName.of(key));
      removedCount++;
      actions.push(`Removed catalog /${key}`);
    }
  }

  const namesDict = lookupDict(doc, catalog.get(PDFName.of('Names')));
  if (namesDict) {
    if (namesDict.has(PDFName.of('JavaScript'))) {
      namesDict.delete(PDFName.of('JavaScript'));
      removedCount++;
      actions.push('Removed catalog /Names/JavaScript tree');
    }
    if (stripMultimedia && namesDict.has(PDFName.of('EmbeddedFiles'))) {
      namesDict.delete(PDFName.of('EmbeddedFiles'));
      removedCount++;
      actions.push('Removed /Names/EmbeddedFiles for PDF/A compliance');
    }
  }

  if (stripMultimedia && catalog.has(PDFName.of('NeedsRendering'))) {
    catalog.delete(PDFName.of('NeedsRendering'));
    removedCount++;
  }

  const forbiddenAnnotSubtypes = new Set([
    'Sound',
    'Movie',
    'Screen',
    'RichMedia',
    '3D',
    'FileAttachment',
  ]);

  const pages = doc.getPages();
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    if (page.node.has(PDFName.of('AA'))) {
      page.node.delete(PDFName.of('AA'));
      removedCount++;
      actions.push(`Removed page ${p + 1} /AA additional actions`);
    }

    const annotsVal = page.node.get(PDFName.of('Annots'));
    const resolvedAnnots =
      annotsVal instanceof PDFRef ? doc.context.lookup(annotsVal) : annotsVal;
    if (resolvedAnnots instanceof PDFArray) {
      for (let i = resolvedAnnots.size() - 1; i >= 0; i--) {
        const annotDict = lookupDict(doc, resolvedAnnots.get(i));
        if (!annotDict) continue;
        if (annotDict.has(PDFName.of('AA'))) {
          annotDict.delete(PDFName.of('AA'));
          removedCount++;
        }
        if (isDangerousActionDict(doc, annotDict.get(PDFName.of('A')))) {
          annotDict.delete(PDFName.of('A'));
          removedCount++;
          actions.push(`Stripped active annotation action on page ${p + 1}`);
        }
        if (stripMultimedia) {
          const subtypeVal = annotDict.get(PDFName.of('Subtype'));
          const subtypeName =
            subtypeVal instanceof PDFName ? subtypeVal.decodeText() : '';
          if (forbiddenAnnotSubtypes.has(subtypeName)) {
            resolvedAnnots.remove(i);
            removedCount++;
            actions.push(`Removed multimedia /${subtypeName} annotation`);
          }
        }
      }
    }
  }

  return { removedCount, actions };
}

function scrubAllDocumentMetadata(doc: PDFDocument): void {
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('');
  doc.setProducer('');

  const infoDict = lookupDict(doc, doc.context.trailerInfo.Info);
  if (infoDict) {
    for (const dateKey of ['CreationDate', 'ModDate', 'Trapped']) {
      infoDict.delete(PDFName.of(dateKey));
    }
  }

  doc.catalog.delete(PDFName.of('Metadata'));
  doc.catalog.delete(PDFName.of('PieceInfo'));
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of('PieceInfo'));
  }
}

function applyMetadataAndSyncXmp(
  doc: PDFDocument,
  fields: PdfMetadataFields,
  isPdfA: boolean
): void {
  doc.setTitle(fields.title ?? '');
  doc.setAuthor(fields.author ?? '');
  doc.setSubject(fields.subject ?? '');
  const kwList = String(fields.keywords ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  doc.setKeywords(kwList);
  doc.setCreator(fields.creator ?? '');
  doc.setProducer(fields.producer ?? '');

  if (isPdfA) {
    doc.catalog.delete(PDFName.of('PieceInfo'));
    for (const page of doc.getPages()) {
      page.node.delete(PDFName.of('PieceInfo'));
    }
  }

  const xmpXml = buildPdfA2bXmpPacket(fields);
  const xmpRaw = new TextEncoder().encode(xmpXml);
  const xmpBytes = toSameRealmUint8Array(xmpRaw);
  const xmpStream = doc.context.stream(xmpBytes, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML'),
  });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(xmpStream));
}

function embedSrgbOutputIntent(doc: PDFDocument): void {
  const iccBytes = toSameRealmUint8Array(buildMinimalSrgbIccProfile());
  const iccStream = doc.context.flateStream(iccBytes, {
    N: 3,
    Alternate: PDFName.of('DeviceRGB'),
  });
  const iccRef = doc.context.register(iccStream);

  const intentDict = doc.context.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    OutputCondition: PDFString.of('sRGB IEC61966-2.1'),
    OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
    RegistryName: PDFString.of('http://www.color.org'),
    Info: PDFString.of('sRGB IEC61966-2.1'),
    DestOutputProfile: iccRef,
  });

  doc.catalog.set(
    PDFName.of('OutputIntents'),
    doc.context.obj([doc.context.register(intentDict)])
  );
}

function isNodeRuntime(): boolean {
  const proc = (
    globalThis as unknown as {
      process?: { versions?: { node?: string }; browser?: boolean };
    }
  ).process;
  return (
    typeof proc === 'object' &&
    typeof proc.versions?.node === 'string' &&
    proc.browser !== true
  );
}

async function renderPageWithBrowserCanvas(
  pdfBytes: Uint8Array,
  pageNumber: number,
  dpi: 200 | 300
): Promise<RenderedArchivalPageImage> {
  if (typeof document === 'undefined') {
    throw new Error(
      'Offscreen rasterization in 2b_strict_flattened requires DOM Canvas or an injected renderPageToImage helper.'
    );
  }

  const pdfjsLib = await import('pdfjs-dist');
  if (!isNodeRuntime() && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    useSystemFonts: true,
    verbosity: 0,
  });

  let docProxy: any = null;
  try {
    docProxy = await loadingTask.promise;
    const page = await docProxy.getPage(pageNumber);
    const vpPt = page.getViewport({ scale: 1 });
    const scale = dpi / 72;
    const vpScaled = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(vpScaled.width));
    canvas.height = Math.max(1, Math.round(vpScaled.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to acquire 2D canvas context for PDF/A flattening.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: vpScaled, canvas }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode archival JPEG.'))),
        'image/jpeg',
        0.92
      );
    });
    const imgBytes = new Uint8Array(await blob.arrayBuffer());
    canvas.width = 0;
    canvas.height = 0;
    if (typeof page.cleanup === 'function') page.cleanup();

    return {
      bytes: imgBytes,
      format: 'JPEG',
      widthPt: vpPt.width,
      heightPt: vpPt.height,
    };
  } finally {
    if (typeof docProxy?.destroy === 'function') await docProxy.destroy();
    else if (typeof loadingTask?.destroy === 'function') await loadingTask.destroy();
  }
}

async function rebuildStructuralContainer(
  rawBytes: Uint8Array,
  ignoreErrors: boolean
): Promise<{
  doc: PDFDocument;
  trimmedBytes: Uint8Array;
  leadingGarbageBytes: number;
  repairedCount: number;
  actionLog: string[];
}> {
  const actionLog: string[] = [];
  const headerInfo = locatePdfHeader(rawBytes);
  const leadingGarbageBytes = headerInfo.offset;
  const trimmedBytes =
    leadingGarbageBytes > 0 ? rawBytes.subarray(leadingGarbageBytes) : rawBytes;

  let repairedCount = 0;
  if (leadingGarbageBytes > 0) {
    repairedCount++;
    actionLog.push(`Stripped ${leadingGarbageBytes} leading non-PDF garbage byte(s)`);
  }

  // Tier 1: QPDF structural XRef & object stream reconstruction
  const qpdfRebuild = await runQpdfCommand(trimmedBytes, (inP, outP) => [
    '--warning-exit-0',
    inP,
    outP,
  ]);
  const warningLines = filterDiagnosticLines(qpdfRebuild.stdout, qpdfRebuild.stderr);
  if (qpdfRebuild.exitCode === 3 || warningLines.length > 0) {
    repairedCount += Math.max(1, warningLines.length);
    actionLog.push('Rebuilt XRef table and repaired stream lengths via QPDF WASM');
  }

  if (qpdfRebuild.outputBytes && qpdfRebuild.outputBytes.byteLength > 0) {
    try {
      const doc = await PDFDocument.load(qpdfRebuild.outputBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: !ignoreErrors,
        updateMetadata: false,
      });
      return {
        doc,
        trimmedBytes: qpdfRebuild.outputBytes,
        leadingGarbageBytes,
        repairedCount,
        actionLog,
      };
    } catch {
      // Fall through to Tier 2 salvage
    }
  }

  // Tier 2: Page-by-page pdf-lib salvage copy into fresh PDF container
  const srcDoc = await PDFDocument.load(trimmedBytes, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
    updateMetadata: false,
  });
  const salvagedDoc = await PDFDocument.create();
  const indices = srcDoc.getPageIndices();
  const copied = await salvagedDoc.copyPages(srcDoc, indices);
  for (const page of copied) {
    salvagedDoc.addPage(page);
  }
  const origMeta = extractMetadataFromPdfDoc(srcDoc);
  salvagedDoc.setTitle(origMeta.title);
  salvagedDoc.setAuthor(origMeta.author);
  salvagedDoc.setSubject(origMeta.subject);
  salvagedDoc.setCreator(origMeta.creator);
  salvagedDoc.setProducer(origMeta.producer);

  repairedCount = Math.max(repairedCount, 1);
  actionLog.push(`Salvaged ${copied.length} page(s) via Tier-2 container rebuild`);

  return {
    doc: salvagedDoc,
    trimmedBytes,
    leadingGarbageBytes,
    repairedCount,
    actionLog,
  };
}

/**
 * Executes Structural Repair + Linearization, Metadata Inspection/Scrubbing,
 * or Archival PDF/A-2b Packaging strictly inside local browser memory.
 */
export async function processPdfRepairMetadata(
  rawBytes: Uint8Array,
  fileName: string,
  partialOptions: Partial<PdfRepairMetadataOptions> = {},
  deps: PdfRepairDeps = {}
): Promise<PdfRepairMetadataResult> {
  const options: PdfRepairMetadataOptions = {
    ...DEFAULT_PDF_REPAIR_OPTIONS,
    ...partialOptions,
    metadataOverrides: {
      ...DEFAULT_PDF_REPAIR_OPTIONS.metadataOverrides,
      ...(partialOptions.metadataOverrides ?? {}),
    },
  };
  const outputFileName = deriveOutputPdfName(fileName, options);

  try {
    deps.onProgress?.(15, 'Validating PDF signature and running Tier-1 XRef repair');
    const rebuilt = await rebuildStructuralContainer(rawBytes, true);
    let workingDoc = rebuilt.doc;
    const actionLog = [...rebuilt.actionLog];
    let repairedWarningsCount = rebuilt.repairedCount;

    const existingMeta = extractMetadataFromPdfDoc(workingDoc);

    if (options.stripJavaScriptAndActions || options.mode === 'pdfa') {
      deps.onProgress?.(40, 'Scanning and stripping active JavaScript/Launch actions');
      const stripped = stripForbiddenPdfFeatures(
        workingDoc,
        options.mode === 'pdfa'
      );
      repairedWarningsCount += stripped.removedCount;
      actionLog.push(...stripped.actions);
    }

    if (options.mode === 'metadata') {
      deps.onProgress?.(60, options.scrubAllMetadata ? 'Scrubbing Info, PieceInfo & XMP' : 'Updating Document Metadata & XMP');
      if (options.scrubAllMetadata) {
        scrubAllDocumentMetadata(workingDoc);
        actionLog.push('Scrubbed all /Info keys, /PieceInfo dictionaries, and XMP /Metadata');
      } else {
        applyMetadataAndSyncXmp(workingDoc, options.metadataOverrides, false);
        actionLog.push('Updated Document Info and synchronized XMP metadata packet');
      }
    } else if (options.mode === 'repair' && options.scrubAllMetadata) {
      scrubAllDocumentMetadata(workingDoc);
      actionLog.push('Scrubbed hidden metadata during repair');
    } else if (options.mode === 'pdfa') {
      deps.onProgress?.(55, 'Packaging PDF/A-2b structure and sRGB ICC profile');
      const sourceForFlatten =
        rebuilt.trimmedBytes.byteLength > 0 ? rebuilt.trimmedBytes : rawBytes;
      const effectiveMeta: PdfMetadataFields = {
        title: options.metadataOverrides.title || existingMeta.title || deriveOutputPdfName(fileName, options),
        author: options.metadataOverrides.author || existingMeta.author,
        subject: options.metadataOverrides.subject || existingMeta.subject,
        keywords: options.metadataOverrides.keywords || existingMeta.keywords,
        creator: options.metadataOverrides.creator || existingMeta.creator || 'PrivKnife',
        producer:
          options.metadataOverrides.producer ||
          existingMeta.producer ||
          'PrivKnife Local PDF/A Packager',
      };

      if (options.pdfaConformance === '2b_strict_flattened') {
        const renderer = deps.renderPageToImage ?? renderPageWithBrowserCanvas;
        const archivalDoc = await PDFDocument.create();
        const totalPages = workingDoc.getPageCount();
        for (let p = 1; p <= totalPages; p++) {
          deps.onProgress?.(
            55 + Math.round((p / Math.max(1, totalPages)) * 25),
            `Flattening archival page ${p} of ${totalPages} (${options.pdfaFlattenDpi} DPI)`
          );
          const renderedImg = await renderer(
            sourceForFlatten,
            p,
            options.pdfaFlattenDpi
          );
          const imgBytes = toSameRealmUint8Array(renderedImg.bytes);
          const embedded =
            renderedImg.format === 'PNG'
              ? await archivalDoc.embedPng(imgBytes)
              : await archivalDoc.embedJpg(imgBytes);
          const archPage = archivalDoc.addPage([
            renderedImg.widthPt,
            renderedImg.heightPt,
          ]);
          archPage.drawImage(embedded, {
            x: 0,
            y: 0,
            width: renderedImg.widthPt,
            height: renderedImg.heightPt,
          });
        }
        workingDoc = archivalDoc;
        actionLog.push(
          `Flattened ${totalPages} page(s) at ${options.pdfaFlattenDpi} DPI for font-independent PDF/A-2b`
        );
      }

      embedSrgbOutputIntent(workingDoc);
      actionLog.push('Embedded /GTS_PDFA1 sRGB IEC61966-2.1 OutputIntent profile');
      applyMetadataAndSyncXmp(workingDoc, effectiveMeta, true);
      actionLog.push('Injected uncompressed ISO 19005-2 pdfaid:part=2 conformance=B XMP packet');
    }

    deps.onProgress?.(82, 'Serializing PDF objects and optimizing layout');
    let outBytes = await workingDoc.save({ useObjectStreams: false });

    const shouldLinearize =
      options.mode !== 'pdfa' && options.linearizeFastWebView;
    if (shouldLinearize) {
      deps.onProgress?.(90, 'Linearizing PDF for Fast Web View');
      const linResult = await runQpdfCommand(outBytes, (inP, outP) => [
        '--warning-exit-0',
        '--linearize',
        inP,
        outP,
      ]);
      if (linResult.outputBytes && linResult.outputBytes.byteLength > 0) {
        outBytes = linResult.outputBytes;
        actionLog.push('Linearized PDF object graph for Fast Web View');
      }
    }

    deps.onProgress?.(95, 'Verifying output integrity locally');
    const reportAfter = await inspectPdfHealth(outBytes);

    let archivalChecklist: ArchivalCheckItem[] | undefined;
    if (options.mode === 'pdfa') {
      const reloadedCheckDoc = await PDFDocument.load(outBytes, {
        updateMetadata: false,
      });
      const hasOutputIntent = Boolean(
        reloadedCheckDoc.catalog.get(PDFName.of('OutputIntents'))
      );
      archivalChecklist = [
        {
          id: 'output_intent',
          labelKey: 'sRGB OutputIntent (/GTS_PDFA1)',
          passed: hasOutputIntent,
          detail: hasOutputIntent ? 'Embedded sRGB IEC61966-2.1 ICC profile' : 'Missing OutputIntent',
        },
        {
          id: 'xmp_pdfaid',
          labelKey: 'ISO 19005-2 XMP Packet (pdfaid=2/B)',
          passed: reportAfter.rawXmpBytes > 0,
          detail: `${reportAfter.rawXmpBytes} bytes uncompressed RDF/XML`,
        },
        {
          id: 'active_content_removed',
          labelKey: 'Forbidden Active Content & JavaScript Removed',
          passed: !reportAfter.hasJavaScriptOrActions,
          detail: !reportAfter.hasJavaScriptOrActions
            ? 'Zero JavaScript/OpenAction/Launch triggers'
            : 'Residual action detected',
        },
        {
          id: 'xref_repaired',
          labelKey: 'Structural XRef & Stream Integrity',
          passed: !reportAfter.hasXrefWarnings && reportAfter.leadingGarbageBytes === 0,
          detail: !reportAfter.hasXrefWarnings ? 'Clean XRef table' : 'XRef warnings remain',
        },
        {
          id: 'fonts_embedded',
          labelKey: 'All Fonts Embedded or Raster Flattened',
          passed: reportAfter.unembeddedFontsCount === 0,
          detail:
            reportAfter.unembeddedFontsCount === 0
              ? 'Zero unembedded fonts detected'
              : `${reportAfter.unembeddedFontsCount} unembedded Standard-14/system font(s) detected; use Strict Flattened mode for strict validators`,
        },
      ];
    }

    const finalBytes = new Uint8Array(outBytes.byteLength);
    finalBytes.set(outBytes);
    const blob = new Blob([finalBytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });

    deps.onProgress?.(100, 'Complete');
    return {
      success: true,
      blob,
      pdfBytes: finalBytes,
      fileName: outputFileName,
      fileSize: finalBytes.byteLength,
      repairedWarningsCount,
      archivalChecklist,
      reportAfter,
      actionLog,
    };
  } catch (err: unknown) {
    return {
      success: false,
      fileName: outputFileName,
      fileSize: 0,
      repairedWarningsCount: 0,
      error:
        err instanceof Error
          ? err.message
          : 'Client-side PDF repair/packaging failed.',
    };
  }
}
