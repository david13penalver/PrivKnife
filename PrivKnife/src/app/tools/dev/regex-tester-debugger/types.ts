export interface RegexFlagsConfig {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
  hasIndices: boolean;
}

export const DEFAULT_REGEX_FLAGS: RegexFlagsConfig = {
  global: true,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
  hasIndices: false,
};

export interface RegexMatchEntry {
  matchNumber: number;
  start: number;
  end: number;
  value: string;
  groups: Array<string | undefined>;
  namedGroups: Record<string, string | undefined>;
  isZeroLength: boolean;
}

export type RegexTokenCategory =
  | 'anchor'
  | 'quantifier'
  | 'group'
  | 'char_class'
  | 'escape'
  | 'literal'
  | 'alternation';

export interface RegexExplanationToken {
  raw: string;
  start: number;
  end: number;
  category: RegexTokenCategory;
  description: string;
  children?: RegexExplanationToken[];
}

export interface RegexTesterOptions {
  pattern: string;
  flags: RegexFlagsConfig;
  testString: string;
  replacement: string;
  runReplace: boolean;
  timeoutMs: number;
  maxMatches: number;
}

export const DEFAULT_REGEX_TESTER_OPTIONS: RegexTesterOptions = {
  pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
  flags: { ...DEFAULT_REGEX_FLAGS },
  testString: 'Dates: 2026-11-19 and 2027-01-05',
  replacement: '$<day>/$<month>/$<year>',
  runReplace: false,
  timeoutMs: 1500,
  maxMatches: 10_000,
};

export interface RegexTesterResult {
  valid: boolean;
  syntaxError?: string;
  timedOut: boolean;
  redosWarning?: boolean;
  staticRedosHazard?: boolean;
  truncated: boolean;
  matches: RegexMatchEntry[];
  replacedText?: string;
  explanation: RegexExplanationToken[];
  executionMs: number;
}

export interface HighlightSegment {
  text: string;
  matchIndex: number | null;
  alternate: boolean;
  isZeroWidth?: boolean;
  tooltip?: string;
}

export type RegexCodeLanguage = 'javascript' | 'typescript' | 'python' | 'go' | 'java';

export interface RegexPreset {
  id: string;
  title: string;
  description: string;
  pattern: string;
  flags: RegexFlagsConfig;
  sampleText: string;
  sampleReplacement: string;
}

export interface RegexWorkerRequest {
  type: 'match';
  requestId: number;
  options: RegexTesterOptions;
  locale: 'en' | 'es';
}

export type RegexWorkerResponse =
  | {
      type: 'result';
      requestId: number;
      result: RegexTesterResult;
    }
  | {
      type: 'error';
      requestId: number;
      error: string;
    };
