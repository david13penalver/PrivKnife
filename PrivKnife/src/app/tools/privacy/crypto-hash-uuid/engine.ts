import { computeMd5 } from './md5';
import {
  ExportFormat,
  ExportOptions,
  HashAlgorithm,
  HashBatchOptions,
  HashResultItem,
  UuidBatchOptions,
  UuidFormatOptions,
} from './types';

/**
 * Format a single UUID string according to user preferences.
 */
export function formatUuid(uuid: string, options: UuidFormatOptions): string {
  let value = uuid;

  // Remove hyphens if requested
  if (!options.includeHyphens) {
    value = value.replace(/-/g, '');
  }

  // Apply casing
  if (options.casing === 'uppercase') {
    value = value.toUpperCase();
  } else {
    value = value.toLowerCase();
  }

  // Apply prefix and suffix
  if (options.prefix) {
    value = `${options.prefix}${value}`;
  }
  if (options.suffix) {
    value = `${value}${options.suffix}`;
  }

  // Apply quote wrapping
  if (options.quotes === 'single') {
    value = `'${value}'`;
  } else if (options.quotes === 'double') {
    value = `"${value}"`;
  }

  return value;
}

/**
 * Generate a batch of RFC 4122 UUIDv4 strings.
 */
export function generateUuidBatch(options: UuidBatchOptions): string[] {
  const result: string[] = [];
  const qty = Math.max(0, options.quantity);

  for (let i = 0; i < qty; i++) {
    const rawUuid = crypto.randomUUID();
    result.push(formatUuid(rawUuid, options));
  }

  return result;
}

/**
 * Compute cryptographic digest for a given text string.
 */
export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'MD5') {
    return computeMd5(text);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute cryptographic hashes for an array of input strings.
 */
export async function hashBatch(
  items: string[],
  options: HashBatchOptions
): Promise<HashResultItem[]> {
  const results: HashResultItem[] = [];

  for (const item of items) {
    const rawHash = await hashText(item, options.algorithm);
    const formattedHash =
      options.casing === 'uppercase' ? rawHash.toUpperCase() : rawHash.toLowerCase();
    results.push({
      input: item,
      hash: formattedHash,
      algorithm: options.algorithm,
    });
  }

  return results;
}

function isHashResultArray(
  data: string[] | HashResultItem[]
): data is HashResultItem[] {
  return data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'hash' in data[0];
}

/**
 * Serialize batch data (UUIDs or HashResultItems) to Plain Text, CSV, or JSON.
 */
export function exportBatch(
  data: string[] | HashResultItem[],
  format: ExportFormat,
  options?: ExportOptions
): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (isHashResultArray(data)) {
    if (format === 'csv') {
      const header = options?.csvHeader ?? 'input,algorithm,hash';
      const rows = data.map(
        (item) => `"${item.input.replace(/"/g, '""')}","${item.algorithm}","${item.hash}"`
      );
      return [header, ...rows].join('\n');
    }

    // format === 'txt'
    const delimiter = options?.delimiter ?? '\n';
    return data.map((item) => `${item.input}: ${item.hash}`).join(delimiter);
  }

  // data is string[]
  const stringList = data as string[];
  if (format === 'csv') {
    const header = options?.csvHeader;
    return header ? [header, ...stringList].join('\n') : stringList.join('\n');
  }

  // format === 'txt'
  const delimiter = options?.delimiter ?? '\n';
  return stringList.join(delimiter);
}
