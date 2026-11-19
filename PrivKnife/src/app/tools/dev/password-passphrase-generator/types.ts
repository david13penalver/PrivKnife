export type GeneratorMode = 'password' | 'passphrase' | 'dev_secret' | 'auditor';

export type DevSecretPreset =
  | 'hex_256'
  | 'base64url_256'
  | 'api_key_prefixed'
  | 'wpa2_63'
  | 'recovery_codes';

export type WordCaseMode = 'lower' | 'title' | 'upper' | 'random_upper';

export type EntropyGrade = 'very_weak' | 'weak' | 'fair' | 'strong' | 'excellent';

export type CharTokenKind = 'letter' | 'digit' | 'symbol';

export interface CharToken {
  ch: string;
  kind: CharTokenKind;
}

export interface RandomSource {
  getRandomValues<T extends ArrayBufferView<ArrayBuffer>>(array: T): T;
}

export interface PasswordGeneratorOptions {
  mode: GeneratorMode;
  batchCount: number; // 1..100
  // Password mode
  length: number; // 8..128
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  customSymbols: string;
  excludeAmbiguous: boolean;
  requireEachClass: boolean;
  // Passphrase mode
  wordCount: number; // 3..12
  separator: string;
  wordCase: WordCaseMode;
  appendNumber: boolean;
  appendSymbol?: boolean;
  // Dev secret mode
  devPreset: DevSecretPreset;
  apiKeyPrefix: string;
  envVariableName: string;
}

export interface EntropyReport {
  bits: number;
  grade: EntropyGrade;
  crackTimeFastGpu: string;
  crackTimeArgon2: string;
  warnings: string[];
}

export interface PasswordGeneratorResult {
  success: boolean;
  items: string[];
  entropy: EntropyReport;
  error?: string;
}

export const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
export const NUMBER_CHARS = '0123456789';
export const DEFAULT_SYMBOL_CHARS = '!@#$%^&*()-_=+[]{};:,.?/';
export const AMBIGUOUS_CHARS = '0Oo1lI|';
export const BASE62_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const CROCKFORD_BASE32_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const WPA2_ASCII_CHARS = Array.from({ length: 0x7e - 0x21 + 1 }, (_, i) =>
  String.fromCharCode(0x21 + i),
).join('');
export const PASSPHRASE_SYMBOLS = '!@#$%^&*';

export const BATCH_COUNT_PRESETS = [1, 5, 10, 25, 50] as const;

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  mode: 'password',
  batchCount: 1,
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  customSymbols: DEFAULT_SYMBOL_CHARS,
  excludeAmbiguous: false,
  requireEachClass: true,
  wordCount: 6,
  separator: '-',
  wordCase: 'lower',
  appendNumber: false,
  appendSymbol: false,
  devPreset: 'base64url_256',
  apiKeyPrefix: 'pk_live_',
  envVariableName: 'JWT_SECRET',
};
