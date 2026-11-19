import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMinimalSrgbIccProfile,
  buildPdfA2bXmpPacket,
  inspectPdfHealth,
  processPdfRepairMetadata,
} from './engine';
import {
  createCorruptedXrefAndGarbagePdf,
  createFakePngBytes,
  createFakeZipBytes,
  createHealthySamplePdf,
  createJavaScriptActionPdf,
  getTinyPngBytes,
} from './test-fixtures';
import { DEFAULT_PDF_REPAIR_OPTIONS } from './types';

describe('PDF Repair, Metadata & PDF/A Archiver Engine (Seam 1A - Slice 1: ICC, XMP & Health Diagnostics)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('constructs a standards-compliant compact sRGB ICC v2.1.0 display profile', () => {
    const icc = buildMinimalSrgbIccProfile();
    expect(icc).toBeInstanceOf(Uint8Array);
    expect(icc.byteLength).toBeGreaterThanOrEqual(400);

    const view = new DataView(icc.buffer, icc.byteOffset, icc.byteLength);
    expect(view.getUint32(0, false)).toBe(icc.byteLength);
    expect(view.getUint32(8, false)).toBe(0x02100000);

    const ascii = (start: number, len: number) =>
      String.fromCharCode(...icc.subarray(start, start + len));
    expect(ascii(12, 4)).toBe('mntr');
    expect(ascii(16, 4)).toBe('RGB ');
    expect(ascii(20, 4)).toBe('XYZ ');
    expect(ascii(36, 4)).toBe('acsp');
  });

  it('builds well-formed PDF/A-2b XMP packet and escapes special XML characters cleanly', () => {
    const xmp = buildPdfA2bXmpPacket({
      title: 'Q4 Audit <Confidential> & "Final"',
      author: "O'Connor & Co",
      subject: 'Archival Test',
      keywords: 'pdfa, tax, archive',
      creator: 'PrivKnife',
      producer: 'PrivKnife Engine',
    });

    expect(xmp).toContain('<pdfaid:part>2</pdfaid:part>');
    expect(xmp).toContain('<pdfaid:conformance>B</pdfaid:conformance>');
    expect(xmp).toContain('&lt;Confidential&gt; &amp; &quot;Final&quot;');

    const doc = new DOMParser().parseFromString(xmp, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });

  it('inspects healthy PDF metadata, XMP, PieceInfo, and reports clean structural health', async () => {
    const bytes = await createHealthySamplePdf();
    const report = await inspectPdfHealth(bytes);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(report.pageCount).toBe(2);
    expect(report.leadingGarbageBytes).toBe(0);
    expect(report.hasXrefWarnings).toBe(false);
    expect(report.hasJavaScriptOrActions).toBe(false);
    expect(report.isEncrypted).toBe(false);
    expect(report.rawXmpBytes).toBeGreaterThan(100);
    expect(report.hasPieceInfo).toBe(true);
    expect(report.metadata.author).toBe('John Doe');
    expect(report.metadata.creator).toBe('Microsoft Word');
    expect(report.healthStatus).toBe('healthy');
  });

  it('detects 32 bytes leading garbage and XRef table warnings on damaged PDFs', async () => {
    const brokenBytes = await createCorruptedXrefAndGarbagePdf();
    const report = await inspectPdfHealth(brokenBytes);

    expect(report.leadingGarbageBytes).toBe(32);
    expect(report.hasXrefWarnings).toBe(true);
    expect(report.pageCount).toBeGreaterThanOrEqual(1);
    expect(report.qpdfDiagnostics.length).toBeGreaterThanOrEqual(1);
    expect(report.healthStatus).not.toBe('healthy');
  });

  it('flags catalog OpenAction JavaScript and active script trees cleanly', async () => {
    const jsBytes = await createJavaScriptActionPdf();
    const report = await inspectPdfHealth(jsBytes);

    expect(report.hasJavaScriptOrActions).toBe(true);
    expect(report.metadata.author).toBe('John Doe');
    expect(report.metadata.creator).toBe('Microsoft Word');
  });

  it('identifies non-PDF file signatures (PNG, ZIP, empty) transparently on inspection', async () => {
    await expect(inspectPdfHealth(new Uint8Array(0))).rejects.toThrow(/empty/i);
    await expect(inspectPdfHealth(createFakePngBytes())).rejects.toThrow(/PNG/i);
    await expect(inspectPdfHealth(createFakeZipBytes())).rejects.toThrow(/ZIP/i);
  });

  describe('Seam 1B - Slice 2: Structural Repair, Linearize, Metadata Scrub/Edit & PDF/A-2b Packaging', () => {
    async function verifyReadableWithPdfJs(pdfBytes: Uint8Array): Promise<number> {
      const pdfjsLib = await import('pdfjs-dist');
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBytes),
        useWorkerFetch: false,
        useSystemFonts: true,
        verbosity: 0,
      });
      let docProxy: any = null;
      try {
        docProxy = await loadingTask.promise;
        return Number(docProxy.numPages ?? 0);
      } finally {
        if (typeof docProxy?.destroy === 'function') await docProxy.destroy();
        else if (typeof loadingTask?.destroy === 'function') await loadingTask.destroy();
      }
    }

    it('Vector 1: strips 32-byte leading garbage, rebuilds broken XRef, and linearizes cleanly for PDF.js & pdf-lib', async () => {
      const brokenBytes = await createCorruptedXrefAndGarbagePdf();
      const result = await processPdfRepairMetadata(brokenBytes, 'broken-return.pdf', {
        ...DEFAULT_PDF_REPAIR_OPTIONS,
        mode: 'repair',
        linearizeFastWebView: true,
        stripJavaScriptAndActions: true,
      });

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('broken-return_repaired.pdf');
      expect(result.repairedWarningsCount).toBeGreaterThanOrEqual(1);
      expect(result.pdfBytes).toBeDefined();
      expect(new TextDecoder().decode(result.pdfBytes!.subarray(0, 5))).toBe('%PDF-');

      const reloaded = await PDFDocument.load(result.pdfBytes!, {
        updateMetadata: false,
      });
      expect(reloaded.getPageCount()).toBe(1);

      const pdfjsPages = await verifyReadableWithPdfJs(result.pdfBytes!);
      expect(pdfjsPages).toBe(1);

      const afterHealth = await inspectPdfHealth(result.pdfBytes!);
      expect(afterHealth.leadingGarbageBytes).toBe(0);
      expect(afterHealth.hasXrefWarnings).toBe(false);
      expect(afterHealth.isLinearized).toBe(true);
    });

    it('Vector 2: scrubs all Info metadata, PieceInfo, and XMP streams without pdf-lib auto-re-injecting Creator/Producer', async () => {
      const sampleBytes = await createHealthySamplePdf();
      const scrubbed = await processPdfRepairMetadata(sampleBytes, 'confidential.pdf', {
        ...DEFAULT_PDF_REPAIR_OPTIONS,
        mode: 'metadata',
        linearizeFastWebView: false,
        scrubAllMetadata: true,
      });

      expect(scrubbed.success).toBe(true);
      expect(scrubbed.fileName).toBe('confidential_scrubbed.pdf');

      const reloaded = await PDFDocument.load(scrubbed.pdfBytes!, {
        updateMetadata: false,
      });
      expect(reloaded.getTitle() ?? '').toBe('');
      expect(reloaded.getAuthor() ?? '').toBe('');
      expect(reloaded.getSubject() ?? '').toBe('');
      expect(reloaded.getKeywords() ?? '').toBe('');
      expect(reloaded.getCreator() ?? '').toBe('');
      expect(reloaded.getProducer() ?? '').toBe('');
      expect(reloaded.catalog.get(PDFName.of('Metadata'))).toBeUndefined();
      expect(reloaded.catalog.get(PDFName.of('PieceInfo'))).toBeUndefined();

      const afterHealth = await inspectPdfHealth(scrubbed.pdfBytes!);
      expect(afterHealth.rawXmpBytes).toBe(0);
      expect(afterHealth.hasPieceInfo).toBe(false);
    });

    it('updates Info fields and synchronized uncompressed XMP cleanly when scrubAllMetadata is false', async () => {
      const sampleBytes = await createHealthySamplePdf();
      const edited = await processPdfRepairMetadata(sampleBytes, 'minutes.pdf', {
        ...DEFAULT_PDF_REPAIR_OPTIONS,
        mode: 'metadata',
        scrubAllMetadata: false,
        metadataOverrides: {
          title: 'Board Minutes & <Q4>',
          author: 'Legal Team',
          subject: 'Governance',
          keywords: 'board, q4',
          creator: 'PrivKnife Editor',
          producer: 'PrivKnife Engine',
        },
      });

      expect(edited.success).toBe(true);
      const reloaded = await PDFDocument.load(edited.pdfBytes!, {
        updateMetadata: false,
      });
      expect(reloaded.getTitle()).toBe('Board Minutes & <Q4>');
      expect(reloaded.getAuthor()).toBe('Legal Team');

      const xmpObj = reloaded.context.lookup(reloaded.catalog.get(PDFName.of('Metadata')));
      expect(xmpObj).toBeInstanceOf(PDFRawStream);
      const xmpText = new TextDecoder().decode((xmpObj as PDFRawStream).contents);
      expect(xmpText).toContain('Board Minutes &amp; &lt;Q4&gt;');
    });

    it('Vector 3 & 4: strips OpenAction JavaScript and embeds GTS_PDFA1 sRGB OutputIntent & pdfaid=2/B XMP in PDF/A mode', async () => {
      const jsBytes = await createJavaScriptActionPdf();
      const result = await processPdfRepairMetadata(jsBytes, 'policy.pdf', {
        ...DEFAULT_PDF_REPAIR_OPTIONS,
        mode: 'pdfa',
        stripJavaScriptAndActions: true,
        pdfaConformance: '2b_vector',
        metadataOverrides: {
          title: 'Archival Policy',
          author: 'Compliance',
          subject: 'Audit',
          keywords: 'pdfa, archive',
          creator: 'PrivKnife',
          producer: 'PrivKnife PDF/A',
        },
      });

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('policy_pdfa.pdf');

      const reloaded = await PDFDocument.load(result.pdfBytes!, {
        updateMetadata: false,
      });
      expect(reloaded.catalog.get(PDFName.of('OpenAction'))).toBeUndefined();

      // Check OutputIntents -> GTS_PDFA1 -> sRGB ICC profile
      const outputIntents = reloaded.context.lookup(
        reloaded.catalog.get(PDFName.of('OutputIntents'))
      );
      expect(outputIntents).toBeInstanceOf(PDFArray);
      const intentDict = reloaded.context.lookup((outputIntents as PDFArray).get(0));
      expect(intentDict).toBeInstanceOf(PDFDict);
      const subtype = (intentDict as PDFDict).get(PDFName.of('S'));
      expect(subtype?.toString()).toBe('/GTS_PDFA1');
      const profileRef = (intentDict as PDFDict).get(PDFName.of('DestOutputProfile'));
      expect(profileRef).toBeDefined();

      // Check uncompressed XMP metadata for pdfaid:part=2 and pdfaid:conformance=B
      const xmpStream = reloaded.context.lookup(
        reloaded.catalog.get(PDFName.of('Metadata'))
      );
      expect(xmpStream).toBeInstanceOf(PDFRawStream);
      const xmpXml = new TextDecoder().decode((xmpStream as PDFRawStream).contents);
      expect(xmpXml).toContain('pdfaid:part>2<');
      expect(xmpXml).toContain('pdfaid:conformance>B<');

      const afterHealth = await inspectPdfHealth(result.pdfBytes!);
      expect(afterHealth.hasJavaScriptOrActions).toBe(false);

      const activeCheck = result.archivalChecklist?.find(
        (c) => c.id === 'active_content_removed'
      );
      expect(activeCheck?.passed).toBe(true);
      const fontCheck = result.archivalChecklist?.find(
        (c) => c.id === 'fonts_embedded'
      );
      // Standard-14 Helvetica in createJavaScriptActionPdf() is unembedded; verify honest reporting
      expect(fontCheck?.passed).toBe(false);
    });

    it('supports strict flattened PDF/A-2b mode eliminating unembedded fonts cleanly with zero network requests', async () => {
      const sampleBytes = await createHealthySamplePdf();
      const pngBytes = getTinyPngBytes();
      const result = await processPdfRepairMetadata(
        sampleBytes,
        'flattened.pdf',
        {
          ...DEFAULT_PDF_REPAIR_OPTIONS,
          mode: 'pdfa',
          pdfaConformance: '2b_strict_flattened',
          pdfaFlattenDpi: 300,
        },
        {
          renderPageToImage: async () => ({
            bytes: pngBytes,
            format: 'PNG',
            widthPt: 595,
            heightPt: 842,
          }),
        }
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      const fontCheck = result.archivalChecklist?.find((c) => c.id === 'fonts_embedded');
      expect(fontCheck?.passed).toBe(true);
      const pdfjsPages = await verifyReadableWithPdfJs(result.pdfBytes!);
      expect(pdfjsPages).toBe(2);

      // Corrupt PNG input fails gracefully without unhandled exception
      const nonPdfResult = await processPdfRepairMetadata(
        createFakePngBytes(),
        'fake.pdf',
        DEFAULT_PDF_REPAIR_OPTIONS
      );
      expect(nonPdfResult.success).toBe(false);
      expect(nonPdfResult.error).toMatch(/PNG/i);
    });
  });
});
