import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  CsvParseOptions,
  JsonFormatOptions,
  MarkdownFormatOptions,
  ParsedTable,
  SqlFormatOptions,
} from './types';

/**
 * Parse CSV, TSV, or delimiter-separated text into a ParsedTable structure.
 */
export function parseCsv(content: string, options?: CsvParseOptions): ParsedTable {
  const parsed = Papa.parse<string[]>(content.trim(), {
    delimiter: options?.delimiter || '', // Auto-detect delimiter if not specified
    skipEmptyLines: 'greedy',
  });

  const data = parsed.data || [];
  if (data.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
    };
  }

  const headers = data[0].map((h) => String(h ?? '').trim());
  const rows = data.slice(1).map((row) => {
    // Pad or slice row to match header length
    const padded = [...row];
    while (padded.length < headers.length) {
      padded.push('');
    }
    return padded.slice(0, headers.length).map((cell) => String(cell ?? ''));
  });

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
  };
}

/**
 * Parse an Excel (.xlsx, .xls) binary ArrayBuffer into a ParsedTable structure.
 */
export function parseExcel(buffer: ArrayBuffer, sheetIndex = 0): ParsedTable {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      sheetNames: [],
    };
  }

  const targetSheetName = sheetNames[sheetIndex] || sheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      columnCount: 0,
      sheetNames,
      activeSheet: targetSheetName,
    };
  }

  const headers = (rawRows[0] || []).map((h) => String(h ?? '').trim());
  const rows = rawRows.slice(1).map((row) => {
    const padded = [...row];
    while (padded.length < headers.length) {
      padded.push('');
    }
    return padded.slice(0, headers.length).map((c) => String(c ?? ''));
  });

  return {
    headers,
    rows,
    rowCount: rows.length,
    columnCount: headers.length,
    sheetNames,
    activeSheet: targetSheetName,
  };
}

/**
 * Matches numeric literals (integers, floats, negative numbers, scientific notation)
 * while preserving padded string identifiers like '007' or '0123'.
 */
const NUMERIC_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * Infer JavaScript typed value from string cell content (numbers, booleans, null, strings).
 */
function inferTypedValue(val: string): any {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') {
    return null;
  }
  if (trimmed.toLowerCase() === 'true') {
    return true;
  }
  if (trimmed.toLowerCase() === 'false') {
    return false;
  }
  if (NUMERIC_PATTERN.test(trimmed)) {
    return Number(trimmed);
  }
  return val;
}

/**
 * Convert ParsedTable to JSON string representation.
 */
export function tableToJson(table: ParsedTable, options: JsonFormatOptions): string {
  const space = options.indent > 0 ? options.indent : undefined;

  if (options.structure === 'twoDimensionalArray') {
    const full = [table.headers, ...table.rows];
    return JSON.stringify(full, null, space);
  }

  if (options.structure === 'keyedByFirstColumn') {
    const obj: Record<string, any> = {};
    for (const row of table.rows) {
      const key = row[0] || 'unknown';
      const item: Record<string, any> = {};
      table.headers.slice(1).forEach((header, idx) => {
        item[header] = inferTypedValue(row[idx + 1] ?? '');
      });
      obj[key] = item;
    }
    return JSON.stringify(obj, null, space);
  }

  // Default: arrayOfObjects
  const objects = table.rows.map((row) => {
    const item: Record<string, any> = {};
    table.headers.forEach((header, idx) => {
      item[header] = inferTypedValue(row[idx] ?? '');
    });
    return item;
  });

  return JSON.stringify(objects, null, space);
}

/**
 * Format and escape value for SQL INSERT statements.
 */
function formatSqlValue(val: string): string {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') {
    return 'NULL';
  }
  if (trimmed.toLowerCase() === 'true') {
    return 'TRUE';
  }
  if (trimmed.toLowerCase() === 'false') {
    return 'FALSE';
  }
  if (NUMERIC_PATTERN.test(trimmed)) {
    return trimmed;
  }
  // Escape single quotes: ' -> ''
  const escaped = val.replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Convert ParsedTable to SQL INSERT INTO statements.
 */
export function tableToSql(table: ParsedTable, options: SqlFormatOptions): string {
  if (table.rows.length === 0 || table.headers.length === 0) {
    return '-- No data available to generate SQL';
  }

  const quoteChar = options.dialect === 'mysql' ? '`' : '"';
  const escapedTableName = `${quoteChar}${options.tableName}${quoteChar}`;
  const escapedColumns = table.headers.map((h) => `${quoteChar}${h}${quoteChar}`).join(', ');

  const batchSize = options.batchSize && options.batchSize > 0 ? options.batchSize : table.rows.length;
  const queries: string[] = [];

  for (let i = 0; i < table.rows.length; i += batchSize) {
    const batchRows = table.rows.slice(i, i + batchSize);
    const valueRows = batchRows.map((row) => {
      const formattedVals = row.map(formatSqlValue).join(', ');
      return `(${formattedVals})`;
    });
    queries.push(`INSERT INTO ${escapedTableName} (${escapedColumns}) VALUES\n  ${valueRows.join(',\n  ')};`);
  }

  return queries.join('\n\n');
}

/**
 * Convert ParsedTable to GitHub-Flavored Markdown table.
 */
export function tableToMarkdown(
  table: ParsedTable,
  options: MarkdownFormatOptions
): string {
  if (table.headers.length === 0) {
    return '';
  }

  const escapeCell = (val: string) => val.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

  const headerRow = `| ${table.headers.map(escapeCell).join(' | ')} |`;

  let sepAlign = ':---';
  if (options.alignment === 'center') {
    sepAlign = ':---:';
  } else if (options.alignment === 'right') {
    sepAlign = '---:';
  }

  const separatorRow = `| ${table.headers.map(() => sepAlign).join(' | ')} |`;

  const rows = table.rows.map((row) => {
    const cells = row.map(escapeCell);
    return `| ${cells.join(' | ')} |`;
  });

  return [headerRow, separatorRow, ...rows].join('\n');
}
