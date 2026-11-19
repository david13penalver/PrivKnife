import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  ExtractedPdfTokensResult,
  ExtractedTable,
  PdfTableExtractorDeps,
  PdfTableExtractorOptions,
  PdfTableExtractorResult,
  PdfTextToken,
  TableExportArtifact,
} from './types';

function parsePageRange(expr: string, totalPages: number): number[] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return [];
  const raw = String(expr ?? '').trim().toLowerCase();
  if (!raw || raw === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const picked = new Set<number>();
  for (const part of raw.split(',')) {
    const seg = part.trim();
    if (/^\d+$/.test(seg)) {
      const p = Number(seg);
      if (p >= 1 && p <= totalPages) picked.add(p);
    } else {
      const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(totalPages, Math.max(a, b));
        for (let p = lo; p <= hi; p++) picked.add(p);
      }
    }
  }
  return Array.from(picked).sort((a, b) => a - b);
}

export function detectColumnSplitsX(
  tokens: PdfTextToken[],
  minColumnGapPt = 10
): number[] {
  if (!tokens || tokens.length < 2) return [];
  const gapMin = Math.max(2, Number.isFinite(minColumnGapPt) ? minColumnGapPt : 10);

  let minX = Infinity;
  let maxX = -Infinity;
  for (const t of tokens) {
    if (t.x < minX) minX = t.x;
    const end = t.x + Math.max(1, t.width);
    if (end > maxX) maxX = end;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || maxX <= minX) {
    return [];
  }

  const start = Math.floor(minX);
  const span = Math.ceil(maxX) - start + 1;
  const occupied = new Uint8Array(span);

  for (const t of tokens) {
    const x0 = Math.max(0, Math.floor(t.x) - start);
    const x1 = Math.min(span - 1, Math.ceil(t.x + Math.max(1, t.width)) - start);
    for (let x = x0; x <= x1; x++) {
      occupied[x] = 1;
    }
  }

  const splits: number[] = [];
  let gapStart = -1;
  let seenContent = false;

  for (let i = 0; i < span; i++) {
    if (occupied[i] === 1) {
      if (seenContent && gapStart !== -1 && i - gapStart >= gapMin) {
        splits.push(Number((start + (gapStart + i) / 2).toFixed(2)));
      }
      seenContent = true;
      gapStart = -1;
    } else if (seenContent && gapStart === -1) {
      gapStart = i;
    }
  }

  return splits;
}

function sanitizeFormulaString(raw: string): string {
  if (/^[=+\-@\t\r]/.test(raw)) {
    return `'${raw}`;
  }
  return raw;
}

export function coerceAndSanitizeCell(
  raw: string,
  options: {
    detectNumericTypes: boolean;
    decimalSeparator: '.' | ',';
    sanitizeCsvFormulas: boolean;
  }
): string | number {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';

  if (options.detectNumericTypes) {
    let candidate = trimmed;
    let isNeg = false;
    let isPercent = false;

    const acctMatch = candidate.match(/^\((.+)\)$/);
    if (acctMatch) {
      isNeg = true;
      candidate = acctMatch[1].trim();
    }

    if (candidate.endsWith('%')) {
      isPercent = true;
      candidate = candidate.slice(0, -1).trim();
    }

    // Strip optional leading +/- and currency symbols cleanly
    if (candidate.startsWith('-')) {
      isNeg = !isNeg;
      candidate = candidate.slice(1).trim();
    } else if (candidate.startsWith('+')) {
      candidate = candidate.slice(1).trim();
    }

    candidate = candidate.replace(/^[$€£¥₹]\s*/, '').trim();
    if (candidate.startsWith('-')) {
      isNeg = !isNeg;
      candidate = candidate.slice(1).trim();
    }

    const numericRegex =
      options.decimalSeparator === '.'
        ? /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/
        : /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/;

    if (numericRegex.test(candidate)) {
      const normalized =
        options.decimalSeparator === '.'
          ? candidate.replace(/,/g, '')
          : candidate.replace(/\./g, '').replace(',', '.');
      let num = Number(normalized);
      if (Number.isFinite(num)) {
        if (isNeg) num = -num;
        if (isPercent) num = num / 100;
        return Number(num.toFixed(10));
      }
    }
  }

  return options.sanitizeCsvFormulas ? sanitizeFormulaString(trimmed) : trimmed;
}

function buildRowsFromPageTokens(
  pageTokens: PdfTextToken[],
  splitsX: number[],
  options: PdfTableExtractorOptions
): string[][] {
  if (pageTokens.length === 0) return [];

  const heights = pageTokens
    .map((t) => t.height)
    .filter((h) => Number.isFinite(h) && h > 0)
    .sort((a, b) => a - b);
  const medianH =
    heights.length > 0 ? heights[Math.floor(heights.length / 2)] : 11;
  const rowTol = Math.max(2, medianH * (options.rowToleranceFactor || 0.45));

  const sorted = [...pageTokens].sort((a, b) => b.y - a.y);
  const rows: Array<{ y: number; items: PdfTextToken[] }> = [];

  for (const tok of sorted) {
    const existing = rows.find((r) => Math.abs(r.y - tok.y) <= rowTol);
    if (existing) {
      existing.items.push(tok);
    } else {
      rows.push({ y: tok.y, items: [tok] });
    }
  }

  const colCount = splitsX.length + 1;
  return rows.map((r) => {
    const bins: PdfTextToken[][] = Array.from({ length: colCount }, () => []);
    for (const item of r.items) {
      const center = item.x + Math.max(0, item.width) / 2;
      let colIdx = 0;
      while (colIdx < splitsX.length && center >= splitsX[colIdx]) {
        colIdx++;
      }
      bins[colIdx].push(item);
    }

    return bins.map((cellItems) => {
      if (cellItems.length === 0) return '';
      cellItems.sort((a, b) => a.x - b.x);
      let joined = cellItems[0].text;
      for (let i = 1; i < cellItems.length; i++) {
        const prev = cellItems[i - 1];
        const curr = cellItems[i];
        const gap = curr.x - (prev.x + Math.max(0, prev.width));
        joined += gap > 1.5 ? ` ${curr.text}` : curr.text;
      }
      return joined.trim();
    });
  });
}

export function extractTablesFromTokens(
  tokens: PdfTextToken[],
  pageCount: number,
  options: PdfTableExtractorOptions
): PdfTableExtractorResult {
  if (!tokens || tokens.length === 0 || pageCount <= 0) {
    return {
      success: true,
      tables: [],
      isScannedFallbackNeeded: true,
      totalRows: 0,
    };
  }

  const targetPages = new Set(parsePageRange(options.pageRange, pageCount));
  const region = options.region;

  const filtered = tokens.filter((t) => {
    if (!targetPages.has(t.pageIndex + 1)) return false;
    if (region) {
      const cx = t.x + Math.max(0, t.width) / 2;
      const cy = t.y;
      if (
        cx < region.x ||
        cx > region.x + region.width ||
        cy < region.y ||
        cy > region.y + region.height
      ) {
        return false;
      }
    }
    return Boolean(t.text && t.text.trim().length > 0);
  });

  if (filtered.length === 0) {
    return {
      success: true,
      tables: [],
      isScannedFallbackNeeded: true,
      totalRows: 0,
    };
  }

  const byPage = new Map<number, PdfTextToken[]>();
  for (const tok of filtered) {
    const arr = byPage.get(tok.pageIndex) ?? [];
    arr.push(tok);
    byPage.set(tok.pageIndex, arr);
  }
  const pageIndices = Array.from(byPage.keys()).sort((a, b) => a - b);

  const manualSplits =
    options.manualColumnSplitsX !== undefined
      ? [...options.manualColumnSplitsX]
          .filter((x) => Number.isFinite(x))
          .sort((a, b) => a - b)
      : undefined;

  const sharedAutoSplits =
    options.mergeAllPages && !manualSplits
      ? detectColumnSplitsX(filtered, options.minColumnGapPt)
      : undefined;

  const perPageTables: ExtractedTable[] = [];

  for (const pageIdx of pageIndices) {
    const pTokens = byPage.get(pageIdx) ?? [];
    const splitsX =
      manualSplits ??
      sharedAutoSplits ??
      detectColumnSplitsX(pTokens, options.minColumnGapPt);

    const rawRows = buildRowsFromPageTokens(pTokens, splitsX, options);
    if (rawRows.length === 0) continue;

    const colCount = splitsX.length + 1;
    let headers: string[];
    let bodyStart = 0;

    if (options.firstRowAsHeader) {
      headers = rawRows[0].map((h, i) => {
        const s = h.trim() || `Column ${i + 1}`;
        return options.sanitizeCsvFormulas ? sanitizeFormulaString(s) : s;
      });
      bodyStart = 1;
    } else {
      headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    }

    const typedRows = rawRows.slice(bodyStart).map((row) =>
      row.map((cell) =>
        coerceAndSanitizeCell(cell, {
          detectNumericTypes: options.detectNumericTypes,
          decimalSeparator: options.decimalSeparator,
          sanitizeCsvFormulas: options.sanitizeCsvFormulas,
        })
      )
    );

    perPageTables.push({
      pageIndex: pageIdx,
      headers,
      rows: typedRows,
      columnSplitsX: splitsX,
    });
  }

  if (perPageTables.length === 0) {
    return {
      success: true,
      tables: [],
      isScannedFallbackNeeded: false,
      totalRows: 0,
    };
  }

  if (!options.mergeAllPages) {
    const totalRows = perPageTables.reduce((acc, t) => acc + t.rows.length, 0);
    return {
      success: true,
      tables: perPageTables,
      isScannedFallbackNeeded: false,
      totalRows,
    };
  }

  const first = perPageTables[0];
  const normHeaderKey = first.headers
    .map((h) => h.trim().toLowerCase())
    .join('\u0001');
  const mergedRows: Array<Array<string | number>> = [...first.rows];

  for (let i = 1; i < perPageTables.length; i++) {
    const next = perPageTables[i];
    const nextHeaderKey = next.headers
      .map((h) => h.trim().toLowerCase())
      .join('\u0001');

    if (options.firstRowAsHeader) {
      if (!options.stripRepeatedHeaders || nextHeaderKey !== normHeaderKey) {
        mergedRows.push(
          next.headers.map((h) =>
            coerceAndSanitizeCell(h, {
              detectNumericTypes: options.detectNumericTypes,
              decimalSeparator: options.decimalSeparator,
              sanitizeCsvFormulas: options.sanitizeCsvFormulas,
            })
          )
        );
      }
    }
    mergedRows.push(...next.rows);
  }

  return {
    success: true,
    tables: [
      {
        pageIndex: first.pageIndex,
        headers: first.headers,
        rows: mergedRows,
        columnSplitsX: first.columnSplitsX,
      },
    ],
    isScannedFallbackNeeded: false,
    totalRows: mergedRows.length,
  };
}

function buildExportFileName(baseFileName: string, ext: string): string {
  const sanitized = String(baseFileName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();
  const stem = sanitized?.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-tables.${ext}`;
}

function sanitizeExportGridCell(
  val: string | number,
  sanitizeCsvFormulas: boolean
): string | number {
  if (typeof val === 'number') return val;
  const s = String(val ?? '');
  return sanitizeCsvFormulas ? sanitizeFormulaString(s) : s;
}

export function exportTablesToCsv(
  tables: ExtractedTable[],
  baseFileName: string,
  sanitizeCsvFormulas = true
): TableExportArtifact {
  const fileName = buildExportFileName(baseFileName, 'csv');
  const first = tables?.[0];
  if (!first) {
    return {
      success: false,
      fileName,
      fileSize: 0,
      mimeType: 'text/csv;charset=utf-8',
      error: 'No table rows available to export.',
    };
  }

  const allRows: Array<Array<string | number>> = [
    first.headers.map((h) => sanitizeExportGridCell(h, sanitizeCsvFormulas)),
  ];
  for (const t of tables) {
    for (const r of t.rows) {
      allRows.push(r.map((c) => sanitizeExportGridCell(c, sanitizeCsvFormulas)));
    }
  }

  const csvText = Papa.unparse(allRows);
  const bytes = new TextEncoder().encode(csvText);
  const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8' });

  return {
    success: true,
    blob,
    bytes,
    text: csvText,
    fileName,
    fileSize: bytes.byteLength,
    mimeType: 'text/csv;charset=utf-8',
  };
}

export function exportTablesToJson(
  tables: ExtractedTable[],
  baseFileName: string
): TableExportArtifact {
  const fileName = buildExportFileName(baseFileName, 'json');
  const payload = {
    tables: (tables ?? []).map((t) => {
      const seen = new Map<string, number>();
      const uniqueHeaders = t.headers.map((h, i) => {
        const base = h.trim() || `Column_${i + 1}`;
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        return count === 1 ? base : `${base}_${count}`;
      });

      const records = t.rows.map((row) => {
        const obj: Record<string, string | number> = {};
        uniqueHeaders.forEach((key, colIdx) => {
          obj[key] = row[colIdx] ?? '';
        });
        return obj;
      });

      return { pageIndex: t.pageIndex, headers: uniqueHeaders, rows: records };
    }),
  };

  const jsonText = JSON.stringify(payload, null, 2);
  const bytes = new TextEncoder().encode(jsonText);
  const blob = new Blob([bytes], { type: 'application/json;charset=utf-8' });

  return {
    success: true,
    blob,
    bytes,
    text: jsonText,
    fileName,
    fileSize: bytes.byteLength,
    mimeType: 'application/json;charset=utf-8',
  };
}

export function exportTablesToTsv(tables: ExtractedTable[]): string {
  const first = tables?.[0];
  if (!first) return '';

  const escapeTsvCell = (v: string | number): string =>
    String(v ?? '').replace(/[\t\r\n]+/g, ' ');

  const lines: string[] = [first.headers.map(escapeTsvCell).join('\t')];
  for (const t of tables) {
    for (const r of t.rows) {
      lines.push(r.map(escapeTsvCell).join('\t'));
    }
  }
  return lines.join('\n');
}

export function exportTablesToXlsx(
  tables: ExtractedTable[],
  baseFileName: string,
  sanitizeCsvFormulas = true
): TableExportArtifact {
  const fileName = buildExportFileName(baseFileName, 'xlsx');
  const mimeType =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (!tables || tables.length === 0) {
    return {
      success: false,
      fileName,
      fileSize: 0,
      mimeType,
      error: 'No tables available to export.',
    };
  }

  const wb = XLSX.utils.book_new();
  tables.forEach((t, idx) => {
    const aoa: Array<Array<string | number>> = [
      t.headers.map((h) => sanitizeExportGridCell(h, sanitizeCsvFormulas)),
      ...t.rows.map((r) =>
        r.map((c) => sanitizeExportGridCell(c, sanitizeCsvFormulas))
      ),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, `Table ${idx + 1}`.slice(0, 31));
  });

  const outArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer | Uint8Array;
  const bytes = new Uint8Array(outArray);
  const blob = new Blob([bytes], { type: mimeType });

  return {
    success: true,
    blob,
    bytes,
    fileName,
    fileSize: bytes.byteLength,
    mimeType,
  };
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function isNodeRuntime(): boolean {
  const proc = (
    globalThis as unknown as { process?: { versions?: { node?: string } } }
  ).process;
  return typeof proc?.versions?.node === 'string';
}

export async function extractTextTokensWithPdfJs(
  pdfBytes: Uint8Array
): Promise<ExtractedPdfTokensResult> {
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
  const pageSizes: Array<{ width: number; height: number }> = [];
  const tokens: PdfTextToken[] = [];

  try {
    docProxy = await loadingTask.promise;
    const pageCount = docProxy.numPages ?? 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await docProxy.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      pageSizes.push({ width: vp.width, height: vp.height });

      const textContent = await page.getTextContent();
      for (const item of textContent?.items ?? []) {
        const text = String((item as any)?.str ?? '');
        if (!text.trim()) continue;
        const transform = Array.isArray((item as any)?.transform)
          ? (item as any).transform
          : [1, 0, 0, 1, 0, 0];
        const x = Number(transform[4] ?? 0);
        const y = Number(transform[5] ?? 0);
        const width = Math.max(1, Number((item as any)?.width ?? text.length * 5));
        const height = Math.max(
          6,
          Number((item as any)?.height ?? Math.abs(Number(transform[3] ?? 11)))
        );

        tokens.push({
          text,
          x,
          y,
          width,
          height,
          pageIndex: i - 1,
        });
      }

      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }

    return { pageCount, pageSizes, tokens };
  } finally {
    if (typeof docProxy?.destroy === 'function') {
      await docProxy.destroy();
    } else if (typeof loadingTask?.destroy === 'function') {
      await loadingTask.destroy();
    }
  }
}

export async function extractTablesFromPdf(
  pdfBytes: Uint8Array,
  options: PdfTableExtractorOptions,
  deps: PdfTableExtractorDeps = {}
): Promise<PdfTableExtractorResult> {
  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      tables: [],
      isScannedFallbackNeeded: false,
      totalRows: 0,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      tables: [],
      isScannedFallbackNeeded: false,
      totalRows: 0,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(15, 'Extracting text coordinates with PDF.js');

  try {
    const extractor = deps.extractTokens ?? extractTextTokensWithPdfJs;
    const extracted = await extractor(pdfBytes);

    if (extracted.pageCount <= 0) {
      return {
        success: false,
        tables: [],
        isScannedFallbackNeeded: false,
        totalRows: 0,
        errorCode: 'INVALID_PDF',
        error: 'PDF contains zero pages.',
      };
    }

    deps.onProgress?.(60, 'Clustering table rows and column gutters');
    const result = extractTablesFromTokens(
      extracted.tokens,
      extracted.pageCount,
      options
    );
    deps.onProgress?.(100, 'Complete');
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to parse PDF tables.';
    const isEncrypted = /encrypt|password/i.test(msg);
    return {
      success: false,
      tables: [],
      isScannedFallbackNeeded: false,
      totalRows: 0,
      errorCode: isEncrypted ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
      error: isEncrypted
        ? 'Encrypted PDF detected. Unlock it first before extracting tables.'
        : msg,
    };
  }
}
