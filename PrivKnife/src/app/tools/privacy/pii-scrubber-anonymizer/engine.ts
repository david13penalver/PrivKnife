import {
  OutputFormat,
  PiiScrubberAnonymizerOptions,
  PiiScrubberAnonymizerResult,
  RedactionAuditStats,
} from './types';

// -------------------------------------------------------------
// 1. Validation Guardrails
// -------------------------------------------------------------
export function validateScrubberOptions(
  options: PiiScrubberAnonymizerOptions
): { valid: boolean; error?: string } {
  if (!options) {
    return { valid: false, error: 'Scrubber options are required' };
  }

  const validModes = [
    'replacement_tag',
    'mask_characters',
    'salted_hash_pseudonym',
  ];
  if (!validModes.includes(options.redactionMode)) {
    return {
      valid: false,
      error: `Invalid redaction mode: ${options.redactionMode}`,
    };
  }

  if (
    options.redactionMode === 'salted_hash_pseudonym' &&
    (!options.customSalt || options.customSalt.trim().length === 0)
  ) {
    return {
      valid: false,
      error: 'A custom salt is required when using salted_hash_pseudonym mode',
    };
  }

  if (options.customRegexPatterns && options.customRegexPatterns.trim().length > 0) {
    try {
      new RegExp(options.customRegexPatterns);
    } catch (err) {
      return {
        valid: false,
        error: `Invalid custom regex pattern: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Luhn Check Algorithm for Credit Cards
// -------------------------------------------------------------
export function luhnCheck(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

// -------------------------------------------------------------
// 3. Web Crypto Salted Pseudonymization (SHA-256)
// -------------------------------------------------------------
export async function computePseudonym(
  prefix: string,
  value: string,
  salt: string
): Promise<string> {
  const combined = `${salt}:${value}`;
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
    return `${prefix}_${hex}`;
  }

  // Deterministic FNV-1a fallback if Web Crypto is unavailable
  let hash = 0x811c9dc5;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${prefix}_${hex}`;
}

async function replaceMatches(
  text: string,
  regex: RegExp,
  replacer: (match: string) => Promise<string | null> | (string | null)
): Promise<{ text: string; count: number }> {
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  const matches: { match: string; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ match: m[0], index: m.index, length: m[0].length });
  }
  if (matches.length === 0) {
    return { text, count: 0 };
  }
  const unique = Array.from(new Set(matches.map((x) => x.match)));
  const replacementMap = new Map<string, string | null>();
  for (const item of unique) {
    replacementMap.set(item, await replacer(item));
  }
  let result = '';
  let lastIndex = 0;
  let count = 0;
  for (const item of matches) {
    const rep = replacementMap.get(item.match);
    if (rep !== null && rep !== undefined) {
      result += text.slice(lastIndex, item.index) + rep;
      count++;
    } else {
      result += text.slice(lastIndex, item.index) + item.match;
    }
    lastIndex = item.index + item.length;
  }
  result += text.slice(lastIndex);
  return { text: result, count };
}

// -------------------------------------------------------------
// 4. Core PII Scrubbing Engine
// -------------------------------------------------------------
export async function scrubPiiText(
  text: string,
  options: PiiScrubberAnonymizerOptions
): Promise<{ sanitized: string; stats: RedactionAuditStats }> {
  let sanitized = text;

  const stats: RedactionAuditStats = {
    emailsRedacted: 0,
    phonesRedacted: 0,
    ipsRedacted: 0,
    creditCardsRedacted: 0,
    ssnsRedacted: 0,
    apiTokensRedacted: 0,
    customMatchesRedacted: 0,
    totalRedactions: 0,
  };

  const mode = options.redactionMode;
  const salt = options.customSalt || 'privknife_default_salt';

  // 1. API Tokens (do this early before IPs or hex)
  if (options.scrubApiTokens) {
    const tokenRegex =
      /\b(?:sk_live_|ghp_|eyJhbGciOi|AIzaSy|Bearer\s+)[A-Za-z0-9_.-]{16,}\b/g;
    const { text: resText, count } = await replaceMatches(sanitized, tokenRegex, async (match) => {
      if (mode === 'replacement_tag') return '[API_KEY_REDACTED]';
      if (mode === 'mask_characters')
        return match.slice(0, 8) + '***' + match.slice(-4);
      return await computePseudonym('TOKEN', match, salt);
    });
    sanitized = resText;
    stats.apiTokensRedacted += count;
    stats.totalRedactions += count;
  }

  // 2. Credit Cards (with Luhn verification)
  if (options.scrubCreditCards) {
    const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    const { text: resText, count } = await replaceMatches(sanitized, cardRegex, async (match) => {
      const cleanDigits = match.replace(/\D/g, '');
      if (cleanDigits.length >= 13 && cleanDigits.length <= 19 && luhnCheck(cleanDigits)) {
        if (mode === 'replacement_tag') return '[CARD_REDACTED]';
        if (mode === 'mask_characters') {
          return '************' + cleanDigits.slice(-4);
        }
        return await computePseudonym('CARD', cleanDigits, salt);
      }
      return null;
    });
    sanitized = resText;
    stats.creditCardsRedacted += count;
    stats.totalRedactions += count;
  }

  // 3. Social Security Numbers (US SSN: 000-00-0000)
  if (options.scrubSsnNationalIds) {
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const { text: resText, count } = await replaceMatches(sanitized, ssnRegex, async (match) => {
      if (mode === 'replacement_tag') return '[SSN_REDACTED]';
      if (mode === 'mask_characters') return '***-**-' + match.slice(-4);
      return await computePseudonym('SSN', match, salt);
    });
    sanitized = resText;
    stats.ssnsRedacted += count;
    stats.totalRedactions += count;
  }

  // 4. Emails
  if (options.scrubEmails) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const { text: resText, count } = await replaceMatches(sanitized, emailRegex, async (match) => {
      if (mode === 'replacement_tag') return '[EMAIL_REDACTED]';
      if (mode === 'mask_characters') {
        const [user, domain] = match.split('@');
        const maskedUser =
          user.length > 2
            ? user[0] + '***' + user[user.length - 1]
            : '***';
        return `${maskedUser}@${domain}`;
      }
      return await computePseudonym('USER', match, salt);
    });
    sanitized = resText;
    stats.emailsRedacted += count;
    stats.totalRedactions += count;
  }

  // 5. Phone Numbers
  if (options.scrubPhoneNumbers) {
    const phoneRegex =
      /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const { text: resText, count } = await replaceMatches(sanitized, phoneRegex, async (match) => {
      if (mode === 'replacement_tag') return '[PHONE_REDACTED]';
      if (mode === 'mask_characters') {
        return match.replace(/\d(?=.*\d{4})/g, '*');
      }
      return await computePseudonym('PHONE', match, salt);
    });
    sanitized = resText;
    stats.phonesRedacted += count;
    stats.totalRedactions += count;
  }

  // 6. IP Addresses (IPv4 and IPv6)
  if (options.scrubIpAddresses) {
    // 6a. IPv6 Addresses (RFC 4291 compliant full and compressed)
    const ipv6Regex =
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:)+:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\b/gi;
    const { text: textAfterIpv6, count: ipv6Count } = await replaceMatches(sanitized, ipv6Regex, async (match) => {
      if (mode === 'replacement_tag') return '[IP_REDACTED]';
      if (mode === 'mask_characters') {
        const parts = match.split(':');
        const visible = parts.slice(0, 2).filter((p) => p.length > 0).join(':');
        return `${visible || '****'}:****:****`;
      }
      return await computePseudonym('IP', match, salt);
    });
    sanitized = textAfterIpv6;
    stats.ipsRedacted += ipv6Count;
    stats.totalRedactions += ipv6Count;

    // 6b. IPv4 Addresses
    const ipv4Regex =
      /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const { text: textAfterIpv4, count: ipv4Count } = await replaceMatches(sanitized, ipv4Regex, async (match) => {
      if (mode === 'replacement_tag') return '[IP_REDACTED]';
      if (mode === 'mask_characters') {
        const parts = match.split('.');
        return `${parts[0]}.${parts[1]}.*.*`;
      }
      return await computePseudonym('IP', match, salt);
    });
    sanitized = textAfterIpv4;
    stats.ipsRedacted += ipv4Count;
    stats.totalRedactions += ipv4Count;
  }

  // 7. Custom Regex Patterns
  if (options.customRegexPatterns && options.customRegexPatterns.trim().length > 0) {
    try {
      const customRegex = new RegExp(options.customRegexPatterns, 'g');
      const { text: resText, count } = await replaceMatches(sanitized, customRegex, async (match) => {
        if (mode === 'replacement_tag') return '[CUSTOM_REDACTED]';
        if (mode === 'mask_characters') return '*'.repeat(match.length);
        return await computePseudonym('CUSTOM', match, salt);
      });
      sanitized = resText;
      stats.customMatchesRedacted += count;
      stats.totalRedactions += count;
    } catch {
      // Ignore invalid regex
    }
  }

  return { sanitized, stats };
}

// -------------------------------------------------------------
// 5. Deliverable Export Serialization
// -------------------------------------------------------------
export async function processPiiScrub(
  source: File | Blob | string,
  options: PiiScrubberAnonymizerOptions,
  originalFileName: string = 'data.txt'
): Promise<PiiScrubberAnonymizerResult> {
  const validation = validateScrubberOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid scrubber options');
  }

  let textContent = '';
  if (typeof source === 'string') {
    textContent = source;
  } else {
    textContent = await source.text();
  }

  const { sanitized, stats } = await scrubPiiText(textContent, options);

  const format: OutputFormat =
    options.outputFormat ||
    (originalFileName.endsWith('.csv')
      ? 'csv'
      : originalFileName.endsWith('.json')
        ? 'json'
        : 'txt');

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  let outFileName: string;
  let deliverableBlob: Blob;
  let deliverableText: string;
  let mimeType: string;

  if (format === 'json') {
    const jsonOutput = {
      sanitizedContent: sanitized,
      auditStats: stats,
      metadata: {
        originalLength: textContent.length,
        sanitizedLength: sanitized.length,
        redactionMode: options.redactionMode,
        timestamp: Date.now(),
      },
    };
    deliverableText = JSON.stringify(jsonOutput, null, 2);
    deliverableBlob = new Blob([deliverableText], {
      type: 'application/json',
    });
    outFileName = `${baseName}-sanitized.json`;
    mimeType = 'application/json';
  } else if (format === 'csv') {
    deliverableText = sanitized;
    deliverableBlob = new Blob([deliverableText], { type: 'text/csv' });
    outFileName = `${baseName}-sanitized.csv`;
    mimeType = 'text/csv';
  } else {
    deliverableText = sanitized;
    deliverableBlob = new Blob([deliverableText], { type: 'text/plain' });
    outFileName = `${baseName}-sanitized.txt`;
    mimeType = 'text/plain';
  }

  return {
    success: true,
    blob: deliverableBlob,
    fileName: outFileName,
    fileSize: deliverableBlob.size,
    mimeType,
    sanitizedText: deliverableText,
    auditStats: stats,
    metadata: {
      originalLength: textContent.length,
      sanitizedLength: sanitized.length,
      redactionMode: options.redactionMode,
      format,
      timestamp: Date.now(),
    },
  };
}
