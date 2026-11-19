import { PasswordGeneratorOptions, RandomSource, DEFAULT_PASSWORD_OPTIONS } from './types';

export function createSequenceRandomSource(values: readonly number[]): RandomSource {
  let cursor = 0;
  return {
    getRandomValues<T extends ArrayBufferView<ArrayBuffer>>(array: T): T {
      const view = new Uint32Array(
        array.buffer,
        array.byteOffset,
        Math.floor(array.byteLength / Uint32Array.BYTES_PER_ELEMENT),
      );
      for (let i = 0; i < view.length; i++) {
        view[i] = values[cursor % values.length] >>> 0;
        cursor++;
      }
      return array;
    },
  };
}

export const STRICT_NO_AMBIGUOUS_OPTIONS: PasswordGeneratorOptions = {
  ...DEFAULT_PASSWORD_OPTIONS,
  mode: 'password',
  length: 24,
  excludeAmbiguous: true,
  requireEachClass: true,
  batchCount: 1,
};

export const PASSPHRASE_FIXTURE_OPTIONS: PasswordGeneratorOptions = {
  ...DEFAULT_PASSWORD_OPTIONS,
  mode: 'passphrase',
  wordCount: 6,
  separator: '-',
  wordCase: 'lower',
  appendNumber: false,
  appendSymbol: false,
  batchCount: 1,
};

export const DEV_HEX_256_OPTIONS: PasswordGeneratorOptions = {
  ...DEFAULT_PASSWORD_OPTIONS,
  mode: 'dev_secret',
  devPreset: 'hex_256',
  batchCount: 1,
};

export const SAMPLE_AUDITOR_PASSWORDS = {
  weakCommon: 'password123',
  keyboardWalk: 'qwertyuiop',
  reverseSequence: '987654321',
  repeatedRuns: 'aaaaaaBBBBBB',
  yearPattern: 'Summer2024!',
  unicodeEmoji: '🔒Café🚀2026!XyZ',
  strongRandom: 'V9#kQ2!mZ8$pL4@wX6&nR3^jT',
} as const;
