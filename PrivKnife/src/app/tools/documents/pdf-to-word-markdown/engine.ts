import DOMPurify from 'dompurify';
import JSZip from 'jszip';
import {
  DocumentBlock,
  ExtractedStyledDocument,
  InlineTextRun,
  PdfStyledSpan,
  PdfToWordDeps,
  PdfToWordMarkdownOptions,
  PdfToWordMarkdownResult,
} from './types';

export function escapeXmlText(raw: string): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface GroupedLine {
  y: number;
  xStart: number;
  xEnd: number;
  maxFontSize: number;
  avgFontSize: number;
  allBold: boolean;
  spans: PdfStyledSpan[];
  text: string;
}

function groupSpansIntoLines(spans: PdfStyledSpan[]): GroupedLine[] {
  if (!spans || spans.length === 0) return [];
  const sorted = [...spans].sort((a, b) => b.y - a.y);
  const rawLines: Array<{ y: number; items: PdfStyledSpan[] }> = [];

  for (const s of sorted) {
    const tol = Math.max(3, (s.fontSize || 11) * 0.45);
    const hit = rawLines.find((l) => Math.abs(l.y - s.y) <= tol);
    if (hit) {
      hit.items.push(s);
    } else {
      rawLines.push({ y: s.y, items: [s] });
    }
  }

  return rawLines
    .map((line) => {
      line.items.sort((a, b) => a.x - b.x);
      let xStart = Infinity;
      let xEnd = -Infinity;
      let maxFont = 0;
      let totalChars = 0;
      let weightedFont = 0;
      let allBold = true;
      let text = '';

      for (let i = 0; i < line.items.length; i++) {
        const sp = line.items[i];
        if (sp.x < xStart) xStart = sp.x;
        const end = sp.x + Math.max(1, sp.width);
        if (end > xEnd) xEnd = end;
        if (sp.fontSize > maxFont) maxFont = sp.fontSize;
        const len = Math.max(1, sp.text.length);
        totalChars += len;
        weightedFont += sp.fontSize * len;
        if (!sp.bold) allBold = false;

        if (i === 0) {
          text = sp.text;
        } else {
          const prev = line.items[i - 1];
          const gap = sp.x - (prev.x + Math.max(0, prev.width));
          const spaceNeed =
            gap > Math.max(1.5, sp.fontSize * 0.18) &&
            !text.endsWith(' ') &&
            !sp.text.startsWith(' ');
          text += spaceNeed ? ` ${sp.text}` : sp.text;
        }
      }

      return {
        y: line.y,
        xStart,
        xEnd,
        maxFontSize: maxFont || 11,
        avgFontSize: totalChars > 0 ? weightedFont / totalChars : 11,
        allBold,
        spans: line.items,
        text: text.trim(),
      };
    })
    .filter((l) => l.text.length > 0);
}

function mergeLineRuns(
  spans: PdfStyledSpan[],
  preserveInlineStyles: boolean,
  stripPrefixLength = 0
): InlineTextRun[] {
  const sorted = [...spans].sort((a, b) => a.x - b.x);
  const runs: InlineTextRun[] = [];
  let skipChars = stripPrefixLength;

  for (let i = 0; i < sorted.length; i++) {
    const sp = sorted[i];
    let txt = sp.text;
    if (skipChars > 0) {
      if (txt.length <= skipChars) {
        skipChars -= txt.length;
        continue;
      }
      txt = txt.slice(skipChars);
      skipChars = 0;
    }

    if (i > 0 && runs.length > 0) {
      const prev = sorted[i - 1];
      const prevRun = runs[runs.length - 1];
      const gap = sp.x - (prev.x + Math.max(0, prev.width));
      if (
        gap > Math.max(1.5, sp.fontSize * 0.18) &&
        !prevRun.text.endsWith(' ') &&
        !txt.startsWith(' ')
      ) {
        txt = ` ${txt}`;
      }
    }

    const bold = preserveInlineStyles ? Boolean(sp.bold) : false;
    const italic = preserveInlineStyles ? Boolean(sp.italic) : false;
    const prevRun = runs[runs.length - 1];
    if (prevRun && prevRun.bold === bold && prevRun.italic === italic) {
      prevRun.text += txt;
    } else {
      runs.push({ text: txt, bold, italic });
    }
  }

  return runs.filter((r) => r.text.length > 0);
}

function appendRunsToParagraph(
  target: InlineTextRun[],
  incoming: InlineTextRun[],
  dehyphenate: boolean
): void {
  if (incoming.length === 0) return;
  const last = target[target.length - 1];
  const first = incoming[0];

  if (last) {
    const trimmedLast = last.text.trimEnd();
    const trimmedFirst = first.text.trimStart();
    if (
      dehyphenate &&
      /[a-zA-Z]-$/.test(trimmedLast) &&
      /^[a-zA-Z]/.test(trimmedFirst)
    ) {
      last.text = trimmedLast.slice(0, -1);
      first.text = trimmedFirst;
    } else if (!last.text.endsWith(' ') && !first.text.startsWith(' ')) {
      last.text += ' ';
    }
  }

  for (const r of incoming) {
    const prev = target[target.length - 1];
    if (prev && prev.bold === r.bold && prev.italic === r.italic) {
      prev.text += r.text;
    } else {
      target.push({ ...r });
    }
  }
}

export function reconstructDocumentAst(
  spans: PdfStyledSpan[],
  pageSizes: Array<{ width: number; height: number }>,
  options: PdfToWordMarkdownOptions
): DocumentBlock[] {
  if (!spans || spans.length === 0) return [];

  // 1. Character-weighted body font size baseline
  const freq = new Map<number, number>();
  for (const s of spans) {
    const trimmedLen = s.text.trim().length;
    if (trimmedLen === 0) continue;
    const bucket = Math.round(s.fontSize * 2) / 2;
    freq.set(bucket, (freq.get(bucket) ?? 0) + trimmedLen);
  }
  let bodyFontSize = 11;
  let bestWeight = -1;
  for (const [sz, w] of freq.entries()) {
    if (w > bestWeight) {
      bestWeight = w;
      bodyFontSize = sz;
    }
  }

  // Group spans by page
  const byPage = new Map<number, PdfStyledSpan[]>();
  for (const s of spans) {
    const list = byPage.get(s.pageIndex) ?? [];
    list.push(s);
    byPage.set(s.pageIndex, list);
  }
  const pageIndices = Array.from(byPage.keys()).sort((a, b) => a - b);

  // Build grouped lines per page (with optional 2-column span splitting BEFORE line grouping)
  const linesByPage = new Map<number, GroupedLine[]>();
  for (const pIdx of pageIndices) {
    const pSpans = byPage.get(pIdx) ?? [];
    const pageWidth = pageSizes[pIdx]?.width ?? 595;

    if (options.detectMultiColumn && pSpans.length >= 4) {
      const midLeft = pageWidth * 0.48;
      const midRight = pageWidth * 0.52;
      const leftSpans: PdfStyledSpan[] = [];
      const rightSpans: PdfStyledSpan[] = [];
      const wideSpans: PdfStyledSpan[] = [];

      for (const sp of pSpans) {
        const end = sp.x + Math.max(1, sp.width);
        if (end <= midLeft) leftSpans.push(sp);
        else if (sp.x >= midRight) rightSpans.push(sp);
        else wideSpans.push(sp);
      }

      if (
        leftSpans.length >= 2 &&
        rightSpans.length >= 2 &&
        leftSpans.length + rightSpans.length >= Math.ceil(pSpans.length * 0.65)
      ) {
        linesByPage.set(pIdx, [
          ...groupSpansIntoLines(wideSpans),
          ...groupSpansIntoLines(leftSpans),
          ...groupSpansIntoLines(rightSpans),
        ]);
        continue;
      }
    }

    linesByPage.set(pIdx, groupSpansIntoLines(pSpans));
  }

  // 2. Strip repeated running headers/footers on >= 3-page docs
  const noiseSignatures = new Set<string>();
  if (options.stripHeadersFooters && pageIndices.length >= 3) {
    const sigPages = new Map<string, Set<number>>();
    for (const pIdx of pageIndices) {
      const pHeight = pageSizes[pIdx]?.height ?? 842;
      const lines = linesByPage.get(pIdx) ?? [];
      for (const l of lines) {
        if (l.y >= pHeight * 0.88 || l.y <= pHeight * 0.12) {
          const sig = l.text.replace(/\d+/g, '#').toLowerCase().trim();
          const set = sigPages.get(sig) ?? new Set<number>();
          set.add(pIdx);
          sigPages.set(sig, set);
        }
      }
    }
    const minRepeat = Math.ceil(pageIndices.length * 0.6);
    for (const [sig, pagesSet] of sigPages.entries()) {
      if (pagesSet.size >= minRepeat) {
        noiseSignatures.add(sig);
      }
    }
  }

  const blocks: DocumentBlock[] = [];
  const LIST_RE = /^([•●▪◦\-*]|\d+[.)]|[a-zA-Z][.)])\s+/;

  for (let pOrder = 0; pOrder < pageIndices.length; pOrder++) {
    const pIdx = pageIndices[pOrder];
    if (options.includePageBreaks && pOrder > 0) {
      blocks.push({ type: 'page_break', pageIndex: pIdx });
    }

    const pageHeight = pageSizes[pIdx]?.height ?? 842;

    let orderedLines = linesByPage.get(pIdx) ?? [];
    if (noiseSignatures.size > 0) {
      orderedLines = orderedLines.filter((l) => {
        if (l.y < pageHeight * 0.88 && l.y > pageHeight * 0.12) return true;
        const sig = l.text.replace(/\d+/g, '#').toLowerCase().trim();
        return !noiseSignatures.has(sig);
      });
    }

    const maxBodyLineW = orderedLines.reduce(
      (acc, l) => Math.max(acc, l.xEnd - l.xStart),
      100
    );

    let activePara: {
      blockIndex: number;
      lastY: number;
      lastFontSize: number;
      lastLineWidth: number;
      lastEndsSentence: boolean;
      lastEndsHyphen: boolean;
    } | null = null;

    for (const line of orderedLines) {
      const fSize = line.maxFontSize;
      const headingLevel: 1 | 2 | 3 | null =
        fSize >= bodyFontSize * 1.55
          ? 1
          : fSize >= bodyFontSize * 1.25
            ? 2
            : fSize >= bodyFontSize * 1.1 || (line.allBold && line.text.length < 70 && !LIST_RE.test(line.text) && fSize >= bodyFontSize)
              ? 3
              : null;

      if (headingLevel !== null) {
        activePara = null;
        blocks.push({
          type: 'heading',
          level: headingLevel,
          runs: mergeLineRuns(line.spans, options.preserveInlineStyles),
          pageIndex: pIdx,
        });
        continue;
      }

      const listMatch = line.text.match(LIST_RE);
      if (listMatch) {
        activePara = null;
        const marker = listMatch[1];
        const ordered = /^(\d+|[a-zA-Z])[.)]$/.test(marker);
        blocks.push({
          type: 'list_item',
          ordered,
          marker,
          runs: mergeLineRuns(
            line.spans,
            options.preserveInlineStyles,
            listMatch[0].length
          ),
          pageIndex: pIdx,
        });
        continue;
      }

      const lineRuns = mergeLineRuns(line.spans, options.preserveInlineStyles);
      const lineW = line.xEnd - line.xStart;
      const yGap = activePara ? activePara.lastY - line.y : Infinity;
      const canMerge =
        activePara !== null &&
        yGap >= 0 &&
        yGap <= activePara.lastFontSize * 1.7 &&
        (activePara.lastEndsHyphen ||
          !(
            activePara.lastEndsSentence &&
            activePara.lastLineWidth < maxBodyLineW * 0.65
          ));

      if (canMerge && activePara) {
        const paraBlock = blocks[activePara.blockIndex];
        if (paraBlock?.type === 'paragraph') {
          appendRunsToParagraph(
            paraBlock.runs,
            lineRuns,
            options.dehyphenateWords
          );
          activePara.lastY = line.y;
          activePara.lastFontSize = line.avgFontSize;
          activePara.lastLineWidth = lineW;
          activePara.lastEndsSentence = /[.!?]$/.test(line.text);
          activePara.lastEndsHyphen = /[a-zA-Z]-$/.test(line.text);
          continue;
        }
      }

      const idx = blocks.length;
      blocks.push({
        type: 'paragraph',
        runs: lineRuns,
        pageIndex: pIdx,
      });
      activePara = {
        blockIndex: idx,
        lastY: line.y,
        lastFontSize: line.avgFontSize,
        lastLineWidth: lineW,
        lastEndsSentence: /[.!?]$/.test(line.text),
        lastEndsHyphen: /[a-zA-Z]-$/.test(line.text),
      };
    }
  }

  return blocks;
}

function serializeRunsToMarkdown(
  runs: InlineTextRun[],
  preserveInlineStyles: boolean
): string {
  return runs
    .map((r) => {
      if (!preserveInlineStyles) return r.text;
      const leading = r.text.match(/^\s*/)?.[0] ?? '';
      const trailing = r.text.match(/\s*$/)?.[0] ?? '';
      const core = r.text.trim();
      if (!core) return r.text;
      if (r.bold && r.italic) return `${leading}***${core}***${trailing}`;
      if (r.bold) return `${leading}**${core}**${trailing}`;
      if (r.italic) return `${leading}*${core}*${trailing}`;
      return r.text;
    })
    .join('');
}

export function buildMarkdown(
  blocks: DocumentBlock[],
  preserveInlineStyles = true
): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'heading') {
      const hashes = '#'.repeat(b.level);
      const headingText = b.runs.map((r) => r.text).join('').trim();
      parts.push(`${hashes} ${headingText}`);
    } else if (b.type === 'paragraph') {
      parts.push(serializeRunsToMarkdown(b.runs, preserveInlineStyles).trim());
    } else if (b.type === 'list_item') {
      const prefix = b.ordered ? `${b.marker} ` : '- ';
      parts.push(`${prefix}${serializeRunsToMarkdown(b.runs, preserveInlineStyles).trim()}`);
    } else if (b.type === 'page_break') {
      parts.push('---');
    }
  }
  return parts.join('\n\n');
}

export function buildPlainText(blocks: DocumentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'page_break') return '---';
      return b.runs.map((r) => r.text).join('').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

export function buildSanitizedHtmlPreview(blocks: DocumentBlock[]): string {
  const serializeRunsHtml = (runs: InlineTextRun[]): string =>
    runs
      .map((r) => {
        let content = escapeHtml(r.text);
        if (r.italic) content = `<em>${content}</em>`;
        if (r.bold) content = `<strong>${content}</strong>`;
        return content;
      })
      .join('');

  const rawHtml = blocks
    .map((b) => {
      if (b.type === 'heading') {
        return `<h${b.level}>${serializeRunsHtml(b.runs)}</h${b.level}>`;
      }
      if (b.type === 'paragraph') {
        return `<p>${serializeRunsHtml(b.runs)}</p>`;
      }
      if (b.type === 'list_item') {
        const prefix = b.ordered ? `${escapeHtml(b.marker)} ` : '• ';
        return `<p class="list-item">${prefix}${serializeRunsHtml(b.runs)}</p>`;
      }
      return '<hr />';
    })
    .join('\n');

  if (
    typeof window !== 'undefined' &&
    DOMPurify &&
    typeof (DOMPurify as unknown as { sanitize?: (s: string) => string }).sanitize === 'function'
  ) {
    return (DOMPurify as unknown as { sanitize: (s: string) => string }).sanitize(rawHtml);
  }
  return rawHtml;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="25"/><w:szCs w:val="25"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
  </w:style>
</w:styles>`;

const NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>`;

function serializeRunsXml(runs: InlineTextRun[]): string {
  return runs
    .map((r) => {
      const safe = escapeXmlText(r.text);
      const rPr =
        r.bold || r.italic
          ? `<w:rPr>${r.bold ? '<w:b/>' : ''}${r.italic ? '<w:i/>' : ''}</w:rPr>`
          : '';
      return `<w:r>${rPr}<w:t xml:space="preserve">${safe}</w:t></w:r>`;
    })
    .join('');
}

export async function buildDocxPackage(blocks: DocumentBlock[]): Promise<{
  bytes: Uint8Array;
  blob: Blob;
}> {
  const bodyParagraphs = blocks
    .map((b) => {
      if (b.type === 'page_break') {
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      }
      if (b.type === 'heading') {
        const styleId = `Heading${b.level}`;
        return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>${serializeRunsXml(b.runs)}</w:p>`;
      }
      if (b.type === 'list_item') {
        const numId = b.ordered ? '2' : '1';
        return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${serializeRunsXml(b.runs)}</w:p>`;
      }
      return `<w:p>${serializeRunsXml(b.runs)}</w:p>`;
    })
    .join('\n    ');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParagraphs}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', ROOT_RELS_XML);
  zip.file('word/_rels/document.xml.rels', DOCUMENT_RELS_XML);
  zip.file('word/styles.xml', STYLES_XML);
  zip.file('word/numbering.xml', NUMBERING_XML);
  zip.file('word/document.xml', documentXml);

  const raw = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
  const bytes = new Uint8Array(raw);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return { bytes, blob };
}

function buildDocxFileName(originalName: string): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();
  const stem = sanitized?.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}.docx`;
}

function parsePageRange(expr: string, totalPages: number): number[] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return [];
  const raw = String(expr ?? '').trim().toLowerCase();
  if (!raw || raw === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const picked = new Set<number>();
  for (const part of raw.split(',')) {
    const seg = part.trim();
    if (/^\d+$/.test(seg)) {
      const p = Number(seg);
      if (p >= 1 && p <= totalPages) picked.add(p);
    } else {
      const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        const lo = Math.max(1, Math.min(a, b));
        const hi = Math.min(totalPages, Math.max(a, b));
        for (let p = lo; p <= hi; p++) picked.add(p);
      }
    }
  }
  return Array.from(picked).sort((a, b) => a - b);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function isNodeRuntime(): boolean {
  const proc = (
    globalThis as unknown as { process?: { versions?: { node?: string } } }
  ).process;
  return typeof proc?.versions?.node === 'string';
}

export async function extractStyledSpansWithPdfJs(
  pdfBytes: Uint8Array
): Promise<ExtractedStyledDocument> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!isNodeRuntime() && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    useWorkerFetch: false,
    useSystemFonts: true,
    verbosity: 0,
  });

  let docProxy: any = null;
  const pageSizes: Array<{ width: number; height: number }> = [];
  const spans: PdfStyledSpan[] = [];

  try {
    docProxy = await loadingTask.promise;
    const pageCount = docProxy.numPages ?? 0;

    for (let i = 1; i <= pageCount; i++) {
      const page = await docProxy.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      pageSizes.push({ width: vp.width, height: vp.height });

      const textContent = await page.getTextContent();
      const styles = (textContent?.styles ?? {}) as Record<
        string,
        { fontFamily?: string }
      >;

      for (const item of textContent?.items ?? []) {
        const text = String((item as any)?.str ?? '');
        if (!text.trim()) continue;

        const transform = Array.isArray((item as any)?.transform)
          ? (item as any).transform
          : [11, 0, 0, 11, 0, 0];
        const x = Number(transform[4] ?? 0);
        const y = Number(transform[5] ?? 0);
        const fontSize = Math.max(
          6,
          Math.round(
            Math.max(
              Math.hypot(Number(transform[0] ?? 0), Number(transform[1] ?? 0)),
              Math.hypot(Number(transform[2] ?? 0), Number(transform[3] ?? 0))
            ) * 10
          ) / 10
        );
        const width = Math.max(1, Number((item as any)?.width ?? text.length * fontSize * 0.5));
        const height = Math.max(fontSize, Number((item as any)?.height ?? fontSize));

        const fontKey = String((item as any)?.fontName ?? '');
        const styleDesc = `${fontKey} ${styles[fontKey]?.fontFamily ?? ''}`;
        const bold = /bold|heavy|black|semibold|demi/i.test(styleDesc);
        const italic = /italic|oblique|slant/i.test(styleDesc);

        spans.push({
          text,
          x,
          y,
          width,
          height,
          fontSize,
          bold,
          italic,
          pageIndex: i - 1,
        });
      }

      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }

    return { pageCount, pageSizes, spans };
  } finally {
    if (typeof docProxy?.destroy === 'function') {
      await docProxy.destroy();
    } else if (typeof loadingTask?.destroy === 'function') {
      await loadingTask.destroy();
    }
  }
}

export async function convertExtractedDocument(
  spans: PdfStyledSpan[],
  pageSizes: Array<{ width: number; height: number }>,
  fileName: string,
  options: PdfToWordMarkdownOptions,
  onProgress?: (percent: number, stage: string) => void
): Promise<PdfToWordMarkdownResult> {
  const docxName = buildDocxFileName(fileName);
  const pageCount = Math.max(pageSizes.length, 1);
  const targetPages = new Set(parsePageRange(options.pageRange, pageCount));
  const filteredSpans = (spans ?? []).filter((s) =>
    targetPages.has(s.pageIndex + 1)
  );

  if (filteredSpans.length === 0) {
    onProgress?.(100, 'Complete');
    return {
      success: true,
      blocks: [],
      markdown: '',
      plainText: '',
      sanitizedHtml: '',
      fileName: docxName,
      wordCount: 0,
      headingCount: 0,
      isScannedFallbackNeeded: true,
    };
  }

  onProgress?.(55, 'Reconstructing headings, lists and paragraphs');
  const blocks = reconstructDocumentAst(filteredSpans, pageSizes, options);
  const markdown = buildMarkdown(blocks, options.preserveInlineStyles);
  const plainText = buildPlainText(blocks);
  const sanitizedHtml = buildSanitizedHtmlPreview(blocks);

  let wordCount = 0;
  let headingCount = 0;
  for (const b of blocks) {
    if (b.type === 'heading') headingCount++;
    if (b.type !== 'page_break') {
      const txt = b.runs.map((r) => r.text).join('').trim();
      if (txt) wordCount += txt.split(/\s+/).filter(Boolean).length;
    }
  }

  onProgress?.(82, 'Packaging OOXML Word (.docx) document');
  const pkg = await buildDocxPackage(blocks);
  onProgress?.(100, 'Complete');

  return {
    success: true,
    blocks,
    markdown,
    plainText,
    sanitizedHtml,
    docxBlob: pkg.blob,
    docxBytes: pkg.bytes,
    fileName: docxName,
    wordCount,
    headingCount,
    isScannedFallbackNeeded: false,
  };
}

export async function convertPdfToWordMarkdown(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfToWordMarkdownOptions,
  deps: PdfToWordDeps = {}
): Promise<PdfToWordMarkdownResult> {
  const docxName = buildDocxFileName(fileName);
  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      blocks: [],
      markdown: '',
      plainText: '',
      sanitizedHtml: '',
      fileName: docxName,
      wordCount: 0,
      headingCount: 0,
      isScannedFallbackNeeded: false,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      blocks: [],
      markdown: '',
      plainText: '',
      sanitizedHtml: '',
      fileName: docxName,
      wordCount: 0,
      headingCount: 0,
      isScannedFallbackNeeded: false,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(15, 'Extracting typography spans with PDF.js');

  try {
    const extractor = deps.extractSpans ?? extractStyledSpansWithPdfJs;
    const extracted = await extractor(pdfBytes);
    if (extracted.pageCount <= 0) {
      return {
        success: false,
        blocks: [],
        markdown: '',
        plainText: '',
        sanitizedHtml: '',
        fileName: docxName,
        wordCount: 0,
        headingCount: 0,
        isScannedFallbackNeeded: false,
        errorCode: 'INVALID_PDF',
        error: 'PDF contains zero pages.',
      };
    }

    return await convertExtractedDocument(
      extracted.spans,
      extracted.pageSizes,
      fileName,
      options,
      deps.onProgress
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Unable to parse PDF typography.';
    const isEncrypted = /encrypt|password/i.test(msg);
    return {
      success: false,
      blocks: [],
      markdown: '',
      plainText: '',
      sanitizedHtml: '',
      fileName: docxName,
      wordCount: 0,
      headingCount: 0,
      isScannedFallbackNeeded: false,
      errorCode: isEncrypted ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
      error: isEncrypted
        ? 'Encrypted PDF detected. Unlock it first before converting.'
        : msg,
    };
  }
}
