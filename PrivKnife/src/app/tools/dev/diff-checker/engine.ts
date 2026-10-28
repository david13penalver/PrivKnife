import {
  DiffCheckerOptions,
  DiffCheckerResult,
  DiffLine,
  DiffStats,
  DiffToken,
} from './types';

/**
 * Standard LCS (Longest Common Subsequence) diff implementation
 */
function lcsDiff<T>(
  a: T[],
  b: T[],
  equals: (itemA: T, itemB: T) => boolean
): { type: 'unchanged' | 'added' | 'removed'; itemA?: T; itemB?: T }[] {
  const m = a.length;
  const n = b.length;

  // dp table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (equals(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: { type: 'unchanged' | 'added' | 'removed'; itemA?: T; itemB?: T }[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && equals(a[i - 1], b[j - 1])) {
      result.push({ type: 'unchanged', itemA: a[i - 1], itemB: b[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', itemB: b[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({ type: 'removed', itemA: a[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

/**
 * Normalize line based on options (ignore whitespace, ignore case)
 */
function normalizeString(str: string, ignoreWhitespace: boolean, ignoreCase: boolean): string {
  let s = str;
  if (ignoreWhitespace) {
    s = s.trim().replace(/\s+/g, ' ');
  }
  if (ignoreCase) {
    s = s.toLowerCase();
  }
  return s;
}

/**
 * Tokenize string into words, whitespace, and symbols
 */
function tokenizeWords(text: string): string[] {
  return text.match(/\s+|[a-zA-Z0-9_]+|[^\s\w]/g) || [];
}

/**
 * Sub-diff two strings at word or character granularity
 */
function computeSubTokens(
  left: string,
  right: string,
  granularity: 'word' | 'character' | 'line',
  ignoreCase: boolean
): { leftTokens: DiffToken[]; rightTokens: DiffToken[] } {
  if (granularity === 'line') {
    return {
      leftTokens: [{ type: 'removed', value: left }],
      rightTokens: [{ type: 'added', value: right }],
    };
  }

  const tokensA = granularity === 'word' ? tokenizeWords(left) : left.split('');
  const tokensB = granularity === 'word' ? tokenizeWords(right) : right.split('');

  const diff = lcsDiff(tokensA, tokensB, (a, b) =>
    ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b
  );

  const leftTokens: DiffToken[] = [];
  const rightTokens: DiffToken[] = [];

  for (const op of diff) {
    if (op.type === 'unchanged') {
      leftTokens.push({ type: 'unchanged', value: op.itemA! });
      rightTokens.push({ type: 'unchanged', value: op.itemB! });
    } else if (op.type === 'removed') {
      leftTokens.push({ type: 'removed', value: op.itemA! });
    } else if (op.type === 'added') {
      rightTokens.push({ type: 'added', value: op.itemB! });
    }
  }

  return { leftTokens, rightTokens };
}

/**
 * Similarity metric between two strings
 */
function calculateSimilarity(
  a: string,
  b: string,
  granularity: 'word' | 'character' | 'line' = 'word'
): number {
  if (a.trim() === b.trim()) return 1;
  const sA = a.trim();
  const sB = b.trim();
  if (!sA || !sB) return 0;

  if (granularity === 'character' || Math.max(sA.length, sB.length) <= 15) {
    let commonChars = 0;
    const len = Math.min(sA.length, sB.length);
    for (let i = 0; i < len; i++) {
      if (sA[i].toLowerCase() === sB[i].toLowerCase()) commonChars++;
    }
    const charSim = commonChars / Math.max(sA.length, sB.length);
    if (charSim >= 0.3) return charSim;
  }

  const wordsA = tokenizeWords(a).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const wordsB = tokenizeWords(b).map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Compute line-by-line diff with paired modified lines
 */
export function computeDiff(
  originalText: string,
  modifiedText: string,
  options: DiffCheckerOptions
): DiffCheckerResult {
  const isOriginalEmpty = originalText.length === 0;
  const isModifiedEmpty = modifiedText.length === 0;

  if (isOriginalEmpty && isModifiedEmpty) {
    const emptyStats: DiffStats = {
      leftTotalLines: 0,
      rightTotalLines: 0,
      addedLines: 0,
      removedLines: 0,
      modifiedLines: 0,
      unchangedLines: 0,
    };
    const emptyPatch = '--- original\n+++ modified\n';
    const emptyHtml = generateHtmlDiffReport([], emptyStats, options);
    const blob = new Blob([emptyPatch], { type: 'text/x-diff' });
    return {
      success: true,
      lines: [],
      stats: emptyStats,
      patch: emptyPatch,
      htmlReport: emptyHtml,
      blob,
      fileName: 'diff_report.patch',
      fileSize: blob.size,
      mimeType: 'text/x-diff',
    };
  }

  const rawLinesA = isOriginalEmpty ? [] : originalText.split('\n');
  const rawLinesB = isModifiedEmpty ? [] : modifiedText.split('\n');

  const lineDiff = lcsDiff(rawLinesA, rawLinesB, (a, b) => {
    const normA = normalizeString(a, options.ignoreWhitespace, options.ignoreCase);
    const normB = normalizeString(b, options.ignoreWhitespace, options.ignoreCase);
    return normA === normB;
  });

  // Consolidate into DiffLine items, pairing removals with additions into 'modified'
  const lines: DiffLine[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;

  let idx = 0;
  while (idx < lineDiff.length) {
    const op = lineDiff[idx];

    if (op.type === 'unchanged') {
      lines.push({
        type: 'unchanged',
        leftLineNumber: leftLineNum++,
        rightLineNumber: rightLineNum++,
        leftText: op.itemA!,
        rightText: op.itemB!,
        unifiedText: op.itemA!,
      });
      idx++;
    } else {
      // Gather consecutive removed and added blocks
      const removedBlock: string[] = [];
      const addedBlock: string[] = [];

      while (idx < lineDiff.length && lineDiff[idx].type === 'removed') {
        removedBlock.push(lineDiff[idx].itemA!);
        idx++;
      }
      while (idx < lineDiff.length && lineDiff[idx].type === 'added') {
        addedBlock.push(lineDiff[idx].itemB!);
        idx++;
      }

      // Pair lines that have reasonable similarity using monotonic DP alignment
      const R = removedBlock.length;
      const A = addedBlock.length;

      // dp[r][a] represents max similarity alignment score
      const dp: number[][] = Array.from({ length: R + 1 }, () => Array(A + 1).fill(0));
      for (let r = 1; r <= R; r++) {
        for (let a = 1; a <= A; a++) {
          const sim = calculateSimilarity(
            removedBlock[r - 1],
            addedBlock[a - 1],
            options.diffGranularity
          );
          let matchScore = 0;
          if (sim >= 0.3) {
            matchScore = dp[r - 1][a - 1] + sim;
          }
          dp[r][a] = Math.max(dp[r - 1][a], dp[r][a - 1], matchScore);
        }
      }

      // Backtrack to find aligned pairs (r, a)
      const matchedPairs: Array<{ r: number; a: number }> = [];
      let currR = R;
      let currA = A;
      while (currR > 0 && currA > 0) {
        const sim = calculateSimilarity(
          removedBlock[currR - 1],
          addedBlock[currA - 1],
          options.diffGranularity
        );
        if (
          sim >= 0.3 &&
          Math.abs(dp[currR][currA] - (dp[currR - 1][currA - 1] + sim)) < 1e-9
        ) {
          matchedPairs.push({ r: currR - 1, a: currA - 1 });
          currR--;
          currA--;
        } else if (dp[currR - 1][currA] >= dp[currR][currA - 1]) {
          currR--;
        } else {
          currA--;
        }
      }
      matchedPairs.reverse(); // Now in strictly ascending order of r and a

      // Monotonically flush preceding removals, additions, then paired modified line
      let rCursor = 0;
      let aCursor = 0;

      for (const pair of matchedPairs) {
        while (rCursor < pair.r) {
          lines.push({
            type: 'removed',
            leftLineNumber: leftLineNum++,
            leftText: removedBlock[rCursor],
            unifiedText: removedBlock[rCursor],
          });
          rCursor++;
        }

        while (aCursor < pair.a) {
          lines.push({
            type: 'added',
            rightLineNumber: rightLineNum++,
            rightText: addedBlock[aCursor],
            unifiedText: addedBlock[aCursor],
          });
          aCursor++;
        }

        const leftTxt = removedBlock[pair.r];
        const rightTxt = addedBlock[pair.a];
        const { leftTokens, rightTokens } = computeSubTokens(
          leftTxt,
          rightTxt,
          options.diffGranularity,
          options.ignoreCase
        );

        lines.push({
          type: 'modified',
          leftLineNumber: leftLineNum++,
          rightLineNumber: rightLineNum++,
          leftText: leftTxt,
          rightText: rightTxt,
          leftTokens,
          rightTokens,
        });

        rCursor = pair.r + 1;
        aCursor = pair.a + 1;
      }

      // Trailing unmatched removed lines
      while (rCursor < R) {
        lines.push({
          type: 'removed',
          leftLineNumber: leftLineNum++,
          leftText: removedBlock[rCursor],
          unifiedText: removedBlock[rCursor],
        });
        rCursor++;
      }

      // Trailing unmatched added lines
      while (aCursor < A) {
        lines.push({
          type: 'added',
          rightLineNumber: rightLineNum++,
          rightText: addedBlock[aCursor],
          unifiedText: addedBlock[aCursor],
        });
        aCursor++;
      }
    }
  }

  // Compute stats
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  for (const line of lines) {
    if (line.type === 'added') {
      addedCount++;
    } else if (line.type === 'removed') {
      removedCount++;
    } else if (line.type === 'modified') {
      modifiedCount++;
      addedCount++;
      removedCount++;
    } else if (line.type === 'unchanged') {
      unchangedCount++;
    }
  }

  const stats: DiffStats = {
    leftTotalLines: rawLinesA.length,
    rightTotalLines: rawLinesB.length,
    addedLines: addedCount,
    removedLines: removedCount,
    modifiedLines: modifiedCount,
    unchangedLines: unchangedCount,
  };

  const patch = generateUnifiedPatch(lines);
  const htmlReport = generateHtmlDiffReport(lines, stats, options);
  const blob = new Blob([patch], { type: 'text/x-diff' });

  return {
    success: true,
    lines,
    stats,
    patch,
    htmlReport,
    blob,
    fileName: 'diff_report.patch',
    fileSize: blob.size,
    mimeType: 'text/x-diff',
    metadata: {
      leftTotalLines: stats.leftTotalLines,
      rightTotalLines: stats.rightTotalLines,
    },
  };
}

/**
 * Generate standard Unified Diff (.patch / .diff)
 */
export function generateUnifiedPatch(
  lines: DiffLine[],
  originalName = 'original',
  modifiedName = 'modified'
): string {
  if (lines.length === 0) {
    return `--- ${originalName}\n+++ ${modifiedName}\n`;
  }

  const patchLines: string[] = [];
  patchLines.push(`--- ${originalName}`);
  patchLines.push(`+++ ${modifiedName}`);

  // Single hunk for full content
  let leftCount = 0;
  let rightCount = 0;

  for (const line of lines) {
    if (line.type === 'unchanged') {
      leftCount++;
      rightCount++;
    } else if (line.type === 'removed') {
      leftCount++;
    } else if (line.type === 'added') {
      rightCount++;
    } else if (line.type === 'modified') {
      leftCount++;
      rightCount++;
    }
  }

  patchLines.push(`@@ -1,${leftCount} +1,${rightCount} @@`);

  for (const line of lines) {
    if (line.type === 'unchanged') {
      patchLines.push(` ${line.leftText}`);
    } else if (line.type === 'removed') {
      patchLines.push(`-${line.leftText}`);
    } else if (line.type === 'added') {
      patchLines.push(`+${line.rightText}`);
    } else if (line.type === 'modified') {
      patchLines.push(`-${line.leftText}`);
      patchLines.push(`+${line.rightText}`);
    }
  }

  return patchLines.join('\n') + '\n';
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate self-contained HTML Diff Report
 */
export function generateHtmlDiffReport(
  lines: DiffLine[],
  stats: DiffStats,
  options: DiffCheckerOptions
): string {
  const rows = lines
    .map((l) => {
      const leftNum = l.leftLineNumber !== undefined ? l.leftLineNumber : '';
      const rightNum = l.rightLineNumber !== undefined ? l.rightLineNumber : '';

      let leftContent = '';
      let rightContent = '';

      if (l.type === 'unchanged') {
        leftContent = escapeHtml(l.leftText || '');
        rightContent = escapeHtml(l.rightText || '');
      } else if (l.type === 'removed') {
        leftContent = `<span class="del">${escapeHtml(l.leftText || '')}</span>`;
      } else if (l.type === 'added') {
        rightContent = `<span class="ins">${escapeHtml(l.rightText || '')}</span>`;
      } else if (l.type === 'modified') {
        if (l.leftTokens) {
          leftContent = l.leftTokens
            .map((t) =>
              t.type === 'removed'
                ? `<mark class="del-word">${escapeHtml(t.value)}</mark>`
                : escapeHtml(t.value)
            )
            .join('');
        } else {
          leftContent = escapeHtml(l.leftText || '');
        }

        if (l.rightTokens) {
          rightContent = l.rightTokens
            .map((t) =>
              t.type === 'added'
                ? `<mark class="ins-word">${escapeHtml(t.value)}</mark>`
                : escapeHtml(t.value)
            )
            .join('');
        } else {
          rightContent = escapeHtml(l.rightText || '');
        }
      }

      return `<tr class="row row--${l.type}">
        <td class="lineno">${leftNum}</td>
        <td class="code left-pane"><code class="language-${options.syntaxLanguage}">${leftContent}</code></td>
        <td class="lineno">${rightNum}</td>
        <td class="code right-pane"><code class="language-${options.syntaxLanguage}">${rightContent}</code></td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PrivKnife Diff Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 0; padding: 20px; background: #f8fafc; color: #1e293b; }
    .header { margin-bottom: 20px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
    .header h1 { margin: 0 0 10px 0; font-size: 1.25rem; }
    .stats { display: flex; gap: 20px; font-size: 0.875rem; }
    .stat-add { color: #16a34a; font-weight: bold; }
    .stat-del { color: #dc2626; font-weight: bold; }
    .stat-mod { color: #d97706; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-family: 'Fira Code', Consolas, monospace; font-size: 12px; background: #fff; border: 1px solid #cbd5e1; }
    td { padding: 2px 8px; vertical-align: top; white-space: pre-wrap; word-break: break-all; }
    .lineno { width: 40px; text-align: right; color: #94a3b8; user-select: none; background: #f1f5f9; border-right: 1px solid #e2e8f0; }
    .code { width: calc(50% - 40px); }
    .left-pane { border-right: 1px solid #cbd5e1; }
    .row--unchanged { background: #fff; }
    .row--added { background: #f0fdf4; }
    .row--removed { background: #fef2f2; }
    .row--modified { background: #fffbeb; }
    .del { background: #fee2e2; color: #991b1b; }
    .ins { background: #dcfce7; color: #166534; }
    .del-word { background: #fca5a5; color: #7f1d1d; border-radius: 2px; }
    .ins-word { background: #86efac; color: #14532d; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PrivKnife Diff Report</h1>
    <div class="stats">
      <span>Added: <span class="stat-add">+${stats.addedLines}</span></span>
      <span>Removed: <span class="stat-del">-${stats.removedLines}</span></span>
      <span>Modified: <span class="stat-mod">~${stats.modifiedLines}</span></span>
      <span>Unchanged: ${stats.unchangedLines}</span>
    </div>
  </div>
  <table>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}
