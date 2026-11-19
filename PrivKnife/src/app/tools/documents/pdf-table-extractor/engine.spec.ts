import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  coerceAndSanitizeCell,
  detectColumnSplitsX,
  exportTablesToCsv,
  exportTablesToJson,
  exportTablesToTsv,
  exportTablesToXlsx,
  extractTablesFromPdf,
  extractTablesFromTokens,
  extractTextTokensWithPdfJs,
} from './engine';
import {
  createCorruptPdfBytes,
  createFormulaInjectionPdf,
  createNonPdfBytes,
  createScannedBlankPdf,
  createTwoPageLedgerPdf,
  DEFAULT_TABLE_EXTRACTOR_OPTIONS,
} from './test-fixtures';
import { PdfTextToken } from './types';

describe('PDF to Excel, CSV & JSON Table Extractor Engine (Seam 1)', () => {
  describe('Slice 1: Spatial Projection, Cell Coercion, Formula Guard & Export Serializers', () => {
    it('detects whitespace column gutters from token X projections and handles single-column text', () => {
      const tokens: PdfTextToken[] = [
        { text: '2026-01-10', x: 50, y: 700, width: 55, height: 11, pageIndex: 0 },
        { text: 'Cloud Rack', x: 170, y: 700, width: 65, height: 11, pageIndex: 0 },
        { text: '2', x: 370, y: 700, width: 8, height: 11, pageIndex: 0 },
        { text: '$1,250.00', x: 460, y: 700, width: 55, height: 11, pageIndex: 0 },
      ];

      const splits = detectColumnSplitsX(tokens, 10);
      expect(splits).toHaveLength(3);
      expect(splits[0]).toBeGreaterThan(105);
      expect(splits[0]).toBeLessThan(170);
      expect(splits[1]).toBeGreaterThan(235);
      expect(splits[1]).toBeLessThan(370);
      expect(splits[2]).toBeGreaterThan(378);
      expect(splits[2]).toBeLessThan(460);

      expect(detectColumnSplitsX([tokens[0]], 10)).toEqual([]);
    });

    it('coerces numbers, currencies, percentages, accounting negatives, and neutralizes formula injection', () => {
      const optsUS = {
        detectNumericTypes: true,
        decimalSeparator: '.' as const,
        sanitizeCsvFormulas: true,
      };
      expect(coerceAndSanitizeCell('$1,234.56', optsUS)).toBe(1234.56);
      expect(coerceAndSanitizeCell('-145.20', optsUS)).toBe(-145.2);
      expect(coerceAndSanitizeCell('(125.40)', optsUS)).toBe(-125.4);
      expect(coerceAndSanitizeCell('12.5%', optsUS)).toBeCloseTo(0.125, 5);
      expect(coerceAndSanitizeCell('2026-03-15', optsUS)).toBe('2026-03-15');
      expect(coerceAndSanitizeCell('INV-001', optsUS)).toBe('INV-001');

      const optsEU = {
        detectNumericTypes: true,
        decimalSeparator: ',' as const,
        sanitizeCsvFormulas: true,
      };
      expect(coerceAndSanitizeCell('€1.234,50', optsEU)).toBe(1234.5);

      // Formula injection neutralization while preserving valid negative numbers
      expect(
        coerceAndSanitizeCell('=HYPERLINK("http://evil","Click")', optsUS)
      ).toBe('\'=HYPERLINK("http://evil","Click")');
      expect(coerceAndSanitizeCell('+cmd|calc', optsUS)).toBe("'+cmd|calc");
      expect(coerceAndSanitizeCell('@SUM(1,2)', optsUS)).toBe("'@SUM(1,2)");
    });

    it('clusters multi-page tokens, merges & strips repeated headers, and respects manual splits + regions', () => {
      const tokens: PdfTextToken[] = [
        // Page 0 header + row 1
        { text: 'Date', x: 50, y: 760, width: 30, height: 11, pageIndex: 0 },
        { text: 'Item', x: 200, y: 760, width: 30, height: 11, pageIndex: 0 },
        { text: 'Amount', x: 400, y: 760, width: 45, height: 11, pageIndex: 0 },
        { text: '2026-01-01', x: 50, y: 735, width: 55, height: 11, pageIndex: 0 },
        { text: 'Widget A', x: 200, y: 735, width: 50, height: 11, pageIndex: 0 },
        { text: '$10.00', x: 400, y: 735, width: 35, height: 11, pageIndex: 0 },
        // Page 1 repeated header + row 2 + out-of-region footer
        { text: 'Date', x: 50, y: 760, width: 30, height: 11, pageIndex: 1 },
        { text: 'Item', x: 200, y: 760, width: 30, height: 11, pageIndex: 1 },
        { text: 'Amount', x: 400, y: 760, width: 45, height: 11, pageIndex: 1 },
        { text: '2026-01-02', x: 50, y: 735, width: 55, height: 11, pageIndex: 1 },
        { text: 'Widget B', x: 200, y: 735, width: 50, height: 11, pageIndex: 1 },
        { text: '-25.50', x: 400, y: 735, width: 35, height: 11, pageIndex: 1 },
        { text: 'Page Footer', x: 50, y: 30, width: 70, height: 9, pageIndex: 1 },
      ];

      const merged = extractTablesFromTokens(tokens, 2, {
        ...DEFAULT_TABLE_EXTRACTOR_OPTIONS,
        region: { x: 0, y: 100, width: 595, height: 742 },
      });

      expect(merged.success).toBe(true);
      expect(merged.isScannedFallbackNeeded).toBe(false);
      expect(merged.tables).toHaveLength(1);
      expect(merged.tables[0].headers).toEqual(['Date', 'Item', 'Amount']);
      expect(merged.tables[0].rows).toEqual([
        ['2026-01-01', 'Widget A', 10],
        ['2026-01-02', 'Widget B', -25.5],
      ]);

      // Manual column split override re-partitions cleanly into 2 columns
      const manual = extractTablesFromTokens(tokens, 2, {
        ...DEFAULT_TABLE_EXTRACTOR_OPTIONS,
        manualColumnSplitsX: [300],
        region: { x: 0, y: 100, width: 595, height: 742 },
      });
      expect(manual.tables[0].headers).toHaveLength(2);
      expect(manual.tables[0].headers[0]).toBe('Date Item');

      // Empty tokens -> scanned fallback needed
      const scanned = extractTablesFromTokens([], 1, DEFAULT_TABLE_EXTRACTOR_OPTIONS);
      expect(scanned.isScannedFallbackNeeded).toBe(true);
      expect(scanned.tables).toEqual([]);
    });

    it('exports extracted tables to RFC-4180 CSV, JSON, TSV clipboard, and SheetJS XLSX round-trip', () => {
      const tables = [
        {
          pageIndex: 0,
          headers: ['Date', 'Description', 'Amount'],
          rows: [
            ['2026-01-01', 'Rack, "Pro"', 1250],
            ['2026-01-02', '=HYPERLINK("x")', -145.2],
          ],
          columnSplitsX: [130, 350],
        },
      ];

      const csv = exportTablesToCsv(tables, 'ledger.pdf', true);
      expect(csv.success).toBe(true);
      expect(csv.fileName).toBe('ledger-tables.csv');
      expect(csv.text).toContain('"Rack, ""Pro"""');
      expect(csv.text).toContain("'=HYPERLINK");
      expect(csv.text).toContain('-145.2');

      const json = exportTablesToJson(tables, 'ledger.pdf');
      expect(json.success).toBe(true);
      const parsedJson = JSON.parse(json.text!);
      expect(parsedJson.tables[0].rows[0].Amount).toBe(1250);

      const tsv = exportTablesToTsv(tables);
      expect(tsv).toContain('Date\tDescription\tAmount');

      const xlsxArt = exportTablesToXlsx(tables, 'ledger.pdf', true);
      expect(xlsxArt.success).toBe(true);
      expect(xlsxArt.fileName).toBe('ledger-tables.xlsx');
      const wb = XLSX.read(xlsxArt.bytes!, { type: 'array' });
      expect(wb.SheetNames).toEqual(['Table 1']);
      const aoa = XLSX.utils.sheet_to_json<Array<string | number>>(
        wb.Sheets['Table 1'],
        { header: 1 }
      );
      expect(aoa[0]).toEqual(['Date', 'Description', 'Amount']);
      expect(aoa[1]).toEqual(['2026-01-01', 'Rack, "Pro"', 1250]);
      expect(aoa[2]).toEqual(['2026-01-02', '\'=HYPERLINK("x")', -145.2]);
    });
  });

  describe('Slice 2: Real PDF.js Extraction, Scanned Fallback, Manual Split & Formula Safety', () => {
    it('extracts 2-page ledger PDF into 1 merged table stripping repeated page-2 headers (Test Vector 1)', async () => {
      const pdfBytes = await createTwoPageLedgerPdf();
      const progressEvents: number[] = [];

      const res = await extractTablesFromPdf(
        pdfBytes,
        DEFAULT_TABLE_EXTRACTOR_OPTIONS,
        { onProgress: (pct) => progressEvents.push(pct) }
      );

      expect(res.success).toBe(true);
      expect(res.isScannedFallbackNeeded).toBe(false);
      expect(res.tables).toHaveLength(1);
      expect(res.tables[0].headers).toEqual(['Date', 'Description', 'Qty', 'Amount']);
      expect(res.tables[0].rows).toHaveLength(5);
      expect(res.tables[0].rows[0][3]).toBe(1250);
      expect(res.tables[0].rows[1][3]).toBe(-145.2);
      expect(res.tables[0].rows[2][3]).toBe(-50);
      expect(progressEvents.at(-1)).toBe(100);
    });

    it('re-partitions cached PDF.js tokens cleanly using manualColumnSplitsX (Test Vector 2)', async () => {
      const pdfBytes = await createTwoPageLedgerPdf();
      const extracted = await extractTextTokensWithPdfJs(pdfBytes);
      expect(extracted.pageCount).toBe(2);
      expect(extracted.tokens.length).toBeGreaterThan(10);

      const repartitioned = extractTablesFromTokens(
        extracted.tokens,
        extracted.pageCount,
        {
          ...DEFAULT_TABLE_EXTRACTOR_OPTIONS,
          manualColumnSplitsX: [330],
        }
      );

      expect(repartitioned.success).toBe(true);
      expect(repartitioned.tables[0].headers).toHaveLength(2);
      expect(repartitioned.tables[0].rows).toHaveLength(5);
    });

    it('detects scanned image-only PDFs cleanly with isScannedFallbackNeeded (Test Vector 3)', async () => {
      const scannedBytes = await createScannedBlankPdf();
      const res = await extractTablesFromPdf(
        scannedBytes,
        DEFAULT_TABLE_EXTRACTOR_OPTIONS
      );

      expect(res.success).toBe(true);
      expect(res.isScannedFallbackNeeded).toBe(true);
      expect(res.tables).toEqual([]);
    });

    it('neutralizes Excel/CSV formula injection from extracted PDF while preserving negative numbers (Test Vector 4)', async () => {
      const evilPdf = await createFormulaInjectionPdf();
      const res = await extractTablesFromPdf(
        evilPdf,
        DEFAULT_TABLE_EXTRACTOR_OPTIONS
      );

      expect(res.success).toBe(true);
      expect(res.tables[0].rows[0][1]).toBe('\'=HYPERLINK("http://evil","Click")');
      expect(res.tables[0].rows[0][2]).toBe(-145.2);
      expect(res.tables[0].rows[1][1]).toBe("'+cmd|' /C calc'!A0");

      const xlsxArt = exportTablesToXlsx(res.tables, 'formula-check.pdf', true);
      const wb = XLSX.read(xlsxArt.bytes!, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Array<string | number>>(
        wb.Sheets['Table 1'],
        { header: 1 }
      );
      expect(rows[1][1]).toBe('\'=HYPERLINK("http://evil","Click")');
      expect(rows[1][2]).toBe(-145.2);
    });

    it('rejects empty, non-PDF, and corrupt buffers safely', async () => {
      const empty = await extractTablesFromPdf(
        new Uint8Array(0),
        DEFAULT_TABLE_EXTRACTOR_OPTIONS
      );
      expect(empty.success).toBe(false);
      expect(empty.errorCode).toBe('INVALID_INPUT');

      const nonPdf = await extractTablesFromPdf(
        createNonPdfBytes(),
        DEFAULT_TABLE_EXTRACTOR_OPTIONS
      );
      expect(nonPdf.success).toBe(false);
      expect(nonPdf.errorCode).toBe('INVALID_PDF');

      const corrupt = await extractTablesFromPdf(
        createCorruptPdfBytes(),
        DEFAULT_TABLE_EXTRACTOR_OPTIONS
      );
      expect(corrupt.success).toBe(false);
      expect(corrupt.errorCode).toBe('INVALID_PDF');
    });
  });
});
