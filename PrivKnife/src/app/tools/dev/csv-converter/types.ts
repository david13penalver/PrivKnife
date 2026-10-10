export type OutputFormat = 'json' | 'sql' | 'markdown';
export type SqlDialect = 'mysql' | 'postgres' | 'sqlite';
export type MarkdownAlignment = 'left' | 'center' | 'right';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
  sheetNames?: string[];
  activeSheet?: string;
}

export interface CsvParseOptions {
  delimiter?: string;
  hasHeaders?: boolean;
}

export interface JsonFormatOptions {
  structure: 'arrayOfObjects' | 'twoDimensionalArray' | 'keyedByFirstColumn';
  indent: 2 | 4 | 0;
}

export interface SqlFormatOptions {
  tableName: string;
  dialect: SqlDialect;
  batchSize?: number;
}

export interface MarkdownFormatOptions {
  alignment: MarkdownAlignment;
  prettyPadding?: boolean;
}
