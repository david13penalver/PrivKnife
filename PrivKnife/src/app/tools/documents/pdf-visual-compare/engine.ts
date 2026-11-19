import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  DiffClusterRect,
  ExtractedPageData,
  OverlayRenderStyle,
  PageDiffDetail,
  PageRgbaFrame,
  PdfCompareOptions,
  PdfVisualCompareDeps,
  PdfVisualCompareResult,
  TextDiffToken,
  VisualDiffOutput,
} from './types';

export function computeVisualPixelDiff(
  frameA: PageRgbaFrame | null,
  frameB: PageRgbaFrame | null,
  options: { pixelSensitivity?: number; overlayStyle?: OverlayRenderStyle } = {}
): VisualDiffOutput {
  const sensitivity = Math.min(
    0.9,
    Math.max(0.01, options.pixelSensitivity ?? 0.15)
  );
  const style = options.overlayStyle ?? 'overlay';

  const wA = frameA?.width ?? 0;
  const hA = frameA?.height ?? 0;
  const wB = frameB?.width ?? 0;
  const hB = frameB?.height ?? 0;
  const width = Math.max(1, wA, wB);
  const height = Math.max(1, hA, hB);
  const dimensionMismatch =
    Boolean(frameA && frameB) && (wA !== wB || hA !== hB);

  const totalPixels = width * height;
  const out = new Uint8ClampedArray(totalPixels * 4);
  const blockSize = 16;
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);
  const blockHit = new Uint8Array(cols * rows);

  let changedPixels = 0;

  for (let y = 0; y < height; y++) {
    const inYA = frameA && y < hA;
    const inYB = frameB && y < hB;
    const rowOut = y * width * 4;
    const rowA = inYA ? y * wA * 4 : -1;
    const rowB = inYB ? y * wB * 4 : -1;

    for (let x = 0; x < width; x++) {
      let rA = 255;
      let gA = 255;
      let bA = 255;
      if (inYA && x < wA) {
        const idxA = rowA + x * 4;
        if (frameA!.data[idxA + 3] >= 10) {
          rA = frameA!.data[idxA];
          gA = frameA!.data[idxA + 1];
          bA = frameA!.data[idxA + 2];
        }
      }

      let rB = 255;
      let gB = 255;
      let bB = 255;
      if (inYB && x < wB) {
        const idxB = rowB + x * 4;
        if (frameB!.data[idxB + 3] >= 10) {
          rB = frameB!.data[idxB];
          gB = frameB!.data[idxB + 1];
          bB = frameB!.data[idxB + 2];
        }
      }

      const dR = rA - rB;
      const dG = gA - gB;
      const dB = bA - bB;
      const lumA = (0.299 * rA + 0.587 * gA + 0.114 * bA) / 255;
      const lumB = (0.299 * rB + 0.587 * gB + 0.114 * bB) / 255;

      const dY = lumA - lumB;
      const dI = (0.595716 * dR - 0.274453 * dG - 0.321263 * dB) / 255;
      const dQ = (0.211456 * dR - 0.522591 * dG + 0.311135 * dB) / 255;
      const deltaSq = 0.5053 * dY * dY + 0.299 * dI * dI + 0.1957 * dQ * dQ;
      const normDist = Math.sqrt(deltaSq / 0.5053);

      const idxOut = rowOut + x * 4;
      if (normDist > sensitivity) {
        changedPixels++;
        const bx = Math.floor(x / blockSize);
        const by = Math.floor(y / blockSize);
        blockHit[by * cols + bx] = 1;

        if (style === 'highlight') {
          out[idxOut] = 217;
          out[idxOut + 1] = 119;
          out[idxOut + 2] = 6;
          out[idxOut + 3] = 255;
        } else if (lumA < lumB - 0.05) {
          // Darker in A -> removed content (crimson red)
          out[idxOut] = 220;
          out[idxOut + 1] = 38;
          out[idxOut + 2] = 38;
          out[idxOut + 3] = 255;
        } else if (lumB < lumA - 0.05) {
          // Darker in B -> added content (emerald)
          out[idxOut] = 5;
          out[idxOut + 1] = 150;
          out[idxOut + 2] = 105;
          out[idxOut + 3] = 255;
        } else {
          // Mutual color shift (amber)
          out[idxOut] = 217;
          out[idxOut + 1] = 119;
          out[idxOut + 2] = 6;
          out[idxOut + 3] = 255;
        }
      } else {
        const gray = Math.round(255 * 0.65 + lumA * 255 * 0.35);
        out[idxOut] = gray;
        out[idxOut + 1] = gray;
        out[idxOut + 2] = gray;
        out[idxOut + 3] = 255;
      }
    }
  }

  const clusters: DiffClusterRect[] = [];
  for (let by = 0; by < rows; by++) {
    let runStart = -1;
    for (let bx = 0; bx <= cols; bx++) {
      const hit = bx < cols && blockHit[by * cols + bx] === 1;
      if (hit && runStart === -1) {
        runStart = bx;
      } else if (!hit && runStart !== -1) {
        const x = runStart * blockSize;
        const y = by * blockSize;
        clusters.push({
          x,
          y,
          width: Math.min(width - x, (bx - runStart) * blockSize),
          height: Math.min(height - y, blockSize),
        });
        runStart = -1;
      }
    }
  }

  return {
    rgba: out,
    width,
    height,
    changedPixels,
    totalPixels,
    visualChangePercent: Number(((changedPixels / totalPixels) * 100).toFixed(3)),
    dimensionMismatch,
    clusters,
  };
}

export function buildPagePairs(
  countA: number,
  countB: number,
  pageOffsetB = 0
): Array<{ pairIndex: number; pageA: number | null; pageB: number | null }> {
  const cA = Math.max(0, Math.floor(countA || 0));
  const cB = Math.max(0, Math.floor(countB || 0));
  const off = Math.floor(pageOffsetB || 0);
  if (cA === 0 && cB === 0) return [];

  const minK = Math.min(cA > 0 ? 1 : Infinity, cB > 0 ? 1 - off : Infinity);
  const maxK = Math.max(cA > 0 ? cA : -Infinity, cB > 0 ? cB - off : -Infinity);

  const pairs: Array<{
    pairIndex: number;
    pageA: number | null;
    pageB: number | null;
  }> = [];

  for (let k = minK; k <= maxK; k++) {
    const a = k >= 1 && k <= cA ? k : null;
    const bIdx = k + off;
    const b = bIdx >= 1 && bIdx <= cB ? bIdx : null;
    if (a !== null || b !== null) {
      pairs.push({
        pairIndex: pairs.length + 1,
        pageA: a,
        pageB: b,
      });
    }
  }

  return pairs;
}

export function reconstructLinesFromTextItems(
  items: Array<{ str: string; x: number; y: number }>
): string {
  if (!items || items.length === 0) return '';

  const filtered = items.filter((item) => item && item.str && item.str.trim().length > 0);
  if (filtered.length === 0) return '';

  // Top-to-bottom descending Y, grouping items within 4 pt baseline tolerance
  const sorted = [...filtered].sort((a, b) => b.y - a.y);
  const lines: Array<{ y: number; items: Array<{ str: string; x: number }> }> = [];

  for (const item of sorted) {
    const existing = lines.find((line) => Math.abs(line.y - item.y) <= 4);
    if (existing) {
      existing.items.push({ str: item.str.trim(), x: item.x });
    } else {
      lines.push({ y: item.y, items: [{ str: item.str.trim(), x: item.x }] });
    }
  }

  return lines
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
    )
    .join('\n');
}

export function computeWordTextDiff(
  rawA: string,
  rawB: string,
  options: { ignoreWhitespace?: boolean; ignoreCase?: boolean } = {}
): {
  hasDiff: boolean;
  additions: number;
  deletions: number;
  tokens: TextDiffToken[];
} {
  const norm = (s: string): string => {
    let out = String(s ?? '');
    if (options.ignoreWhitespace) {
      out = out.replace(/\s+/g, ' ').trim();
    } else {
      out = out.trim();
    }
    if (options.ignoreCase) {
      out = out.toLowerCase();
    }
    return out;
  };

  const normA = norm(rawA);
  const normB = norm(rawB);

  if (normA === normB) {
    return {
      hasDiff: false,
      additions: 0,
      deletions: 0,
      tokens: normA ? [{ type: 'equal', text: normA }] : [],
    };
  }

  const splitWords = (s: string) => (s ? s.split(/\s+/).filter(Boolean) : []);
  let listA = splitWords(normA);
  let listB = splitWords(normB);

  if (listA.length * listB.length > 1_200_000) {
    // Line-chunk fallback to avoid excessive memory allocation on huge texts
    const chunked = (arr: string[]) => {
      const chunks: string[] = [];
      for (let i = 0; i < arr.length; i += 20) {
        chunks.push(arr.slice(i, i + 20).join(' '));
      }
      return chunks;
    };
    listA = chunked(listA);
    listB = chunked(listB);
  }

  const m = listA.length;
  const n = listB.length;
  const cols = n + 1;
  const dp = new Uint32Array((m + 1) * cols);

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (listA[i] === listB[j]) {
        dp[i * cols + j] = dp[(i + 1) * cols + (j + 1)] + 1;
      } else {
        const down = dp[(i + 1) * cols + j];
        const right = dp[i * cols + (j + 1)];
        dp[i * cols + j] = down >= right ? down : right;
      }
    }
  }

  const rawTokens: TextDiffToken[] = [];
  let i = 0;
  let j = 0;
  let additions = 0;
  let deletions = 0;

  while (i < m && j < n) {
    if (listA[i] === listB[j]) {
      rawTokens.push({ type: 'equal', text: listA[i] });
      i++;
      j++;
    } else if (dp[(i + 1) * cols + j] >= dp[i * cols + (j + 1)]) {
      rawTokens.push({ type: 'removed', text: listA[i] });
      deletions++;
      i++;
    } else {
      rawTokens.push({ type: 'added', text: listB[j] });
      additions++;
      j++;
    }
  }

  while (i < m) {
    rawTokens.push({ type: 'removed', text: listA[i++] });
    deletions++;
  }
  while (j < n) {
    rawTokens.push({ type: 'added', text: listB[j++] });
    additions++;
  }

  // Merge adjacent tokens of the same type cleanly
  const merged: TextDiffToken[] = [];
  for (const tok of rawTokens) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === tok.type) {
      prev.text += ` ${tok.text}`;
    } else {
      merged.push({ ...tok });
    }
  }

  return {
    hasDiff: additions > 0 || deletions > 0,
    additions,
    deletions,
    tokens: merged,
  };
}

export function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildHtmlDiffReport(result: PdfVisualCompareResult): string {
  const fileA = escapeHtml(result.fileNameA);
  const fileB = escapeHtml(result.fileNameB);
  const rows = result.summaries
    .map((s) => {
      const pageLabel = `Pair ${s.pairIndex} (A: ${s.pageA ?? 'None'}, B: ${s.pageB ?? 'None'})`;
      const tokensHtml = s.textTokens
        .map((t) => {
          const safeText = escapeHtml(t.text);
          if (t.type === 'added') return `<ins class="diff-add">${safeText}</ins>`;
          if (t.type === 'removed') return `<del class="diff-del">${safeText}</del>`;
          return `<span>${safeText}</span>`;
        })
        .join(' ');
      return `<section class="page-entry"><h2>${escapeHtml(pageLabel)}</h2><p>Visual Diff: ${s.visualChangePercent}% | Text: +${s.textAdditions} / -${s.textDeletions}</p><div class="tokens">${tokensHtml}</div></section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PrivKnife PDF Visual &amp; Text Diff Report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }
  ins.diff-add { background: #dcfce7; color: #166534; text-decoration: none; padding: 1px 4px; }
  del.diff-del { background: #fee2e2; color: #991b1b; padding: 1px 4px; }
  .page-entry { border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
</style>
</head>
<body>
  <h1>PrivKnife PDF Comparison Report</h1>
  <p><strong>Original (A):</strong> ${fileA} (${result.pagesA} pages)</p>
  <p><strong>Revised (B):</strong> ${fileB} (${result.pagesB} pages)</p>
  <p><strong>Changed Pairs:</strong> ${result.changedPageCount} / ${result.totalPairs}</p>
  ${rows}
</body>
</html>`;
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
  const proc = (globalThis as unknown as { process?: { versions?: { node?: string } } }).process;
  return typeof proc?.versions?.node === 'string';
}

export async function extractPagesWithPdfJs(
  pdfBytes: Uint8Array
): Promise<ExtractedPageData[]> {
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
  const pages: ExtractedPageData[] = [];

  try {
    docProxy = await loadingTask.promise;
    const count = docProxy.numPages ?? 0;

    for (let i = 1; i <= count; i++) {
      const page = await docProxy.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const rawItems = (textContent?.items ?? [])
        .map((it: any) => ({
          str: String(it?.str ?? ''),
          x: Array.isArray(it?.transform) ? Number(it.transform[4] ?? 0) : 0,
          y: Array.isArray(it?.transform) ? Number(it.transform[5] ?? 0) : 0,
        }))
        .filter((it: { str: string }) => it.str.length > 0);

      let frame: PageRgbaFrame | undefined;
      if (typeof document !== 'undefined') {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const renderScale = Math.min(1.5, 900 / Math.max(1, vp.width));
            const rvp = page.getViewport({ scale: renderScale });
            canvas.width = Math.max(1, Math.round(rvp.width));
            canvas.height = Math.max(1, Math.round(rvp.height));
            await page.render({ canvasContext: ctx, viewport: rvp, canvas }).promise;
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            frame = {
              data: new Uint8ClampedArray(imgData.data),
              width: canvas.width,
              height: canvas.height,
            };
            canvas.width = 0;
            canvas.height = 0;
          }
        } catch {
          // Headless environment without full 2D canvas
        }
      }

      pages.push({
        pageNumber: i,
        widthPt: vp.width,
        heightPt: vp.height,
        text: reconstructLinesFromTextItems(rawItems),
        frame,
      });

      if (typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }
    return pages;
  } finally {
    if (typeof docProxy?.destroy === 'function') {
      await docProxy.destroy();
    } else if (typeof loadingTask?.destroy === 'function') {
      await loadingTask.destroy();
    }
  }
}

export function compareExtractedDocuments(
  fileNameA: string,
  fileNameB: string,
  pagesA: ExtractedPageData[],
  pagesB: ExtractedPageData[],
  options: PdfCompareOptions,
  onProgress?: (percent: number, stage: string) => void
): PdfVisualCompareResult {
  const pairs = buildPagePairs(
    pagesA.length,
    pagesB.length,
    options?.pageOffsetB ?? 0
  );

  const mapA = new Map(pagesA.map((p) => [p.pageNumber, p]));
  const mapB = new Map(pagesB.map((p) => [p.pageNumber, p]));
  const summaries: PageDiffDetail[] = [];
  let changedPageCount = 0;

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    onProgress?.(
      Math.round(35 + ((i + 1) / Math.max(1, pairs.length)) * 60),
      `Comparing page pair ${i + 1}/${pairs.length}`
    );

    const pageDataA = pair.pageA ? mapA.get(pair.pageA) : undefined;
    const pageDataB = pair.pageB ? mapB.get(pair.pageB) : undefined;

    const textDiff = computeWordTextDiff(
      pageDataA?.text ?? '',
      pageDataB?.text ?? '',
      {
        ignoreWhitespace: options?.ignoreWhitespace ?? true,
        ignoreCase: options?.ignoreCase ?? false,
      }
    );

    let visualChangePercent = 0;
    let dimensionMismatch = false;
    let clusters: DiffClusterRect[] = [];
    let overlayFrame: PageRgbaFrame | undefined;

    if (pageDataA?.frame || pageDataB?.frame) {
      const vis = computeVisualPixelDiff(
        pageDataA?.frame ?? null,
        pageDataB?.frame ?? null,
        {
          pixelSensitivity: options?.pixelSensitivity ?? 0.15,
          overlayStyle: options?.overlayStyle ?? 'overlay',
        }
      );
      visualChangePercent = vis.visualChangePercent;
      dimensionMismatch = vis.dimensionMismatch;
      clusters = vis.clusters;
      overlayFrame = { data: vis.rgba, width: vis.width, height: vis.height };
    } else if (
      (pageDataA && !pageDataB) ||
      (!pageDataA && pageDataB) ||
      (pageDataA &&
        pageDataB &&
        (Math.abs(pageDataA.widthPt - pageDataB.widthPt) > 1 ||
          Math.abs(pageDataA.heightPt - pageDataB.heightPt) > 1))
    ) {
      dimensionMismatch = true;
    }

    const hasVisualDiff = visualChangePercent > 0;
    const hasPageMissingDiff = pair.pageA === null || pair.pageB === null;
    const isChanged =
      hasVisualDiff || textDiff.hasDiff || hasPageMissingDiff || dimensionMismatch;

    if (isChanged) {
      changedPageCount++;
    }

    summaries.push({
      pairIndex: pair.pairIndex,
      pageA: pair.pageA,
      pageB: pair.pageB,
      hasVisualDiff,
      hasTextDiff: textDiff.hasDiff || hasPageMissingDiff,
      visualChangePercent,
      textAdditions: textDiff.additions,
      textDeletions: textDiff.deletions,
      dimensionMismatch,
      textTokens: textDiff.tokens,
      clusters,
      overlayFrame,
    });
  }

  onProgress?.(100, 'Complete');

  return {
    success: true,
    fileNameA,
    fileNameB,
    totalPairs: pairs.length,
    changedPageCount,
    pagesA: pagesA.length,
    pagesB: pagesB.length,
    summaries,
  };
}

export async function comparePdfDocuments(
  pdfBytesA: Uint8Array,
  pdfBytesB: Uint8Array,
  fileNameA: string,
  fileNameB: string,
  options: PdfCompareOptions,
  deps: PdfVisualCompareDeps = {}
): Promise<PdfVisualCompareResult> {
  if (
    !pdfBytesA ||
    !pdfBytesB ||
    pdfBytesA.byteLength < 8 ||
    pdfBytesB.byteLength < 8
  ) {
    return {
      success: false,
      fileNameA,
      fileNameB,
      totalPairs: 0,
      changedPageCount: 0,
      pagesA: 0,
      pagesB: 0,
      summaries: [],
      errorCode: 'INVALID_INPUT',
      error: 'Both Version A and Version B PDF files are required.',
    };
  }

  if (!hasPdfSignature(pdfBytesA) || !hasPdfSignature(pdfBytesB)) {
    return {
      success: false,
      fileNameA,
      fileNameB,
      totalPairs: 0,
      changedPageCount: 0,
      pagesA: 0,
      pagesB: 0,
      summaries: [],
      errorCode: 'INVALID_PDF',
      error: 'One or both inputs do not contain a valid %PDF- header.',
    };
  }

  deps.onProgress?.(10, 'Loading both PDFs locally');

  try {
    const extractor = deps.extractPages ?? extractPagesWithPdfJs;
    const pagesA = await extractor(pdfBytesA);
    deps.onProgress?.(25, 'Extracted Original PDF (A)');
    const pagesB = await extractor(pdfBytesB);

    if (pagesA.length === 0 || pagesB.length === 0) {
      return {
        success: false,
        fileNameA,
        fileNameB,
        totalPairs: 0,
        changedPageCount: 0,
        pagesA: pagesA.length,
        pagesB: pagesB.length,
        summaries: [],
        errorCode: 'INVALID_PDF',
        error: 'Both PDFs must contain at least one valid page.',
      };
    }

    return compareExtractedDocuments(
      fileNameA,
      fileNameB,
      pagesA,
      pagesB,
      options,
      deps.onProgress
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unable to parse PDF.';
    const isEncrypted = /encrypt|password/i.test(msg);
    return {
      success: false,
      fileNameA,
      fileNameB,
      totalPairs: 0,
      changedPageCount: 0,
      pagesA: 0,
      pagesB: 0,
      summaries: [],
      errorCode: isEncrypted ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
      error: isEncrypted
        ? 'Encrypted PDF detected. Unlock it first before comparing.'
        : msg,
    };
  }
}

function toWinAnsiSafeLine(text: string): string {
  return String(text ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

export async function buildPdfDiffReport(
  result: PdfVisualCompareResult,
  changedOnly = true
): Promise<{
  success: boolean;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  error?: string;
}> {
  const fileName = 'privknife-pdf-diff-report.pdf';
  try {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const cover = doc.addPage([595, 842]);
    cover.drawText('PrivKnife Visual & Text Diff Report', {
      x: 48,
      y: 780,
      size: 18,
      font: bold,
      color: rgb(0.1, 0.15, 0.25),
    });

    const summaryLines = [
      `Original (A): ${toWinAnsiSafeLine(result.fileNameA)} (${result.pagesA} pages)`,
      `Revised (B): ${toWinAnsiSafeLine(result.fileNameB)} (${result.pagesB} pages)`,
      `Total Page Pairs: ${result.totalPairs}`,
      `Changed Pairs: ${result.changedPageCount}`,
    ];

    let y = 735;
    for (const line of summaryLines) {
      cover.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 20;
    }

    const items = changedOnly
      ? result.summaries.filter((s) => s.hasVisualDiff || s.hasTextDiff || s.dimensionMismatch)
      : result.summaries;

    let page = cover;
    y -= 16;

    for (const entry of items) {
      if (y < 100) {
        page = doc.addPage([595, 842]);
        y = 780;
      }
      const header = `Pair ${entry.pairIndex} (A: ${entry.pageA ?? '-'}, B: ${entry.pageB ?? '-'}) — Visual: ${entry.visualChangePercent}% | Text: +${entry.textAdditions}/-${entry.textDeletions}`;
      page.drawText(toWinAnsiSafeLine(header), {
        x: 48,
        y,
        size: 11,
        font: bold,
        color: rgb(0.15, 0.25, 0.55),
      });
      y -= 16;

      for (const tok of entry.textTokens.slice(0, 12)) {
        if (tok.type === 'equal') continue;
        if (y < 70) {
          page = doc.addPage([595, 842]);
          y = 780;
        }
        const prefix = tok.type === 'added' ? '[+] ' : '[-] ';
        const line = toWinAnsiSafeLine(`${prefix}${tok.text}`).slice(0, 88);
        page.drawText(line, {
          x: 60,
          y,
          size: 10,
          font,
          color:
            tok.type === 'added'
              ? rgb(0.02, 0.48, 0.3)
              : rgb(0.75, 0.15, 0.15),
        });
        y -= 14;
      }
      y -= 10;
    }

    const bytes = new Uint8Array(await doc.save());
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return { success: true, blob, bytes, fileName };
  } catch (err: unknown) {
    return {
      success: false,
      fileName,
      error: err instanceof Error ? err.message : 'Unable to generate PDF diff report.',
    };
  }
}
