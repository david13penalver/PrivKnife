import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  convertOfficeToPdf,
  detectOfficeFormat,
  inspectOfficeInput,
  parseInputToRenderModel,
  sanitizeHtmlZeroNetwork,
} from './engine';
import {
  createMultiSheetXlsxBytes,
  createSampleDocxBytes,
  MALICIOUS_EXFIL_HTML,
  SAMPLE_CSV_TEXT,
  SAMPLE_MARKDOWN_DOC,
  TINY_PNG_DATA_URI,
} from './test-fixtures';

describe('Office & HTML to PDF Engine (Seam 1A - Slice 1: Sanitizer, Format Detection & Parsers)', () => {
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

  describe('Zero-Network HTML Sanitizer & Anti-Exfiltration Containment', () => {
    it('strips scripts, remote pixels, stylesheets, inline CSS url(), event handlers, javascript: and SVG data URIs with zero network calls', () => {
      const sanitized = sanitizeHtmlZeroNetwork(MALICIOUS_EXFIL_HTML);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(sanitized.blockedRemoteUrls).toBeGreaterThanOrEqual(3);

      const lower = sanitized.html.toLowerCase();
      expect(lower).not.toContain('<script');
      expect(lower).not.toContain('evil.test');
      expect(lower).not.toContain('onclick');
      expect(lower).not.toContain('javascript:');
      expect(lower).not.toContain('data:image/svg+xml');
      expect(lower).not.toContain('<link');
      expect(lower).not.toContain('<style');

      // Safe content and raster base64 data URI must remain intact
      expect(sanitized.html).toContain('Privacy Containment Report');
      expect(sanitized.html).toContain('Sanitized paragraph content remains intact.');
      expect(sanitized.html).toContain('Safe Link Text');
      expect(sanitized.html).toContain(TINY_PNG_DATA_URI);
    });

    it('blocks HTML-entity obfuscated protocols, protocol-relative URLs, and iframe tags', () => {
      const obfuscated = `
        <iframe src="https://evil.test/embed"></iframe>
        <img src="&#x68;&#x74;&#x74;&#x70;&#x73;://evil.test/hex.png" alt="hex">
        <img src="//evil.test/proto-rel.png" alt="rel">
        <p>Safe Survivor</p>
      `;
      const sanitized = sanitizeHtmlZeroNetwork(obfuscated);

      expect(sanitized.blockedRemoteUrls).toBeGreaterThanOrEqual(3);
      expect(sanitized.html.toLowerCase()).not.toContain('<iframe');
      expect(sanitized.html.toLowerCase()).not.toContain('evil.test');
      expect(sanitized.html).toContain('Safe Survivor');
    });
  });

  describe('Format Detection & Error Resilience', () => {
    it('detects .docx and .xlsx by ZIP structure even when renamed .bin', async () => {
      const docxBytes = await createSampleDocxBytes();
      const xlsxBytes = createMultiSheetXlsxBytes(10, 4);

      expect(await detectOfficeFormat(docxBytes, 'renamed.bin')).toBe('docx');
      expect(await detectOfficeFormat(xlsxBytes, 'payload.bin')).toBe('xlsx');
    });

    it('rejects legacy binary .doc OLE2 files, corrupt ZIP payloads, and empty inputs cleanly', async () => {
      const ole2Doc = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
      await expect(
        parseInputToRenderModel({
          kind: 'binary',
          bytes: ole2Doc,
          fileName: 'legacy.doc',
        })
      ).rejects.toThrow(/legacy|\.doc|\.docx/i);

      const corruptZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0x99]);
      await expect(
        parseInputToRenderModel({
          kind: 'binary',
          bytes: corruptZip,
          fileName: 'corrupt.docx',
        })
      ).rejects.toThrow();

      await expect(
        parseInputToRenderModel({
          kind: 'text',
          content: '   \n\t  ',
          fileName: 'empty.html',
          format: 'html',
        })
      ).rejects.toThrow(/empty/i);
    });
  });

  describe('.docx OOXML, .xlsx, .csv & Markdown Parsers', () => {
    it('parses .docx Heading1, bold/non-bold w:val="0" runs, bullet list, 2x2 table, and embedded image while skipping empty paragraphs', async () => {
      const docxBytes = await createSampleDocxBytes({ includeImage: true });
      const model = await parseInputToRenderModel({
        kind: 'binary',
        bytes: docxBytes,
        fileName: 'briefing.docx',
      });

      expect(model.sourceFormat).toBe('docx');
      expect(model.blocks.some((b) => b.type === 'heading' && b.level === 1 && b.text.includes('Quarterly Security Briefing'))).toBe(true);

      const paragraph = model.blocks.find((b) => b.type === 'paragraph');
      expect(paragraph).toBeDefined();
      if (paragraph?.type === 'paragraph') {
        const boldRun = paragraph.runs.find((r) => r.text.includes('strictly offline'));
        const explicitNonBoldRun = paragraph.runs.find((r) => r.text.includes('inside browser memory'));
        expect(boldRun?.bold).toBe(true);
        expect(explicitNonBoldRun?.bold).toBe(false);
        expect(explicitNonBoldRun?.italic).toBe(true);
      }

      // Empty <w:p></w:p> should be skipped
      expect(
        model.blocks.filter((b) => b.type === 'paragraph' && b.text.trim().length === 0)
      ).toHaveLength(0);

      const list = model.blocks.find((b) => b.type === 'list');
      expect(list?.type === 'list' ? list.items.length : 0).toBe(2);

      const table = model.blocks.find((b) => b.type === 'table');
      expect(table?.type === 'table').toBe(true);
      if (table?.type === 'table') {
        expect(table.headers).toEqual(['Module', 'Status']);
        expect(table.rows).toEqual([['Sandbox Sanitizer', 'Passed Local Audit']]);
      }

      const image = model.blocks.find((b) => b.type === 'image');
      expect(image?.type === 'image' && image.dataUri.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('parses multi-sheet .xlsx, filters sheets, strips blank cells, recommends landscape for >6 cols, and parses BOM + quoted CSV', async () => {
      const xlsxBytes = createMultiSheetXlsxBytes(50, 8);
      const fullModel = await parseInputToRenderModel({
        kind: 'binary',
        bytes: xlsxBytes,
        fileName: 'multi.xlsx',
      });

      expect(fullModel.sourceFormat).toBe('xlsx');
      expect(fullModel.sheetNames).toEqual(['Ledger', 'WideMatrix']);
      expect(fullModel.counts.tables).toBe(2);
      expect(fullModel.maxTableColumns).toBe(8);
      expect(fullModel.recommendedOrientation).toBe('landscape');

      const filteredModel = await parseInputToRenderModel(
        { kind: 'binary', bytes: xlsxBytes, fileName: 'multi.xlsx' },
        { selectedSheets: ['Ledger'] }
      );
      expect(filteredModel.counts.tables).toBe(1);
      expect(filteredModel.maxTableColumns).toBe(4);
      expect(filteredModel.recommendedOrientation).toBe('portrait');

      const csvModel = await parseInputToRenderModel({
        kind: 'text',
        content: SAMPLE_CSV_TEXT,
        fileName: 'inventory.csv',
        format: 'csv',
      });
      expect(csvModel.sourceFormat).toBe('csv');
      const csvTable = csvModel.blocks.find((b) => b.type === 'table');
      expect(csvTable?.type === 'table').toBe(true);
      if (csvTable?.type === 'table') {
        expect(csvTable.headers).toEqual(['Item', 'Description', 'Quantity', 'Unit Price']);
        expect(csvTable.rows).toHaveLength(2);
        expect(csvTable.rows[0][1]).toContain('Standard unit, sealed pack');
      }
    });

    it('parses Markdown code blocks with literal <script> safely without XSS leak', async () => {
      const mdModel = await parseInputToRenderModel({
        kind: 'text',
        content: SAMPLE_MARKDOWN_DOC,
        fileName: 'arch.md',
        format: 'md',
      });

      expect(mdModel.sourceFormat).toBe('md');
      expect(mdModel.counts.headings).toBeGreaterThanOrEqual(2);
      expect(mdModel.counts.codeBlocks).toBe(1);
      expect(mdModel.counts.tables).toBe(1);
      const codeBlock = mdModel.blocks.find((b) => b.type === 'code_block');
      expect(codeBlock?.type === 'code_block' ? codeBlock.code : '').toContain('<script>');
    });
  });

  describe('Seam 1B - Slice 2: Vector PDF Pagination, Repeated Headers & E2E Compile', () => {
    async function extractPdfPagesText(
      pdfBytes: Uint8Array
    ): Promise<Array<{ pageNumber: number; width: number; height: number; text: string }>> {
      const pdfjsLib = await import('pdfjs-dist');
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBytes),
        useWorkerFetch: false,
        useSystemFonts: true,
        verbosity: 0,
      });
      let docProxy: any = null;
      const pages: Array<{ pageNumber: number; width: number; height: number; text: string }> = [];
      try {
        docProxy = await loadingTask.promise;
        for (let i = 1; i <= docProxy.numPages; i++) {
          const page = await docProxy.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const tc = await page.getTextContent();
          const text = (tc.items ?? []).map((item: any) => String(item?.str ?? '')).join(' ');
          pages.push({ pageNumber: i, width: vp.width, height: vp.height, text });
          if (typeof page.cleanup === 'function') page.cleanup();
        }
      } finally {
        if (typeof docProxy?.destroy === 'function') await docProxy.destroy();
        else if (typeof loadingTask?.destroy === 'function') await loadingTask.destroy();
      }
      return pages;
    }

    it('converts 2-sheet 50-row .xlsx into multi-page vector .pdf with repeated table headers and sheet filtering', async () => {
      const xlsxBytes = createMultiSheetXlsxBytes(50, 8);
      const inspectRes = await inspectOfficeInput({
        kind: 'binary',
        bytes: xlsxBytes,
        fileName: 'financial-workbook.xlsx',
      });
      expect(inspectRes.success).toBe(true);
      expect(inspectRes.diagnostics.recommendedOrientation).toBe('landscape');
      expect(inspectRes.diagnostics.sheetNames).toEqual(['Ledger', 'WideMatrix']);

      const result = await convertOfficeToPdf(
        { kind: 'binary', bytes: xlsxBytes, fileName: 'financial-workbook.xlsx' },
        {
          orientation: 'landscape',
          repeatTableHeaders: true,
          includePageNumbers: true,
        }
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('financial-workbook.pdf');
      expect(result.pdfBytes).toBeDefined();
      expect(new TextDecoder().decode(result.pdfBytes!.subarray(0, 5))).toBe('%PDF-');
      expect(result.diagnostics.pageCount).toBeGreaterThanOrEqual(2);
      expect(result.diagnostics.tableCount).toBe(2);

      const extracted = await extractPdfPagesText(result.pdfBytes!);
      expect(extracted.length).toBe(result.diagnostics.pageCount);
      // Repeated header row "Entry ID" should appear on Page 1 and continued Ledger Page 2
      expect(extracted[0].text).toContain('Entry ID');
      expect(extracted[1].text).toContain('Entry ID');
      expect(extracted[0].text).toContain(`Page 1 of ${extracted.length}`);
      expect(extracted[1].text).toContain(`Page 2 of ${extracted.length}`);

      // Sheet filtering keeps only Ledger
      const filtered = await convertOfficeToPdf(
        { kind: 'binary', bytes: xlsxBytes, fileName: 'financial-workbook.xlsx' },
        { selectedSheets: ['Ledger'] }
      );
      expect(filtered.success).toBe(true);
      expect(filtered.diagnostics.tableCount).toBe(1);
      const filteredPages = await extractPdfPagesText(filtered.pdfBytes!);
      const allFilteredText = filteredPages.map((p) => p.text).join('\n');
      expect(allFilteredText).not.toContain('WideMatrix');
    });

    it('converts minimal .docx with image and table into searchable vector .pdf', async () => {
      const docxBytes = await createSampleDocxBytes({ includeImage: true });
      const result = await convertOfficeToPdf({
        kind: 'binary',
        bytes: docxBytes,
        fileName: 'security-briefing.docx',
      });

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toBe('security-briefing.pdf');
      expect(result.fileSize).toBeGreaterThan(500);
      expect(result.diagnostics.sourceFormat).toBe('docx');
      expect(result.diagnostics.tableCount).toBe(1);
      expect(result.diagnostics.imageCount).toBe(1);

      const extracted = await extractPdfPagesText(result.pdfBytes!);
      const allText = extracted.map((p) => p.text).join('\n');
      expect(allText).toContain('Quarterly Security Briefing');
      expect(allText).toContain('strictly offline');
      expect(allText).toContain('Sandbox Sanitizer');
    });

    it('converts Markdown with code block and table onto Landscape Letter PDF with header, page numbers and escaped preview', async () => {
      const result = await convertOfficeToPdf(
        {
          kind: 'text',
          content: SAMPLE_MARKDOWN_DOC,
          fileName: 'markdown-guide.md',
          format: 'md',
        },
        {
          paperSize: 'letter',
          orientation: 'landscape',
          headerText: 'Confidential Draft',
          includePageNumbers: true,
        }
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('markdown-guide.pdf');
      expect(result.previewHtml.toLowerCase()).not.toContain('<script>');
      expect(result.previewHtml).toContain('&lt;script&gt;');
      expect(result.previewPages.length).toBe(result.diagnostics.pageCount);

      const extracted = await extractPdfPagesText(result.pdfBytes!);
      expect(extracted[0].width).toBeGreaterThan(extracted[0].height);
      expect(Math.round(extracted[0].width)).toBeCloseTo(792, -1);
      expect(Math.round(extracted[0].height)).toBeCloseTo(612, -1);
      expect(extracted[0].text).toContain('Confidential Draft');
      expect(extracted[0].text).toContain('Local Markdown Architecture Guide');
      expect(extracted[0].text).toContain('verifyLocalExecution');
    });

    it('enforces zero network requests during E2E malicious HTML conversion and clamps extreme paper options', async () => {
      const result = await convertOfficeToPdf(
        {
          kind: 'text',
          content: MALICIOUS_EXFIL_HTML,
          fileName: 'untrusted-email.html',
          format: 'html',
        },
        {
          marginMm: -50,
          baseFontSizePt: 200,
        }
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.diagnostics.blockedRemoteUrls).toBeGreaterThanOrEqual(3);
      expect(result.previewHtml.toLowerCase()).not.toContain('<script');
      expect(result.previewHtml.toLowerCase()).not.toContain('evil.test');
      expect(result.pdfBytes).toBeDefined();
    });

    it('recovers gracefully with warning when .docx contains corrupt embedded image bytes', async () => {
      const docxBytes = await createSampleDocxBytes({
        includeImage: true,
        corruptImage: true,
      });
      const result = await convertOfficeToPdf({
        kind: 'binary',
        bytes: docxBytes,
        fileName: 'broken-img.docx',
      });

      expect(result.success).toBe(true);
      expect(result.pdfBytes).toBeDefined();
      expect(result.diagnostics.warnings.length).toBeGreaterThanOrEqual(1);
    });
  });
});
