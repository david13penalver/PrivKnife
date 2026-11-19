export type FormatterLanguage = 'json' | 'sql' | 'yaml';

export type SqlDialect =
  | 'sql'
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'tsql'
  | 'bigquery';

export type JsonOutputView =
  | 'formatted'
  | 'minified'
  | 'tree'
  | 'typescript'
  | 'zod'
  | 'yaml';

export interface JsonSqlFormatterOptions {
  language: FormatterLanguage;
  indentType: '2spaces' | '4spaces' | 'tab';
  sortJsonKeys: boolean;
  jsonOutputView: JsonOutputView;
  jsonPathQuery: string;
  rootTypeName: string;
  sqlDialect: SqlDialect;
  sqlKeywordCase: 'upper' | 'lower' | 'preserve';
  sqlMinify: boolean;
  yamlOutputMode: 'yaml' | 'json';
}

export const DEFAULT_JSON_SQL_OPTIONS: JsonSqlFormatterOptions = {
  language: 'json',
  indentType: '2spaces',
  sortJsonKeys: false,
  jsonOutputView: 'formatted',
  jsonPathQuery: '',
  rootTypeName: 'Root',
  sqlDialect: 'postgresql',
  sqlKeywordCase: 'upper',
  sqlMinify: false,
  yamlOutputMode: 'yaml',
};

export interface SyntaxDiagnostic {
  valid: boolean;
  message?: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface JsonSqlFormatterStats {
  inputBytes: number;
  outputBytes: number;
  lineCount: number;
  durationMs: number;
}

export interface JsonSqlFormatterResult {
  success: boolean;
  diagnostic: SyntaxDiagnostic;
  outputText: string;
  parsedValue?: unknown;
  stats: JsonSqlFormatterStats;
}

export interface JsonTreeRow {
  path: string;
  key: string;
  depth: number;
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  previewValue: string;
  childCount: number;
  hasChildren: boolean;
  expanded: boolean;
  totalArrayItems?: number;
  renderedArrayLimit?: number;
}

export interface FormatterDeps {
  onProgress?: (percent: number, stage: string) => void;
}

export type FormatterWorkerRequest = {
  type: 'format';
  inputText: string;
  options: JsonSqlFormatterOptions;
};

export type FormatterWorkerResponse =
  | {
      type: 'progress';
      percent: number;
      stage: string;
    }
  | {
      type: 'done';
      result: JsonSqlFormatterResult;
    }
  | {
      type: 'error';
      error: string;
    };
