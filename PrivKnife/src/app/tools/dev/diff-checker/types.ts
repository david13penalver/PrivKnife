export type DiffViewMode = 'side_by_side' | 'unified_inline';
export type DiffGranularity = 'character' | 'word' | 'line';
export type SyntaxLanguage =
  | 'plaintext'
  | 'javascript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown';

export type DiffChangeType = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DiffToken {
  type: 'unchanged' | 'added' | 'removed';
  value: string;
}

export interface DiffLine {
  type: DiffChangeType;
  leftLineNumber?: number;
  rightLineNumber?: number;
  leftText?: string;
  rightText?: string;
  leftTokens?: DiffToken[];
  rightTokens?: DiffToken[];
  unifiedText?: string;
}

export interface DiffStats {
  leftTotalLines: number;
  rightTotalLines: number;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  unchangedLines: number;
}

export interface DiffCheckerOptions {
  viewMode: DiffViewMode;
  diffGranularity: DiffGranularity;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  syntaxLanguage: SyntaxLanguage;
  syncScroll: boolean;
}

export interface DiffCheckerResult {
  success: boolean;
  lines: DiffLine[];
  stats: DiffStats;
  patch: string;
  htmlReport: string;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface DiffWorkerRequest {
  requestId: number;
  originalText: string;
  modifiedText: string;
  options: DiffCheckerOptions;
}

export interface DiffWorkerResponse {
  requestId: number;
  result: DiffCheckerResult;
}
