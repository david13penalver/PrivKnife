import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { marked } from 'marked';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  DEFAULT_OFFICE_TO_PDF_OPTIONS,
  OfficeOrientation,
  OfficePaperSize,
  OfficeToPdfDiagnostics,
  OfficeToPdfInput,
  OfficeToPdfInspectResult,
  OfficeToPdfOptions,
  OfficeToPdfResult,
  PaginatedPreviewPage,
  PdfRenderBlock,
  PdfRenderModel,
  RenderStatsCounts,
  SupportedOfficeFormat,
  TextRun,
} from './types';

export interface SanitizeHtmlResult {
  html: string;
  blockedRemoteUrls: number;
  blockedTags: number;
}

interface ParsedXmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: Array<ParsedXmlNode | string>;
}

const VOID_HTML_TAGS = new Set(['br', 'hr', 'img', 'wbr']);
const FORBIDDEN_STRIP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'noscript',
  'template',
  'audio',
  'video',
]);
const FORBIDDEN_SELF_TAGS = new Set([
  'link',
  'meta',
  'base',
  'input',
  'button',
  'textarea',
  'select',
  'source',
  'track',
]);
const ALLOWED_HTML_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'a',
  'span',
  'div',
  'img',
]);

const REMOTE_URL_PATTERN = /^(?:https?:|ftp:|wss?:|\/\/)/i;
const SAFE_DATA_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const URL_ATTR_NAMES = new Set([
  'src',
  'href',
  'srcset',
  'poster',
  'data',
  'action',
  'formaction',
  'xlink:href',
  'background',
]);

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes('&')) return input;
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    colon: ':',
    tab: '\t',
    newline: '\n',
  };
  return input.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const code = Number.parseInt(body.slice(2), 16);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      if (body.startsWith('#')) {
        const code = Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      const lower = body.toLowerCase();
      return Object.prototype.hasOwnProperty.call(named, lower)
        ? named[lower]
        : match;
    }
  );
}

function normalizeUrlCandidate(rawValue: string): string {
  const decoded = decodeHtmlEntities(rawValue);
  // Remove ASCII control characters & whitespace obfuscation inside scheme
  return decoded.replace(/[\u0000-\u0020]+/g, '').trim();
}

function isRemoteNetworkUrl(rawValue: string): boolean {
  const normalized = normalizeUrlCandidate(rawValue);
  if (!normalized) return false;
  if (normalized.startsWith('//')) return true;
  return REMOTE_URL_PATTERN.test(normalized);
}

function countCssRemoteUrls(cssText: string): number {
  let count = 0;
  const urlMatches = cssText.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi);
  for (const m of urlMatches) {
    if (isRemoteNetworkUrl(m[2] ?? '')) {
      count++;
    }
  }
  const importMatches = cssText.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/gi);
  for (const m of importMatches) {
    // Only count if not already matched as url(...)
    if (!m[0].toLowerCase().includes('url(') && isRemoteNetworkUrl(m[1] ?? '')) {
      count++;
    }
  }
  return count;
}

function extractBodyOrDocument(html: string): string {
  // Keep <head> children (like <link>/<style>) briefly so forbidden-tag pass audits
  // remote resource URLs before removing them, while discarding <title> text.
  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '');
}

function parseAttributesFromTagBody(attrRaw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex =
    /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrRaw)) !== null) {
    const name = match[1].toLowerCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = val;
  }
  return attrs;
}

function runWorkerSafeHtmlPass(rawHtml: string): SanitizeHtmlResult {
  let blockedRemoteUrls = 0;
  let blockedTags = 0;

  let working = extractBodyOrDocument(rawHtml).replace(/<!--[\s\S]*?-->/g, '');

  // Strip executable / external container tags with bodies, auditing URLs inside first
  for (const tagName of FORBIDDEN_STRIP_WITH_CONTENT) {
    const blockRe = new RegExp(
      `<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}\\s*>`,
      'gi'
    );
    working = working.replace(blockRe, (_full, attrStr: string, inner: string) => {
      blockedTags++;
      if (tagName === 'style') {
        blockedRemoteUrls += countCssRemoteUrls(decodeHtmlEntities(inner));
      } else if (tagName !== 'script') {
        const attrs = parseAttributesFromTagBody(attrStr);
        for (const key of Object.keys(attrs)) {
          if (URL_ATTR_NAMES.has(key) && isRemoteNetworkUrl(attrs[key])) {
            blockedRemoteUrls++;
          }
        }
      }
      return '';
    });

    // Also strip unclosed or self-closing variants
    const danglingRe = new RegExp(`<\\/?${tagName}\\b([^>]*)>`, 'gi');
    working = working.replace(danglingRe, (_full, attrStr: string) => {
      blockedTags++;
      if (tagName !== 'script' && attrStr) {
        const attrs = parseAttributesFromTagBody(attrStr);
        for (const key of Object.keys(attrs)) {
          if (URL_ATTR_NAMES.has(key) && isRemoteNetworkUrl(attrs[key])) {
            blockedRemoteUrls++;
          }
        }
      }
      return '';
    });
  }

  // Strip void/form/head link tags while counting remote resource references
  for (const tagName of FORBIDDEN_SELF_TAGS) {
    const selfRe = new RegExp(`<\\/?${tagName}\\b([^>]*)>`, 'gi');
    working = working.replace(selfRe, (_full, attrStr: string) => {
      blockedTags++;
      if (attrStr) {
        const attrs = parseAttributesFromTagBody(attrStr);
        for (const key of Object.keys(attrs)) {
          if (URL_ATTR_NAMES.has(key) && isRemoteNetworkUrl(attrs[key])) {
            blockedRemoteUrls++;
          }
        }
      }
      return '';
    });
  }

  // Sanitize remaining tags and attributes
  working = working.replace(
    /<(\/?)([a-zA-Z0-9:-]+)([^>]*)>/g,
    (_full, slash: string, rawName: string, attrRaw: string) => {
      const tag = rawName.toLowerCase();
      if (!ALLOWED_HTML_TAGS.has(tag)) {
        blockedTags++;
        if (!slash && attrRaw) {
          const attrs = parseAttributesFromTagBody(attrRaw);
          for (const key of Object.keys(attrs)) {
            if (URL_ATTR_NAMES.has(key) && isRemoteNetworkUrl(attrs[key])) {
              blockedRemoteUrls++;
            }
          }
        }
        return '';
      }

      if (slash) {
        if (VOID_HTML_TAGS.has(tag)) return '';
        return `</${tag}>`;
      }

      const rawAttrs = parseAttributesFromTagBody(attrRaw);
      const safeAttrs: string[] = [];

      for (const [attrName, attrVal] of Object.entries(rawAttrs)) {
        if (attrName.startsWith('on') || attrName.startsWith('data-')) {
          continue;
        }

        if (attrName === 'style') {
          const cssBlocked = countCssRemoteUrls(decodeHtmlEntities(attrVal));
          if (cssBlocked > 0) {
            blockedRemoteUrls += cssBlocked;
            // Drop any style declaration containing url(...)
            const cleanedStyle = decodeHtmlEntities(attrVal)
              .replace(/[^;]*url\([^)]*\)[^;]*;?/gi, '')
              .trim();
            if (cleanedStyle) {
              safeAttrs.push(`style="${escapeHtmlText(cleanedStyle)}"`);
            }
            continue;
          }
          if (attrVal.toLowerCase().includes('expression(')) {
            continue;
          }
          safeAttrs.push(`style="${escapeHtmlText(decodeHtmlEntities(attrVal))}"`);
          continue;
        }

        if (URL_ATTR_NAMES.has(attrName)) {
          if (attrName === 'srcset') {
            const parts = decodeHtmlEntities(attrVal).split(',');
            for (const part of parts) {
              const candidate = part.trim().split(/\s+/)[0] ?? '';
              if (isRemoteNetworkUrl(candidate)) blockedRemoteUrls++;
            }
            continue;
          }

          if (isRemoteNetworkUrl(attrVal)) {
            blockedRemoteUrls++;
            continue;
          }

          const normalized = normalizeUrlCandidate(attrVal);
          if (
            tag === 'img' &&
            attrName === 'src' &&
            SAFE_DATA_IMAGE_PATTERN.test(normalized)
          ) {
            const cleanDataUri = decodeHtmlEntities(attrVal).replace(/\s+/g, '');
            safeAttrs.push(`src="${escapeHtmlText(cleanDataUri)}"`);
          } else if (tag === 'a' && attrName === 'href' && normalized.startsWith('#')) {
            safeAttrs.push(`href="${escapeHtmlText(normalized)}"`);
          }
          // Any javascript:, vbscript:, data:text/html, data:image/svg+xml is dropped
          continue;
        }

        if (
          attrName === 'alt' ||
          attrName === 'title' ||
          attrName === 'colspan' ||
          attrName === 'rowspan' ||
          attrName === 'class'
        ) {
          safeAttrs.push(`${attrName}="${escapeHtmlText(decodeHtmlEntities(attrVal))}"`);
        }
      }

      if (tag === 'img') {
        const hasSafeSrc = safeAttrs.some((a) => a.startsWith('src='));
        if (!hasSafeSrc) {
          return '';
        }
      }

      const attrString = safeAttrs.length > 0 ? ` ${safeAttrs.join(' ')}` : '';
      return `<${tag}${attrString}>`;
    }
  );

  return {
    html: working.trim(),
    blockedRemoteUrls,
    blockedTags,
  };
}

function getDomPurifyInstance(): typeof DOMPurify | null {
  if (typeof window === 'undefined') return null;
  if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify;
  }
  const maybeFactory = DOMPurify as unknown as ((w: Window) => typeof DOMPurify) | undefined;
  if (typeof maybeFactory === 'function') {
    return maybeFactory(window);
  }
  return null;
}

/**
 * Sanitizes HTML strictly offline:
 * - Blocks all remote network references (`http:`, `https:`, `//`, `ftp:`, `ws:`, CSS `url(...)`, `@import`)
 * - Blocks all scripts, event handlers, iframes, SVG/data-script payloads
 * - Preserves embedded raster `data:image/*` base64 images
 */
export function sanitizeHtmlZeroNetwork(rawHtml: string): SanitizeHtmlResult {
  if (!rawHtml || !rawHtml.trim()) {
    return { html: '', blockedRemoteUrls: 0, blockedTags: 0 };
  }

  const pass1 = runWorkerSafeHtmlPass(rawHtml);
  const purifier = getDomPurifyInstance();
  if (!purifier) {
    return pass1;
  }

  let hookBlocked = 0;
  const hook = (
    _node: Element,
    data: { attrName: string; attrValue: string; keepAttr: boolean }
  ) => {
    const attrName = (data.attrName || '').toLowerCase();
    const attrVal = data.attrValue || '';

    if (attrName === 'style') {
      const cssBlocked = countCssRemoteUrls(attrVal);
      if (cssBlocked > 0 || /url\(/i.test(attrVal)) {
        hookBlocked += cssBlocked;
        data.keepAttr = false;
      }
      return;
    }

    if (URL_ATTR_NAMES.has(attrName)) {
      if (isRemoteNetworkUrl(attrVal)) {
        hookBlocked++;
        data.keepAttr = false;
        return;
      }
      const norm = normalizeUrlCandidate(attrVal);
      if (attrName === 'src' && SAFE_DATA_IMAGE_PATTERN.test(norm)) {
        return;
      }
      if (attrName === 'href' && norm.startsWith('#')) {
        return;
      }
      data.keepAttr = false;
    }
  };

  purifier.addHook('uponSanitizeAttribute', hook);
  try {
    const clean = purifier.sanitize(pass1.html, {
      ALLOWED_TAGS: Array.from(ALLOWED_HTML_TAGS),
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan', 'style'],
      FORBID_TAGS: [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'svg',
        'math',
        'link',
        'meta',
        'base',
        'form',
      ],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,|^#/i,
    });

    // Drop any <img> stripped of its src during Pass 2
    const finalHtml = String(clean).replace(/<img(?![^>]*\ssrc=)[^>]*>/gi, '').trim();
    return {
      html: finalHtml,
      blockedRemoteUrls: pass1.blockedRemoteUrls + hookBlocked,
      blockedTags: pass1.blockedTags,
    };
  } finally {
    purifier.removeHook('uponSanitizeAttribute', hook);
  }
}

// ============================================================================
// Pure-TS XML & HTML Tokenizer / Tree Parser (Worker + Browser + Node safe)
// ============================================================================

function parseTagTree(source: string, isHtmlMode: boolean): ParsedXmlNode {
  const root: ParsedXmlNode = { tag: '#root', attrs: {}, children: [] };
  const stack: ParsedXmlNode[] = [root];

  const cleaned = source
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const tokenRe = /<(\/?)([a-zA-Z0-9_:-]+)((?:\s+[^<>]*?)?)(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(cleaned)) !== null) {
    if (match[5] !== undefined) {
      const text = match[5];
      if (text.length > 0) {
        stack[stack.length - 1].children.push(decodeHtmlEntities(text));
      }
      continue;
    }

    const isClose = match[1] === '/';
    const rawTag = match[2];
    const tag = isHtmlMode ? rawTag.toLowerCase() : rawTag;
    const attrStr = match[3] ?? '';
    const isSelfClose = match[4] === '/' || (isHtmlMode && VOID_HTML_TAGS.has(tag));

    if (isClose) {
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrs: Record<string, string> = {};
    if (attrStr.trim()) {
      const attrRe =
        /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(attrStr)) !== null) {
        const key = isHtmlMode ? am[1].toLowerCase() : am[1];
        const val = am[2] ?? am[3] ?? am[4] ?? '';
        attrs[key] = decodeHtmlEntities(val);
      }
    }

    const node: ParsedXmlNode = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!isSelfClose) {
      stack.push(node);
    }
  }

  return root;
}

function getLocalTagName(tag: string): string {
  const idx = tag.indexOf(':');
  return idx >= 0 ? tag.slice(idx + 1).toLowerCase() : tag.toLowerCase();
}

function getAttrIgnoreNs(node: ParsedXmlNode, localName: string): string | undefined {
  for (const [k, v] of Object.entries(node.attrs)) {
    const colon = k.indexOf(':');
    const local = colon >= 0 ? k.slice(colon + 1).toLowerCase() : k.toLowerCase();
    if (local === localName.toLowerCase()) {
      return v;
    }
  }
  return undefined;
}

function findDirectChild(node: ParsedXmlNode, localTag: string): ParsedXmlNode | undefined {
  const target = localTag.toLowerCase();
  for (const child of node.children) {
    if (typeof child !== 'string' && getLocalTagName(child.tag) === target) {
      return child;
    }
  }
  return undefined;
}

function findAllDescendants(node: ParsedXmlNode, localTag: string): ParsedXmlNode[] {
  const target = localTag.toLowerCase();
  const out: ParsedXmlNode[] = [];
  const visit = (cur: ParsedXmlNode) => {
    for (const child of cur.children) {
      if (typeof child === 'string') continue;
      if (getLocalTagName(child.tag) === target) {
        out.push(child);
      }
      visit(child);
    }
  };
  visit(node);
  return out;
}

function collectNodePlainText(node: ParsedXmlNode): string {
  let out = '';
  for (const child of node.children) {
    if (typeof child === 'string') {
      out += child;
    } else if (getLocalTagName(child.tag) === 'br') {
      out += '\n';
    } else {
      out += collectNodePlainText(child);
    }
  }
  return out;
}

// ============================================================================
// Format Detection
// ============================================================================

function isZipMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

function isOle2Magic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  );
}

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export async function detectOfficeFormat(
  bytes: Uint8Array,
  fileName: string,
  hintFormat?: SupportedOfficeFormat
): Promise<SupportedOfficeFormat> {
  if (!bytes || bytes.length === 0) {
    throw new Error('Input file is empty (0 bytes).');
  }

  const ext = extOf(fileName);

  if (isOle2Magic(bytes)) {
    if (ext === 'xls' || hintFormat === 'xlsx') {
      return 'xlsx';
    }
    throw new Error(
      'Legacy binary .doc / OLE2 encrypted Office files are not supported offline. Please re-save as modern .docx.'
    );
  }

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    if (!isZipMagic(bytes)) {
      throw new Error('Invalid or corrupted ZIP/OOXML container header.');
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(bytes);
    } catch {
      throw new Error('Failed to unpack OOXML ZIP container: file may be corrupt.');
    }
    const entries = Object.keys(zip.files).map((k) => k.toLowerCase());
    if (entries.includes('word/document.xml')) return 'docx';
    if (entries.includes('xl/workbook.xml')) return 'xlsx';
    if (entries.includes('encryptedpackage')) {
      throw new Error(
        'Encrypted or password-protected OOXML packages cannot be parsed directly.'
      );
    }
    throw new Error(
      'Unrecognized OOXML ZIP archive (missing word/document.xml or xl/workbook.xml).'
    );
  }

  if (ext === 'docx' || ext === 'xlsx') {
    throw new Error(
      `File "${fileName}" has .${ext} extension but lacks valid OOXML ZIP signature.`
    );
  }
  if (ext === 'html' || ext === 'htm' || hintFormat === 'html') return 'html';
  if (ext === 'md' || ext === 'markdown' || hintFormat === 'md') return 'md';
  if (ext === 'csv' || ext === 'tsv' || hintFormat === 'csv') return 'csv';

  // Fallback sniff on UTF-8 text prefix
  const sample = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.subarray(0, Math.min(bytes.length, 512)))
    .trimStart();
  if (/^(?:<!doctype|<html|<head|<body|<h[1-6]|<p\b|<div\b|<table\b)/i.test(sample)) {
    return 'html';
  }
  if (sample.includes(',') || sample.includes('\t')) {
    return 'csv';
  }
  return 'md';
}

// ============================================================================
// OOXML (.docx) Parser
// ============================================================================

function uint8ToBase64(bytes: Uint8Array): string {
  const g = globalThis as unknown as {
    Buffer?: { from: (b: Uint8Array) => { toString: (enc: string) => string } };
  };
  if (g.Buffer) {
    return g.Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function readOoxmlToggle(rPr: ParsedXmlNode | undefined, flagName: string): boolean {
  if (!rPr) return false;
  const flagNode = findDirectChild(rPr, flagName);
  if (!flagNode) return false;
  const val = getAttrIgnoreNs(flagNode, 'val');
  if (!val) return true;
  const lower = val.toLowerCase();
  if (lower === '0' || lower === 'false' || lower === 'off' || lower === 'none') {
    return false;
  }
  return true;
}

function detectImageFormatFromPath(
  path: string
): { mime: string; format: 'PNG' | 'JPEG' | 'WEBP' } | null {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return { mime: 'image/png', format: 'PNG' };
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return { mime: 'image/jpeg', format: 'JPEG' };
  }
  if (lower.endsWith('.webp')) return { mime: 'image/webp', format: 'WEBP' };
  return null;
}

function mergeAdjacentRuns(runs: TextRun[]): TextRun[] {
  const merged: TextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      Boolean(prev.bold) === Boolean(run.bold) &&
      Boolean(prev.italic) === Boolean(run.italic) &&
      Boolean(prev.underline) === Boolean(run.underline) &&
      Boolean(prev.code) === Boolean(run.code)
    ) {
      prev.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

function extractRunsFromParagraph(
  pNode: ParsedXmlNode
): { runs: TextRun[]; embeddedImageRelIds: string[] } {
  const runs: TextRun[] = [];
  const embeddedImageRelIds: string[] = [];

  const walkRunContainer = (container: ParsedXmlNode) => {
    for (const child of container.children) {
      if (typeof child === 'string') continue;
      const local = getLocalTagName(child.tag);
      if (local === 'r') {
        const rPr = findDirectChild(child, 'rPr');
        const bold = readOoxmlToggle(rPr, 'b');
        const italic = readOoxmlToggle(rPr, 'i');
        const underline = readOoxmlToggle(rPr, 'u');

        for (const rChild of child.children) {
          if (typeof rChild === 'string') continue;
          const rLocal = getLocalTagName(rChild.tag);
          if (rLocal === 't' || rLocal === 'delText') {
            const text = collectNodePlainText(rChild);
            if (text) {
              runs.push({ text, bold, italic, underline });
            }
          } else if (rLocal === 'tab') {
            runs.push({ text: '  ', bold, italic, underline });
          } else if (rLocal === 'br' || rLocal === 'cr') {
            runs.push({ text: '\n', bold, italic, underline });
          } else if (rLocal === 'drawing' || rLocal === 'pict') {
            const blips = findAllDescendants(rChild, 'blip');
            for (const blip of blips) {
              const rId =
                getAttrIgnoreNs(blip, 'embed') || getAttrIgnoreNs(blip, 'link');
              if (rId && !isRemoteNetworkUrl(rId)) {
                embeddedImageRelIds.push(rId);
              }
            }
            const vImgs = findAllDescendants(rChild, 'imagedata');
            for (const vImg of vImgs) {
              const rId = getAttrIgnoreNs(vImg, 'id');
              if (rId) embeddedImageRelIds.push(rId);
            }
          }
        }
      } else if (local === 'hyperlink' || local === 'sdt' || local === 'sdtContent') {
        walkRunContainer(child);
      }
    }
  };

  walkRunContainer(pNode);
  return { runs: mergeAdjacentRuns(runs), embeddedImageRelIds };
}

function parseDocxHeadingLevel(styleVal: string | undefined): 1 | 2 | 3 | 4 | 5 | 6 | null {
  if (!styleVal) return null;
  const trimmed = styleVal.trim().toLowerCase();
  if (trimmed === 'title') return 1;
  if (trimmed === 'subtitle') return 2;
  const m = /^heading\s*([1-6])$/.exec(trimmed);
  if (m) return Number(m[1]) as 1 | 2 | 3 | 4 | 5 | 6;
  return null;
}

function countBlocks(blocks: PdfRenderBlock[]): RenderStatsCounts {
  const counts: RenderStatsCounts = {
    paragraphs: 0,
    headings: 0,
    tables: 0,
    images: 0,
    lists: 0,
    codeBlocks: 0,
  };
  for (const b of blocks) {
    if (b.type === 'paragraph' || b.type === 'blockquote') counts.paragraphs++;
    else if (b.type === 'heading') counts.headings++;
    else if (b.type === 'table') counts.tables++;
    else if (b.type === 'image') counts.images++;
    else if (b.type === 'list') counts.lists++;
    else if (b.type === 'code_block') counts.codeBlocks++;
  }
  return counts;
}

function computeMaxTableColumns(blocks: PdfRenderBlock[]): number {
  let maxCols = 0;
  for (const b of blocks) {
    if (b.type === 'table') {
      maxCols = Math.max(
        maxCols,
        b.headers.length,
        ...b.rows.map((r) => r.length)
      );
    }
  }
  return maxCols;
}

async function parseDocxToRenderModel(
  bytes: Uint8Array,
  fileName: string
): Promise<PdfRenderModel> {
  const zip = await JSZip.loadAsync(bytes);
  const docEntry =
    zip.file('word/document.xml') ??
    Object.values(zip.files).find((f) => f.name.toLowerCase() === 'word/document.xml');
  if (!docEntry) {
    throw new Error('Malformed .docx archive: word/document.xml is missing.');
  }

  const docXml = await docEntry.async('text');
  const warnings: string[] = [];

  // Map rId -> Target from word/_rels/document.xml.rels
  const relMap = new Map<string, string>();
  const relsEntry =
    zip.file('word/_rels/document.xml.rels') ??
    Object.values(zip.files).find(
      (f) => f.name.toLowerCase() === 'word/_rels/document.xml.rels'
    );
  if (relsEntry) {
    const relsTree = parseTagTree(await relsEntry.async('text'), false);
    for (const rel of findAllDescendants(relsTree, 'Relationship')) {
      const id = getAttrIgnoreNs(rel, 'Id');
      const target = getAttrIgnoreNs(rel, 'Target');
      const targetMode = getAttrIgnoreNs(rel, 'TargetMode');
      if (id && target && targetMode?.toLowerCase() !== 'external') {
        relMap.set(id, target);
      }
    }
  }

  // Track ordered vs bulleted list numbering definitions if numbering.xml exists
  const numFormatById = new Map<string, 'ordered' | 'bullet'>();
  const numEntry = zip.file('word/numbering.xml');
  if (numEntry) {
    const numTree = parseTagTree(await numEntry.async('text'), false);
    const abstractFormats = new Map<string, 'ordered' | 'bullet'>();
    for (const abs of findAllDescendants(numTree, 'abstractNum')) {
      const absId = getAttrIgnoreNs(abs, 'abstractNumId');
      const lvl = findAllDescendants(abs, 'lvl')[0];
      const numFmt = lvl ? findDirectChild(lvl, 'numFmt') : undefined;
      const fmtVal = numFmt ? getAttrIgnoreNs(numFmt, 'val')?.toLowerCase() : undefined;
      if (absId && fmtVal) {
        abstractFormats.set(absId, fmtVal === 'bullet' ? 'bullet' : 'ordered');
      }
    }
    for (const num of findAllDescendants(numTree, 'num')) {
      const numId = getAttrIgnoreNs(num, 'numId');
      const absRef = findDirectChild(num, 'abstractNumId');
      const absVal = absRef ? getAttrIgnoreNs(absRef, 'val') : undefined;
      if (numId && absVal && abstractFormats.has(absVal)) {
        numFormatById.set(numId, abstractFormats.get(absVal)!);
      }
    }
  }

  const tree = parseTagTree(docXml, false);
  const body = findAllDescendants(tree, 'body')[0];
  if (!body) {
    throw new Error('Malformed .docx archive: missing <w:body> element.');
  }

  const blocks: PdfRenderBlock[] = [];
  let pendingList: { ordered: boolean; items: TextRun[][] } | null = null;

  const flushList = () => {
    if (pendingList && pendingList.items.length > 0) {
      blocks.push({
        type: 'list',
        ordered: pendingList.ordered,
        items: pendingList.items,
      });
    }
    pendingList = null;
  };

  for (const child of body.children) {
    if (typeof child === 'string') continue;
    const local = getLocalTagName(child.tag);

    if (local === 'p') {
      const pPr = findDirectChild(child, 'pPr');
      const pStyleNode = pPr ? findDirectChild(pPr, 'pStyle') : undefined;
      const styleVal = pStyleNode ? getAttrIgnoreNs(pStyleNode, 'val') : undefined;
      const headingLevel = parseDocxHeadingLevel(styleVal);

      const numPr = pPr ? findDirectChild(pPr, 'numPr') : undefined;
      const numIdNode = numPr ? findDirectChild(numPr, 'numId') : undefined;
      const numId = numIdNode ? getAttrIgnoreNs(numIdNode, 'val') : undefined;
      const isListParagraph = Boolean(
        numPr || styleVal?.toLowerCase().includes('list')
      );

      const { runs, embeddedImageRelIds } = extractRunsFromParagraph(child);
      const plainText = runs.map((r) => r.text).join('').trim();

      // Emit embedded images found in this paragraph
      for (const relId of embeddedImageRelIds) {
        const target = relMap.get(relId);
        if (!target) continue;
        const normalizedPath = target.startsWith('/')
          ? target.slice(1)
          : target.startsWith('word/')
            ? target
            : `word/${target.replace(/^\.\//, '')}`;
        const fmt = detectImageFormatFromPath(normalizedPath);
        const mediaEntry =
          zip.file(normalizedPath) ??
          Object.values(zip.files).find(
            (f) => f.name.toLowerCase() === normalizedPath.toLowerCase()
          );
        if (!fmt || !mediaEntry) {
          warnings.push(`Skipped unsupported embedded media: ${normalizedPath}`);
          continue;
        }
        const imgBytes = await mediaEntry.async('uint8array');
        const b64 = uint8ToBase64(imgBytes);
        flushList();
        blocks.push({
          type: 'image',
          dataUri: `data:${fmt.mime};base64,${b64}`,
          format: fmt.format,
          alt: normalizedPath.split('/').pop() || 'Embedded image',
        });
      }

      if (!plainText) {
        continue;
      }

      if (headingLevel) {
        flushList();
        blocks.push({
          type: 'heading',
          level: headingLevel,
          runs,
          text: plainText,
        });
      } else if (isListParagraph) {
        const ordered = (numId && numFormatById.get(numId) === 'ordered') || false;
        if (pendingList && pendingList.ordered === ordered) {
          pendingList.items.push(runs);
        } else {
          flushList();
          pendingList = { ordered, items: [runs] };
        }
      } else {
        flushList();
        blocks.push({
          type: 'paragraph',
          runs,
          text: runs.map((r) => r.text).join(''),
        });
      }
      continue;
    }

    if (local === 'tbl') {
      flushList();
      const rowsMatrix: string[][] = [];
      for (const tr of child.children) {
        if (typeof tr === 'string' || getLocalTagName(tr.tag) !== 'tr') continue;
        const rowCells: string[] = [];
        for (const tc of tr.children) {
          if (typeof tc === 'string' || getLocalTagName(tc.tag) !== 'tc') continue;
          const cellParagraphs = findAllDescendants(tc, 'p').map((p) =>
            extractRunsFromParagraph(p)
              .runs.map((r) => r.text)
              .join('')
              .trim()
          );
          const cellText = cellParagraphs.filter((s) => s.length > 0).join('\n');
          rowCells.push(cellText);
        }
        if (rowCells.some((c) => c.length > 0) || rowCells.length > 0) {
          rowsMatrix.push(rowCells);
        }
      }
      if (rowsMatrix.length > 0) {
        const colCount = Math.max(...rowsMatrix.map((r) => r.length));
        const normalizedRows = rowsMatrix.map((r) =>
          Array.from({ length: colCount }, (_, idx) => r[idx] ?? '')
        );
        blocks.push({
          type: 'table',
          headers: normalizedRows[0],
          rows: normalizedRows.slice(1),
        });
      }
    }
  }

  flushList();

  if (blocks.length === 0) {
    throw new Error('The .docx document contains no readable paragraphs, tables, or images.');
  }

  const maxTableColumns = computeMaxTableColumns(blocks);
  return {
    sourceFormat: 'docx',
    title: fileName,
    blocks,
    sheetNames: [],
    recommendedOrientation: maxTableColumns > 6 ? 'landscape' : 'portrait',
    maxTableColumns,
    blockedRemoteUrls: 0,
    warnings,
    counts: countBlocks(blocks),
  };
}

// ============================================================================
// Spreadsheet (.xlsx / .csv) Parsers
// ============================================================================

function trimEmptyMatrixBounds(matrix: string[][]): {
  headers: string[];
  rows: string[][];
} | null {
  const nonEmptyRows = matrix.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );
  if (nonEmptyRows.length === 0) return null;

  let maxCol = 0;
  for (const row of nonEmptyRows) {
    for (let c = row.length - 1; c >= 0; c--) {
      if ((row[c] ?? '').trim().length > 0) {
        maxCol = Math.max(maxCol, c + 1);
        break;
      }
    }
  }
  if (maxCol === 0) return null;

  const trimmed = nonEmptyRows.map((row) =>
    Array.from({ length: maxCol }, (_, idx) => (row[idx] ?? '').trimEnd())
  );

  return {
    headers: trimmed[0],
    rows: trimmed.slice(1),
  };
}

function parseSpreadsheetBytesToRenderModel(
  bytes: Uint8Array,
  fileName: string,
  options: Partial<OfficeToPdfOptions>
): PdfRenderModel {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: 'array' });
  } catch {
    throw new Error('Failed to parse Excel workbook: file may be corrupt or encrypted.');
  }

  const sheetNames = [...(workbook.SheetNames ?? [])];
  if (sheetNames.length === 0) {
    throw new Error('Excel workbook contains zero worksheets.');
  }

  const requestedSheets = options.selectedSheets?.filter((s) => s.trim().length > 0) ?? [];
  const activeSheets =
    requestedSheets.length > 0
      ? sheetNames.filter((name) => requestedSheets.includes(name))
      : sheetNames;

  if (activeSheets.length === 0) {
    throw new Error('None of the selected worksheets exist in this workbook.');
  }

  const blocks: PdfRenderBlock[] = [];
  const warnings: string[] = [];

  for (const sheetName of activeSheets) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
    });
    const strMatrix = rawMatrix.map((row) =>
      Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []
    );
    const bounded = trimEmptyMatrixBounds(strMatrix);
    if (!bounded) {
      warnings.push(`Skipped empty worksheet "${sheetName}".`);
      continue;
    }

    blocks.push({
      type: 'table',
      title: sheetName,
      headers: bounded.headers,
      rows: bounded.rows,
    });
  }

  if (blocks.length === 0) {
    throw new Error('Selected worksheets contain no tabular data.');
  }

  const maxTableColumns = computeMaxTableColumns(blocks);
  return {
    sourceFormat: 'xlsx',
    title: fileName,
    blocks,
    sheetNames,
    recommendedOrientation: maxTableColumns > 6 ? 'landscape' : 'portrait',
    maxTableColumns,
    blockedRemoteUrls: 0,
    warnings,
    counts: countBlocks(blocks),
  };
}

function parseCsvTextToRenderModel(
  content: string,
  fileName: string
): PdfRenderModel {
  const withoutBom = content.replace(/^\uFEFF/, '');
  if (!withoutBom.trim()) {
    throw new Error('CSV input is empty.');
  }

  const parsed = Papa.parse<string[]>(withoutBom, {
    header: false,
    skipEmptyLines: 'greedy',
  });

  const matrix = (parsed.data ?? []).map((row) =>
    Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : []
  );
  const bounded = trimEmptyMatrixBounds(matrix);
  if (!bounded) {
    throw new Error('CSV input contains no non-empty rows.');
  }

  const blocks: PdfRenderBlock[] = [
    {
      type: 'table',
      title: fileName,
      headers: bounded.headers,
      rows: bounded.rows,
    },
  ];

  const maxTableColumns = computeMaxTableColumns(blocks);
  const warnings = parsed.errors?.slice(0, 3).map((e) => e.message) ?? [];
  return {
    sourceFormat: 'csv',
    title: fileName,
    blocks,
    sheetNames: [],
    recommendedOrientation: maxTableColumns > 6 ? 'landscape' : 'portrait',
    maxTableColumns,
    blockedRemoteUrls: 0,
    warnings,
    counts: countBlocks(blocks),
  };
}

// ============================================================================
// Sanitized HTML -> PdfRenderBlock[] AST Parser
// ============================================================================

const CONTAINER_HTML_TAGS = new Set([
  'div',
  'section',
  'article',
  'main',
  'header',
  'footer',
  'aside',
  'nav',
]);

function extractInlineRunsFromHtmlNode(
  node: ParsedXmlNode | string,
  style: { bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean; strike?: boolean } = {}
): TextRun[] {
  if (typeof node === 'string') {
    return node.length > 0 ? [{ text: node, ...style }] : [];
  }

  const tag = node.tag.toLowerCase();
  if (tag === 'br') {
    return [{ text: '\n', ...style }];
  }

  const nextStyle = {
    ...style,
    bold: style.bold || tag === 'strong' || tag === 'b' || tag === 'th',
    italic: style.italic || tag === 'em' || tag === 'i',
    underline: style.underline || tag === 'u',
    code: style.code || tag === 'code',
    strike: style.strike || tag === 's' || tag === 'del',
  };

  const runs: TextRun[] = [];
  for (const child of node.children) {
    runs.push(...extractInlineRunsFromHtmlNode(child, nextStyle));
  }
  return mergeAdjacentRuns(runs);
}

function collectHtmlTableRows(tableNode: ParsedXmlNode): string[][] {
  const trNodes = findAllDescendants(tableNode, 'tr');
  const matrix: string[][] = [];
  for (const tr of trNodes) {
    const cells: string[] = [];
    for (const c of tr.children) {
      if (typeof c === 'string') continue;
      const lt = c.tag.toLowerCase();
      if (lt === 'th' || lt === 'td') {
        cells.push(collectNodePlainText(c).replace(/\s+/g, ' ').trim());
      }
    }
    if (cells.length > 0) {
      matrix.push(cells);
    }
  }
  return matrix;
}

function htmlToRenderBlocks(sanitizedHtml: string): PdfRenderBlock[] {
  const tree = parseTagTree(sanitizedHtml, true);
  const blocks: PdfRenderBlock[] = [];
  let pendingInlineRuns: TextRun[] = [];

  const flushInlineRuns = () => {
    const merged = mergeAdjacentRuns(pendingInlineRuns);
    const joined = merged.map((r) => r.text).join('').trim();
    if (joined.length > 0) {
      blocks.push({
        type: 'paragraph',
        runs: merged,
        text: merged.map((r) => r.text).join('').replace(/\s+/g, ' ').trim(),
      });
    }
    pendingInlineRuns = [];
  };

  const visitChildren = (parent: ParsedXmlNode) => {
    for (const child of parent.children) {
      if (typeof child === 'string') {
        if (child.trim().length > 0 || pendingInlineRuns.length > 0) {
          pendingInlineRuns.push({ text: child });
        }
        continue;
      }

      const tag = child.tag.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        flushInlineRuns();
        const runs = extractInlineRunsFromHtmlNode(child);
        const text = runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
        if (text) {
          blocks.push({
            type: 'heading',
            level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6,
            runs,
            text,
          });
        }
        continue;
      }

      if (tag === 'p') {
        flushInlineRuns();
        // Handle images nested inside <p>
        const nestedImgs = findAllDescendants(child, 'img');
        const runs = extractInlineRunsFromHtmlNode(child);
        const text = runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
        if (text) {
          blocks.push({ type: 'paragraph', runs, text });
        }
        for (const img of nestedImgs) {
          const src = img.attrs['src'] ?? '';
          const match = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.exec(src);
          if (match) {
            const sub = match[1].toUpperCase();
            blocks.push({
              type: 'image',
              dataUri: src,
              format: sub === 'JPG' ? 'JPEG' : (sub as 'PNG' | 'JPEG' | 'WEBP'),
              alt: img.attrs['alt'] || undefined,
            });
          }
        }
        continue;
      }

      if (tag === 'blockquote') {
        flushInlineRuns();
        const runs = extractInlineRunsFromHtmlNode(child);
        const text = runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
        if (text) {
          blocks.push({ type: 'blockquote', runs, text });
        }
        continue;
      }

      if (tag === 'pre') {
        flushInlineRuns();
        const codeText = collectNodePlainText(child).replace(/^\n+|\n+$/g, '');
        const codeChild = findDirectChild(child, 'code');
        const cls = codeChild?.attrs['class'] ?? '';
        const langMatch = /language-([a-z0-9_-]+)/i.exec(cls);
        if (codeText.length > 0) {
          blocks.push({
            type: 'code_block',
            language: langMatch?.[1],
            code: codeText,
          });
        }
        continue;
      }

      if (tag === 'ul' || tag === 'ol') {
        flushInlineRuns();
        const items: TextRun[][] = [];
        for (const li of child.children) {
          if (typeof li !== 'string' && li.tag.toLowerCase() === 'li') {
            const runs = extractInlineRunsFromHtmlNode(li);
            if (runs.map((r) => r.text).join('').trim().length > 0) {
              items.push(runs);
            }
          }
        }
        if (items.length > 0) {
          blocks.push({ type: 'list', ordered: tag === 'ol', items });
        }
        continue;
      }

      if (tag === 'table') {
        flushInlineRuns();
        const matrix = collectHtmlTableRows(child);
        if (matrix.length > 0) {
          const colCount = Math.max(...matrix.map((r) => r.length));
          const normalized = matrix.map((r) =>
            Array.from({ length: colCount }, (_, i) => r[i] ?? '')
          );
          blocks.push({
            type: 'table',
            headers: normalized[0],
            rows: normalized.slice(1),
          });
        }
        continue;
      }

      if (tag === 'img') {
        flushInlineRuns();
        const src = child.attrs['src'] ?? '';
        const match = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.exec(src);
        if (match) {
          const sub = match[1].toUpperCase();
          blocks.push({
            type: 'image',
            dataUri: src,
            format: sub === 'JPG' ? 'JPEG' : (sub as 'PNG' | 'JPEG' | 'WEBP'),
            alt: child.attrs['alt'] || undefined,
          });
        }
        continue;
      }

      if (tag === 'hr') {
        flushInlineRuns();
        blocks.push({ type: 'hr' });
        continue;
      }

      if (CONTAINER_HTML_TAGS.has(tag)) {
        flushInlineRuns();
        visitChildren(child);
        flushInlineRuns();
        continue;
      }

      pendingInlineRuns.push(...extractInlineRunsFromHtmlNode(child));
    }
  };

  visitChildren(tree);
  flushInlineRuns();
  return blocks;
}

function parseMarkupTextToRenderModel(
  content: string,
  fileName: string,
  format: 'html' | 'md'
): PdfRenderModel {
  if (!content || !content.trim()) {
    throw new Error(`${format.toUpperCase()} input is empty.`);
  }

  const rawHtml =
    format === 'md'
      ? (marked.parse(content, { async: false, gfm: true, breaks: false }) as string)
      : content;

  const sanitized = sanitizeHtmlZeroNetwork(rawHtml);
  const blocks = htmlToRenderBlocks(sanitized.html);

  const warnings: string[] = [];
  if (sanitized.blockedRemoteUrls > 0) {
    warnings.push(
      `Blocked ${sanitized.blockedRemoteUrls} external URL reference(s) for zero-network privacy.`
    );
  }
  if (blocks.length === 0) {
    throw new Error('No renderable content remained after zero-network HTML sanitization.');
  }

  const maxTableColumns = computeMaxTableColumns(blocks);
  return {
    sourceFormat: format,
    title: fileName,
    blocks,
    sheetNames: [],
    recommendedOrientation: maxTableColumns > 6 ? 'landscape' : 'portrait',
    maxTableColumns,
    blockedRemoteUrls: sanitized.blockedRemoteUrls,
    warnings,
    counts: countBlocks(blocks),
  };
}

/**
 * Unified input parser normalizing `.docx`, `.xlsx`, `.csv`, `.html`, and `.md`
 * into a pure client-side `PdfRenderModel` AST with zero network calls.
 */
export async function parseInputToRenderModel(
  input: OfficeToPdfInput,
  options: Partial<OfficeToPdfOptions> = {}
): Promise<PdfRenderModel> {
  const mergedOptions: OfficeToPdfOptions = {
    ...DEFAULT_OFFICE_TO_PDF_OPTIONS,
    ...options,
  };

  if (input.kind === 'text') {
    if (!input.content || !input.content.trim()) {
      throw new Error('Input document text is empty.');
    }
    if (input.format === 'csv') {
      return parseCsvTextToRenderModel(input.content, input.fileName);
    }
    return parseMarkupTextToRenderModel(input.content, input.fileName, input.format);
  }

  const format = await detectOfficeFormat(input.bytes, input.fileName, input.hintFormat);
  if (format === 'docx') {
    return parseDocxToRenderModel(input.bytes, input.fileName);
  }
  if (format === 'xlsx') {
    return parseSpreadsheetBytesToRenderModel(input.bytes, input.fileName, mergedOptions);
  }

  const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(input.bytes);
  if (!decodedText.trim()) {
    throw new Error('Input text file is empty.');
  }
  if (format === 'csv') {
    return parseCsvTextToRenderModel(decodedText, input.fileName);
  }
  return parseMarkupTextToRenderModel(decodedText, input.fileName, format);
}

// ============================================================================
// Seam 1B: Vector PDF Pagination, Preview Rendering & E2E Execution
// ============================================================================

interface JsPdfDocLike {
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  setFont(fontName: string, fontStyle?: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g?: number, b?: number): void;
  setFillColor(r: number, g: number, b: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setLineWidth(width: number): void;
  text(
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: 'left' | 'center' | 'right' }
  ): void;
  splitTextToSize(text: string, maxWidth: number): string[];
  getTextWidth(text: string): number;
  rect(x: number, y: number, w: number, h: number, style?: 'S' | 'F' | 'FD'): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
  addPage(): void;
  getNumberOfPages(): number;
  setPage(pageNumber: number): void;
  output(type: 'arraybuffer'): ArrayBuffer;
}

const VALID_PAPER_SIZES = new Set<OfficePaperSize>(['a4', 'letter', 'legal']);
const VALID_ORIENTATIONS = new Set<OfficeOrientation>(['portrait', 'landscape']);

function derivePdfFileName(
  sourceFileName: string,
  requestedOutputName: string
): string {
  const cleanRequested = (requestedOutputName ?? '').trim();
  const isDefaultPlaceholder =
    !cleanRequested ||
    cleanRequested === DEFAULT_OFFICE_TO_PDF_OPTIONS.outputFileName;

  const baseSource = (sourceFileName ?? 'document')
    .trim()
    .replace(/\.(?:docx|xlsx|xls|csv|tsv|html?|markdown|md|bin)$/i, '');

  const rawTarget = isDefaultPlaceholder
    ? `${baseSource || 'converted-document'}.pdf`
    : cleanRequested;

  const sanitized = rawTarget.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
  return /\.pdf$/i.test(sanitized) ? sanitized : `${sanitized}.pdf`;
}

export function normalizeOfficeToPdfOptions(
  options: Partial<OfficeToPdfOptions> = {},
  sourceFileName = 'document'
): OfficeToPdfOptions {
  const merged = { ...DEFAULT_OFFICE_TO_PDF_OPTIONS, ...options };
  const rawMargin = Number(merged.marginMm);
  const clampedMargin = Number.isFinite(rawMargin)
    ? Math.max(5, Math.min(40, rawMargin))
    : DEFAULT_OFFICE_TO_PDF_OPTIONS.marginMm;

  const rawFont = Number(merged.baseFontSizePt);
  const clampedFont = Number.isFinite(rawFont)
    ? Math.max(8, Math.min(18, rawFont))
    : DEFAULT_OFFICE_TO_PDF_OPTIONS.baseFontSizePt;

  const paperSize: OfficePaperSize = VALID_PAPER_SIZES.has(merged.paperSize)
    ? merged.paperSize
    : 'a4';
  const orientation: OfficeOrientation = VALID_ORIENTATIONS.has(merged.orientation)
    ? merged.orientation
    : 'portrait';

  return {
    paperSize,
    orientation,
    marginMm: clampedMargin,
    baseFontSizePt: clampedFont,
    selectedSheets: Array.isArray(merged.selectedSheets)
      ? merged.selectedSheets.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
    showTableGridlines: Boolean(merged.showTableGridlines),
    tableZebraStriping: Boolean(merged.tableZebraStriping),
    repeatTableHeaders: Boolean(merged.repeatTableHeaders),
    includePageNumbers: Boolean(merged.includePageNumbers),
    headerText: String(merged.headerText ?? '').slice(0, 140),
    outputFileName: derivePdfFileName(sourceFileName, merged.outputFileName),
  };
}

function toWinAnsiSafe(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/[^\x09\x0A\x20-\xFF]/g, '?');
}

function renderRunsToEscapedHtml(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let inner = escapeHtmlText(r.text);
      if (r.code) inner = `<code>${inner}</code>`;
      if (r.bold) inner = `<strong>${inner}</strong>`;
      if (r.italic) inner = `<em>${inner}</em>`;
      if (r.underline) inner = `<u>${inner}</u>`;
      if (r.strike) inner = `<del>${inner}</del>`;
      return inner;
    })
    .join('');
}

export function renderBlocksToSanitizedHtml(blocks: PdfRenderBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        parts.push(`<h${b.level}>${renderRunsToEscapedHtml(b.runs)}</h${b.level}>`);
        break;
      case 'paragraph':
        parts.push(`<p>${renderRunsToEscapedHtml(b.runs)}</p>`);
        break;
      case 'blockquote':
        parts.push(`<blockquote>${renderRunsToEscapedHtml(b.runs)}</blockquote>`);
        break;
      case 'code_block':
        parts.push(`<pre><code>${escapeHtmlText(b.code)}</code></pre>`);
        break;
      case 'list': {
        const tag = b.ordered ? 'ol' : 'ul';
        const lis = b.items
          .map((item) => `<li>${renderRunsToEscapedHtml(item)}</li>`)
          .join('');
        parts.push(`<${tag}>${lis}</${tag}>`);
        break;
      }
      case 'table': {
        const caption = b.title
          ? `<p><strong>${escapeHtmlText(b.title)}</strong></p>`
          : '';
        const ths = b.headers.map((h) => `<th>${escapeHtmlText(h)}</th>`).join('');
        const trs = b.rows
          .map(
            (r) =>
              `<tr>${r.map((cell) => `<td>${escapeHtmlText(cell)}</td>`).join('')}</tr>`
          )
          .join('');
        parts.push(
          `${caption}<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
        );
        break;
      }
      case 'image':
        if (SAFE_DATA_IMAGE_PATTERN.test(b.dataUri)) {
          const altAttr = b.alt ? ` alt="${escapeHtmlText(b.alt)}"` : '';
          parts.push(`<img src="${escapeHtmlText(b.dataUri)}"${altAttr}>`);
        }
        break;
      case 'hr':
        parts.push('<hr>');
        break;
    }
  }
  return parts.join('\n');
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function inspectEmbeddedRasterImage(
  dataUri: string,
  expectedFormat: 'PNG' | 'JPEG' | 'WEBP'
): { valid: boolean; widthPx: number; heightPx: number } {
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx < 0) return { valid: false, widthPx: 0, heightPx: 0 };
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64ToBytes(dataUri.slice(commaIdx + 1));
  } catch {
    return { valid: false, widthPx: 0, heightPx: 0 };
  }

  if (expectedFormat === 'PNG') {
    const isPng =
      bytes.length >= 24 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    if (!isPng) return { valid: false, widthPx: 0, heightPx: 0 };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const w = view.getUint32(16, false);
    const h = view.getUint32(20, false);
    return {
      valid: w > 0 && h > 0 && w <= 20000 && h <= 20000,
      widthPx: w || 100,
      heightPx: h || 100,
    };
  }

  if (expectedFormat === 'JPEG') {
    const isJpeg = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!isJpeg) return { valid: false, widthPx: 0, heightPx: 0 };
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb)
      ) {
        const h = (bytes[offset + 5] << 8) | bytes[offset + 6];
        const w = (bytes[offset + 7] << 8) | bytes[offset + 8];
        return {
          valid: true,
          widthPx: w > 0 ? w : 100,
          heightPx: h > 0 ? h : 100,
        };
      }
      if (offset + 3 >= bytes.length) break;
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segLen < 2) break;
      offset += 2 + segLen;
    }
    return { valid: true, widthPx: 160, heightPx: 120 };
  }

  if (expectedFormat === 'WEBP') {
    const isRiff =
      bytes.length >= 16 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;
    return { valid: isRiff, widthPx: 160, heightPx: 120 };
  }

  return { valid: false, widthPx: 0, heightPx: 0 };
}

function computeTableColumnWidthsMm(
  headers: string[],
  rows: string[][],
  totalWidthMm: number
): number[] {
  const colCount = Math.max(1, headers.length);
  const sampleRows = rows.slice(0, 30);
  const weights = new Array<number>(colCount).fill(8);

  for (let c = 0; c < colCount; c++) {
    let maxLen = Math.max(6, (headers[c] ?? '').length);
    for (const r of sampleRows) {
      maxLen = Math.max(maxLen, (r[c] ?? '').length);
    }
    weights[c] = Math.min(42, maxLen);
  }

  const sumWeights = weights.reduce((acc, w) => acc + w, 0) || colCount;
  const rawWidths = weights.map((w) => (w / sumWeights) * totalWidthMm);

  // Guard narrow columns on dense sheets
  const minColW = Math.min(20, (totalWidthMm / colCount) * 0.55);
  let deficit = 0;
  let surplusTotal = 0;
  for (let c = 0; c < colCount; c++) {
    if (rawWidths[c] < minColW) {
      deficit += minColW - rawWidths[c];
      rawWidths[c] = minColW;
    } else {
      surplusTotal += rawWidths[c] - minColW;
    }
  }
  if (deficit > 0 && surplusTotal > 0) {
    for (let c = 0; c < colCount; c++) {
      if (rawWidths[c] > minColW) {
        const share = (rawWidths[c] - minColW) / surplusTotal;
        rawWidths[c] -= deficit * share;
      }
    }
  }

  return rawWidths;
}

function resolveFontStyle(run: TextRun): { family: string; style: string } {
  const family = run.code ? 'courier' : 'helvetica';
  let style = 'normal';
  if (run.bold && run.italic) style = 'bolditalic';
  else if (run.bold) style = 'bold';
  else if (run.italic) style = 'italic';
  return { family, style };
}

interface PositionedLineToken {
  text: string;
  family: string;
  style: string;
  code?: boolean;
  width: number;
}

function layoutStyledRunLines(
  doc: JsPdfDocLike,
  runs: TextRun[],
  fontSizePt: number,
  maxWidthMm: number
): PositionedLineToken[][] {
  doc.setFontSize(fontSizePt);
  const lines: PositionedLineToken[][] = [];
  let currentLine: PositionedLineToken[] = [];
  let currentWidth = 0;

  const pushLine = () => {
    while (
      currentLine.length > 0 &&
      currentLine[currentLine.length - 1].text.trim() === ''
    ) {
      currentLine.pop();
    }
    lines.push(currentLine);
    currentLine = [];
    currentWidth = 0;
  };

  for (const run of runs) {
    const safeText = toWinAnsiSafe(run.text);
    const segments = safeText.split('\n');
    const { family, style } = resolveFontStyle(run);
    doc.setFont(family, style);

    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      if (sIdx > 0) {
        pushLine();
      }
      const seg = segments[sIdx];
      if (!seg) continue;

      const tokens = seg.match(/\s+|\S+/g) ?? [];
      for (const tok of tokens) {
        const isSpace = /^\s+$/.test(tok);
        if (isSpace && currentLine.length === 0) {
          continue;
        }
        const tokW = doc.getTextWidth(tok);
        if (!isSpace && tokW > maxWidthMm && currentLine.length === 0) {
          // Split oversized unbreakable string across lines
          const chunks = doc.splitTextToSize(tok, maxWidthMm);
          for (let ci = 0; ci < chunks.length; ci++) {
            const cText = chunks[ci] ?? '';
            if (ci > 0) pushLine();
            currentLine.push({
              text: cText,
              family,
              style,
              code: run.code,
              width: doc.getTextWidth(cText),
            });
            currentWidth = doc.getTextWidth(cText);
          }
          continue;
        }

        if (currentWidth + tokW > maxWidthMm && currentLine.length > 0) {
          pushLine();
          if (isSpace) continue;
        }

        currentLine.push({
          text: tok,
          family,
          style,
          code: run.code,
          width: tokW,
        });
        currentWidth += tokW;
      }
    }
  }

  if (currentLine.length > 0 || lines.length === 0) {
    pushLine();
  }
  return lines;
}

export function renderModelToPdf(
  model: PdfRenderModel,
  rawOptions: Partial<OfficeToPdfOptions> = {},
  onProgress?: (percent: number, stage: string) => void
): {
  pdfBytes: Uint8Array;
  pageCount: number;
  previewPages: PaginatedPreviewPage[];
  warnings: string[];
  normalizedOptions: OfficeToPdfOptions;
} {
  const opts = normalizeOfficeToPdfOptions(rawOptions, model.title);
  const warnings = [...model.warnings];

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.paperSize,
  }) as unknown as JsPdfDocLike;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const hasHeader = opts.headerText.trim().length > 0;

  const contentLeft = opts.marginMm;
  const contentWidth = Math.max(40, pageWidth - opts.marginMm * 2);
  const contentTop = opts.marginMm + (hasHeader ? 4 : 0);
  const contentBottom = pageHeight - opts.marginMm - (opts.includePageNumbers ? 6 : 0);
  const printableHeight = Math.max(40, contentBottom - contentTop);

  let cursorY = contentTop;
  const pageBuckets: PdfRenderBlock[][] = [[]];

  const startNewPage = () => {
    doc.addPage();
    pageBuckets.push([]);
    cursorY = contentTop;
  };

  const ensureSpace = (neededMm: number, avoidBottomZone = false) => {
    const threshold = avoidBottomZone
      ? Math.min(contentBottom, contentBottom - printableHeight * 0.15)
      : contentBottom;
    if (cursorY + neededMm > threshold && cursorY > contentTop + 0.5) {
      startNewPage();
    }
  };

  const pushPreviewBlock = (block: PdfRenderBlock) => {
    pageBuckets[pageBuckets.length - 1].push(block);
  };

  const ptToMmLine = (pt: number, factor = 0.45): number => Math.max(3.6, pt * factor);

  const drawRunLines = (
    runs: TextRun[],
    fontSizePt: number,
    indentMm: number,
    rgb: [number, number, number],
    prefixText?: string
  ) => {
    const availW = Math.max(25, contentWidth - indentMm);
    const wrappedLines = layoutStyledRunLines(doc, runs, fontSizePt, availW);
    const lineH = ptToMmLine(fontSizePt, 0.44);

    for (let li = 0; li < wrappedLines.length; li++) {
      ensureSpace(lineH);
      const tokens = wrappedLines[li];
      let x = contentLeft + indentMm;

      if (li === 0 && prefixText) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSizePt);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(toWinAnsiSafe(prefixText), contentLeft + Math.max(0, indentMm - 5.5), cursorY);
      }

      for (const tok of tokens) {
        doc.setFont(tok.family, tok.style);
        doc.setFontSize(fontSizePt);
        if (tok.code) {
          doc.setTextColor(30, 41, 59);
        } else {
          doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        }
        doc.text(tok.text, x, cursorY);
        x += tok.width;
      }
      cursorY += lineH;
    }
  };

  const headingScale: Record<number, number> = {
    1: 1.72,
    2: 1.38,
    3: 1.18,
    4: 1.08,
    5: 1.02,
    6: 0.98,
  };

  onProgress?.(55, 'Paginating headings, paragraphs, code blocks, and tables');

  for (let idx = 0; idx < model.blocks.length; idx++) {
    const block = model.blocks[idx];

    if (block.type === 'heading') {
      const hSize = Math.round(opts.baseFontSizePt * (headingScale[block.level] ?? 1.2) * 10) / 10;
      const lineH = ptToMmLine(hSize, 0.45);
      // Orphan guard for H1/H2
      ensureSpace(lineH * 2, block.level <= 2);
      if (cursorY > contentTop + 0.5) cursorY += 2.2;
      const boldRuns = block.runs.map((r) => ({ ...r, bold: true }));
      drawRunLines(boldRuns, hSize, 0, [15, 23, 42]);
      cursorY += 1.8;
      pushPreviewBlock(block);
      continue;
    }

    if (block.type === 'paragraph') {
      drawRunLines(block.runs, opts.baseFontSizePt, 0, [30, 41, 59]);
      cursorY += 2.4;
      pushPreviewBlock(block);
      continue;
    }

    if (block.type === 'blockquote') {
      ensureSpace(ptToMmLine(opts.baseFontSizePt) * 2);
      const startY = cursorY;
      const startPageCount = doc.getNumberOfPages();
      drawRunLines(
        block.runs.map((r) => ({ ...r, italic: true })),
        opts.baseFontSizePt,
        5,
        [71, 85, 105]
      );
      if (doc.getNumberOfPages() === startPageCount) {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.7);
        doc.line(contentLeft + 1.5, startY - 3, contentLeft + 1.5, cursorY - 1.5);
      }
      cursorY += 2.4;
      pushPreviewBlock(block);
      continue;
    }

    if (block.type === 'list') {
      for (let itemIdx = 0; itemIdx < block.items.length; itemIdx++) {
        const prefix = block.ordered ? `${itemIdx + 1}.` : '-';
        drawRunLines(block.items[itemIdx], opts.baseFontSizePt, 7.5, [30, 41, 59], prefix);
        cursorY += 1.0;
      }
      cursorY += 1.8;
      pushPreviewBlock(block);
      continue;
    }

    if (block.type === 'code_block') {
      const codeFont = Math.max(8, opts.baseFontSizePt - 1.8);
      const codeLineH = ptToMmLine(codeFont, 0.44);
      doc.setFont('courier', 'normal');
      doc.setFontSize(codeFont);
      const rawLines = toWinAnsiSafe(block.code).split('\n');
      const wrappedCodeLines: string[] = [];
      for (const rl of rawLines) {
        const pieces = doc.splitTextToSize(rl || ' ', contentWidth - 8);
        wrappedCodeLines.push(...(pieces.length > 0 ? pieces : [' ']));
      }

      let chunkStart = 0;
      while (chunkStart < wrappedCodeLines.length) {
        ensureSpace(codeLineH * 2 + 4);
        const remainingMm = Math.max(codeLineH * 2 + 4, contentBottom - cursorY - 2);
        const maxLinesFit = Math.max(1, Math.floor((remainingMm - 4) / codeLineH));
        const chunk = wrappedCodeLines.slice(chunkStart, chunkStart + maxLinesFit);
        const boxH = chunk.length * codeLineH + 4;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.25);
        doc.rect(contentLeft, cursorY - 2.5, contentWidth, boxH, 'FD');

        doc.setFont('courier', 'normal');
        doc.setFontSize(codeFont);
        doc.setTextColor(15, 23, 42);
        let textY = cursorY + 1.2;
        for (const cl of chunk) {
          doc.text(cl, contentLeft + 3, textY);
          textY += codeLineH;
        }
        pushPreviewBlock({
          type: 'code_block',
          language: block.language,
          code: chunk.join('\n'),
        });
        cursorY += boxH + 1.5;
        chunkStart += chunk.length;
      }
      cursorY += 1.5;
      continue;
    }

    if (block.type === 'hr') {
      ensureSpace(5);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(contentLeft, cursorY, contentLeft + contentWidth, cursorY);
      cursorY += 4.5;
      pushPreviewBlock(block);
      continue;
    }

    if (block.type === 'image') {
      const info = inspectEmbeddedRasterImage(block.dataUri, block.format);
      if (!info.valid || block.format === 'WEBP') {
        warnings.push(
          `Skipped invalid or unsupported embedded ${block.format} image (${block.alt ?? 'unnamed'}).`
        );
        continue;
      }
      const maxImgW = Math.min(contentWidth, 125);
      const maxImgH = Math.min(printableHeight * 0.65, 95);
      const ratio = info.widthPx / Math.max(1, info.heightPx);
      let drawW = maxImgW;
      let drawH = drawW / Math.max(0.1, ratio);
      if (drawH > maxImgH) {
        drawH = maxImgH;
        drawW = drawH * ratio;
      }
      drawW = Math.max(6, Math.min(contentWidth, drawW));
      drawH = Math.max(6, Math.min(maxImgH, drawH));

      ensureSpace(drawH + 4);
      try {
        doc.addImage(block.dataUri, block.format, contentLeft, cursorY, drawW, drawH);
        cursorY += drawH + 4;
        pushPreviewBlock(block);
      } catch {
        warnings.push(
          `Unable to embed ${block.format} image (${block.alt ?? 'image'}) into PDF.`
        );
      }
      continue;
    }

    if (block.type === 'table') {
      const colCount = Math.max(1, block.headers.length);
      const tableFont =
        colCount > 6
          ? Math.max(7.5, opts.baseFontSizePt - 2.5)
          : Math.max(8, opts.baseFontSizePt - 1.5);
      const cellLineH = ptToMmLine(tableFont, 0.44);
      const cellPadX = 1.6;
      const cellPadY = 1.5;
      const colWidths = computeTableColumnWidthsMm(
        block.headers,
        block.rows,
        contentWidth
      );

      if (block.title) {
        ensureSpace(cellLineH * 4, true);
        if (cursorY > contentTop + 0.5) cursorY += 1.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.min(opts.baseFontSizePt + 1, 13));
        doc.setTextColor(15, 23, 42);
        doc.text(toWinAnsiSafe(block.title), contentLeft, cursorY);
        cursorY += 4.5;
      }

      const measureRow = (
        cells: string[],
        isHeader: boolean
      ): { wrapped: string[][]; heightMm: number } => {
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(tableFont);
        const wrapped: string[][] = [];
        let maxLines = 1;
        for (let c = 0; c < colCount; c++) {
          const text = toWinAnsiSafe(cells[c] ?? '');
          const cellW = Math.max(6, colWidths[c] - cellPadX * 2);
          const lines = text ? doc.splitTextToSize(text, cellW) : [''];
          const normalizedLines = lines.length > 0 ? lines : [''];
          wrapped.push(normalizedLines);
          maxLines = Math.max(maxLines, normalizedLines.length);
        }
        return {
          wrapped,
          heightMm: maxLines * cellLineH + cellPadY * 2,
        };
      };

      const drawMeasuredRow = (
        measured: { wrapped: string[][]; heightMm: number },
        isHeader: boolean,
        zebra: boolean
      ) => {
        if (isHeader) {
          doc.setFillColor(30, 41, 59);
          doc.rect(contentLeft, cursorY, contentWidth, measured.heightMm, 'F');
        } else if (zebra) {
          doc.setFillColor(248, 250, 252);
          doc.rect(contentLeft, cursorY, contentWidth, measured.heightMm, 'F');
        }

        if (opts.showTableGridlines) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.2);
          let gx = contentLeft;
          doc.rect(contentLeft, cursorY, contentWidth, measured.heightMm, 'S');
          for (let c = 0; c < colCount - 1; c++) {
            gx += colWidths[c];
            doc.line(gx, cursorY, gx, cursorY + measured.heightMm);
          }
        }

        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(tableFont);
        if (isHeader) {
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setTextColor(30, 41, 59);
        }

        let cx = contentLeft;
        for (let c = 0; c < colCount; c++) {
          const cellLines = measured.wrapped[c];
          let ly = cursorY + cellPadY + cellLineH * 0.78;
          for (const line of cellLines) {
            if (line) {
              doc.text(line, cx + cellPadX, ly);
            }
            ly += cellLineH;
          }
          cx += colWidths[c];
        }

        cursorY += measured.heightMm;
      };

      const headerMeasured = measureRow(block.headers, true);
      const minFirstBodyH =
        block.rows.length > 0 ? cellLineH + cellPadY * 2 : 0;
      ensureSpace(headerMeasured.heightMm + minFirstBodyH);
      drawMeasuredRow(headerMeasured, true, false);

      let pageSliceRows: string[][] = [];
      let isFirstSlice = true;

      for (let rIdx = 0; rIdx < block.rows.length; rIdx++) {
        const row = block.rows[rIdx];
        const rowMeasured = measureRow(row, false);
        if (cursorY + rowMeasured.heightMm > contentBottom && cursorY > contentTop + 1) {
          pushPreviewBlock({
            type: 'table',
            title: isFirstSlice ? block.title : undefined,
            headers: block.headers,
            rows: pageSliceRows,
          });
          isFirstSlice = false;
          pageSliceRows = [];
          startNewPage();
          if (opts.repeatTableHeaders) {
            drawMeasuredRow(headerMeasured, true, false);
          }
        }

        const useZebra = opts.tableZebraStriping && rIdx % 2 === 1;
        drawMeasuredRow(rowMeasured, false, useZebra);
        pageSliceRows.push(row);
      }

      if (pageSliceRows.length > 0 || isFirstSlice) {
        pushPreviewBlock({
          type: 'table',
          title: isFirstSlice ? block.title : undefined,
          headers: block.headers,
          rows: pageSliceRows,
        });
      }
      cursorY += 4;
    }
  }

  onProgress?.(88, 'Stamping headers, page numbers, and finalizing PDF');

  const totalPages = doc.getNumberOfPages();
  const safeHeader = toWinAnsiSafe(opts.headerText.trim());
  const previewPages: PaginatedPreviewPage[] = [];

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    if (safeHeader) {
      doc.text(safeHeader, contentLeft, Math.max(7, opts.marginMm - 3));
    }

    const footerLabel = opts.includePageNumbers ? `Page ${p} of ${totalPages}` : '';
    if (footerLabel) {
      doc.text(
        footerLabel,
        pageWidth - opts.marginMm,
        pageHeight - Math.max(6, opts.marginMm - 4),
        { align: 'right' }
      );
    }

    previewPages.push({
      pageNumber: p,
      totalPages,
      headerText: opts.headerText.trim(),
      footerText: footerLabel,
      blocks: pageBuckets[p - 1] ?? [],
    });
  }

  const outArrayBuffer = doc.output('arraybuffer');
  const pdfBytes = new Uint8Array(outArrayBuffer);
  onProgress?.(100, 'Complete');

  return {
    pdfBytes,
    pageCount: totalPages,
    previewPages,
    warnings,
    normalizedOptions: opts,
  };
}

export async function inspectOfficeInput(
  input: OfficeToPdfInput,
  options: Partial<OfficeToPdfOptions> = {}
): Promise<OfficeToPdfInspectResult> {
  try {
    const model = await parseInputToRenderModel(input, options);
    const previewHtml = renderBlocksToSanitizedHtml(model.blocks);
    const rendered = renderModelToPdf(model, options);

    const diagnostics: OfficeToPdfDiagnostics = {
      sourceFormat: model.sourceFormat,
      pageCount: rendered.pageCount,
      tableCount: model.counts.tables,
      paragraphCount: model.counts.paragraphs,
      imageCount: model.counts.images,
      blockedRemoteUrls: model.blockedRemoteUrls,
      recommendedOrientation: model.recommendedOrientation,
      sheetNames: model.sheetNames,
      maxTableColumns: model.maxTableColumns,
      warnings: rendered.warnings,
    };

    return {
      success: true,
      model,
      previewHtml,
      previewPages: rendered.previewPages,
      diagnostics,
    };
  } catch (err: unknown) {
    return {
      success: false,
      previewHtml: '',
      previewPages: [],
      diagnostics: {
        sourceFormat: 'html',
        pageCount: 0,
        tableCount: 0,
        paragraphCount: 0,
        imageCount: 0,
        blockedRemoteUrls: 0,
        recommendedOrientation: 'portrait',
        sheetNames: [],
        maxTableColumns: 0,
        warnings: [],
      },
      error: err instanceof Error ? err.message : 'Unable to inspect input document.',
    };
  }
}

export async function convertOfficeToPdf(
  input: OfficeToPdfInput,
  options: Partial<OfficeToPdfOptions> = {},
  onProgress?: (percent: number, stage: string) => void
): Promise<OfficeToPdfResult> {
  const fallbackName = normalizeOfficeToPdfOptions(options, input.fileName).outputFileName;
  try {
    onProgress?.(12, 'Parsing document locally');
    const model = await parseInputToRenderModel(input, options);
    onProgress?.(35, 'Building sanitized document preview');
    const previewHtml = renderBlocksToSanitizedHtml(model.blocks);
    const rendered = renderModelToPdf(model, options, onProgress);

    const blob = new Blob([rendered.pdfBytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });

    const diagnostics: OfficeToPdfDiagnostics = {
      sourceFormat: model.sourceFormat,
      pageCount: rendered.pageCount,
      tableCount: model.counts.tables,
      paragraphCount: model.counts.paragraphs,
      imageCount: model.counts.images,
      blockedRemoteUrls: model.blockedRemoteUrls,
      recommendedOrientation: model.recommendedOrientation,
      sheetNames: model.sheetNames,
      maxTableColumns: model.maxTableColumns,
      warnings: rendered.warnings,
    };

    return {
      success: true,
      blob,
      pdfBytes: rendered.pdfBytes,
      fileName: rendered.normalizedOptions.outputFileName,
      fileSize: rendered.pdfBytes.byteLength,
      previewHtml,
      previewPages: rendered.previewPages,
      diagnostics,
    };
  } catch (err: unknown) {
    return {
      success: false,
      fileName: fallbackName,
      fileSize: 0,
      previewHtml: '',
      previewPages: [],
      diagnostics: {
        sourceFormat: 'html',
        pageCount: 0,
        tableCount: 0,
        paragraphCount: 0,
        imageCount: 0,
        blockedRemoteUrls: 0,
        recommendedOrientation: 'portrait',
        sheetNames: [],
        maxTableColumns: 0,
        warnings: [],
      },
      error:
        err instanceof Error ? err.message : 'Client-side PDF conversion failed.',
    };
  }
}
