export type StudioTab = 'case' | 'unicode' | 'zalgo' | 'kaomoji';

export type CaseFormatId =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'screaming_snake'
  | 'kebab'
  | 'cobol'
  | 'dot'
  | 'path'
  | 'title'
  | 'sentence'
  | 'upper'
  | 'lower'
  | 'slug';

export type UnicodeStyleId =
  | 'bold_serif'
  | 'bold_sans'
  | 'italic_serif'
  | 'bold_italic'
  | 'script'
  | 'bold_script'
  | 'fraktur'
  | 'double_struck'
  | 'monospace'
  | 'small_caps'
  | 'circled'
  | 'squared'
  | 'fullwidth'
  | 'upside_down'
  | 'strikethrough'
  | 'underline';

export type KaomojiCategory =
  | 'happy'
  | 'shrug'
  | 'flip'
  | 'love'
  | 'confused'
  | 'work'
  | 'animals'
  | 'dividers';

export interface CaseTransformOptions {
  batchLineByLine: boolean;
  stripDiacriticsForSlug: boolean;
}

export interface ZalgoOptions {
  intensity: number; // 1..15
  includeUp: boolean;
  includeMid: boolean;
  includeDown: boolean;
  seed?: number;
}

export interface KaomojiEntry {
  id: string;
  emoticon: string;
  category: KaomojiCategory;
  tags: readonly string[];
}

export interface TextStats {
  characters: number;
  codePoints: number;
  words: number;
  lines: number;
  utf8Bytes: number;
}

export interface CaseFormatMeta {
  id: CaseFormatId;
  label: string;
}

export interface UnicodeStyleMeta {
  id: UnicodeStyleId;
  label: string;
}

export const CASE_FORMATS: readonly CaseFormatMeta[] = [
  { id: 'camel', label: 'camelCase' },
  { id: 'pascal', label: 'PascalCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'screaming_snake', label: 'SCREAMING_SNAKE_CASE' },
  { id: 'kebab', label: 'kebab-case' },
  { id: 'cobol', label: 'COBOL-CASE' },
  { id: 'dot', label: 'dot.case' },
  { id: 'path', label: 'path/case' },
  { id: 'title', label: 'Title Case' },
  { id: 'sentence', label: 'Sentence case' },
  { id: 'upper', label: 'UPPERCASE' },
  { id: 'lower', label: 'lowercase' },
  { id: 'slug', label: 'url-slug' },
];

export const UNICODE_STYLES: readonly UnicodeStyleMeta[] = [
  { id: 'bold_serif', label: 'Bold Serif' },
  { id: 'bold_sans', label: 'Bold Sans' },
  { id: 'italic_serif', label: 'Italic Serif' },
  { id: 'bold_italic', label: 'Bold Italic' },
  { id: 'script', label: 'Script / Cursive' },
  { id: 'bold_script', label: 'Bold Script' },
  { id: 'fraktur', label: 'Fraktur / Gothic' },
  { id: 'double_struck', label: 'Double-Struck' },
  { id: 'monospace', label: 'Monospace' },
  { id: 'small_caps', label: 'Small Caps' },
  { id: 'circled', label: 'Circled' },
  { id: 'squared', label: 'Squared' },
  { id: 'fullwidth', label: 'Fullwidth' },
  { id: 'upside_down', label: 'Upside-Down' },
  { id: 'strikethrough', label: 'Strikethrough' },
  { id: 'underline', label: 'Underline' },
];

export const KAOMOJI_CATEGORIES: readonly KaomojiCategory[] = [
  'happy',
  'shrug',
  'flip',
  'love',
  'confused',
  'work',
  'animals',
  'dividers',
];

export const DEFAULT_CASE_OPTIONS: CaseTransformOptions = {
  batchLineByLine: false,
  stripDiacriticsForSlug: true,
};

export const DEFAULT_ZALGO_OPTIONS: ZalgoOptions = {
  intensity: 5,
  includeUp: true,
  includeMid: true,
  includeDown: true,
};
