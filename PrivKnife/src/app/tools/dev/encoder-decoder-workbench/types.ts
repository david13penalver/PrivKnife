export type CodecMode = 'base64' | 'url' | 'html_unicode' | 'hex' | 'binary' | 'morse';

export type CodecDirection = 'encode' | 'decode';

export type UrlEncodeMode = 'component' | 'full_uri' | 'form_plus';

export type HexDelimiter = 'space' | 'none' | 'colon' | '0x' | 'backslash_x';

export type HtmlEncodeMode = 'minimal' | 'all_non_ascii' | 'js_unicode';

export type BinaryRadix = 'binary' | 'octal' | 'decimal';

export interface EncoderWorkbenchOptions {
  mode: CodecMode;
  direction: CodecDirection;
  base64UrlSafe: boolean;
  base64OmitPadding: boolean;
  base64Wrap76: boolean;
  urlMode: UrlEncodeMode;
  hexDelimiter: HexDelimiter;
  hexUppercase: boolean;
  htmlEncodeMode: HtmlEncodeMode;
  binaryRadix: BinaryRadix;
  morseWpm: number;
  morseFrequencyHz: number;
}

export interface DetectedBinaryInfo {
  mimeType: string;
  extension: string;
  byteLength: number;
}

export interface UrlParamEntry {
  key: string;
  value: string;
}

export interface ParsedUrlSummary {
  validUrl: boolean;
  baseWithoutQuery: string;
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: UrlParamEntry[];
}

export interface MorseTimelineEvent {
  type: 'tone' | 'silence';
  startSec: number;
  durationSec: number;
}

export interface MorseTimeline {
  events: MorseTimelineEvent[];
  totalDurationSec: number;
  truncated: boolean;
}

export interface EncoderWorkbenchResult {
  success: boolean;
  outputText: string;
  inputBytes: number;
  outputBytes: number;
  detectedBinary?: DetectedBinaryInfo;
  decodedBytes?: Uint8Array;
  parsedUrlParams?: UrlParamEntry[];
  parsedUrl?: ParsedUrlSummary;
  warnings?: string[];
  error?: string;
}

export const DEFAULT_WORKBENCH_OPTIONS: EncoderWorkbenchOptions = {
  mode: 'base64',
  direction: 'encode',
  base64UrlSafe: false,
  base64OmitPadding: false,
  base64Wrap76: false,
  urlMode: 'component',
  hexDelimiter: 'space',
  hexUppercase: true,
  htmlEncodeMode: 'minimal',
  binaryRadix: 'binary',
  morseWpm: 20,
  morseFrequencyHz: 650,
};

export const WORKER_FILE_THRESHOLD_BYTES = 2 * 1024 * 1024;
export const MAX_PREVIEW_CHARS = 1_048_576;
export const MAX_MORSE_WAV_SECONDS = 120;
