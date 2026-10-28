import { describe, it, expect } from 'vitest';
import {
  computeDiff,
  generateUnifiedPatch,
  generateHtmlDiffReport,
} from './engine';
import {
  DEFAULT_DIFF_OPTIONS,
  SAMPLE_CODE_ORIGINAL,
  SAMPLE_CODE_MODIFIED,
  SAMPLE_CONTRACT_ORIGINAL,
  SAMPLE_CONTRACT_MODIFIED,
} from './test-fixtures';

describe('DiffEngine (engine.ts) - Seam 1', () => {
  describe('computeDiff', () => {
    it('should compute diff between original and modified code', () => {
      const result = computeDiff(SAMPLE_CODE_ORIGINAL, SAMPLE_CODE_MODIFIED, DEFAULT_DIFF_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.lines.length).toBeGreaterThan(0);
      expect(result.stats.addedLines).toBeGreaterThan(0);
      expect(result.stats.removedLines).toBeGreaterThan(0);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.patch).toContain('--- original');
      expect(result.patch).toContain('+++ modified');
      expect(result.htmlReport).toContain('<!DOCTYPE html>');
    });

    it('should report zero additions and deletions for identical text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = computeDiff(text, text, DEFAULT_DIFF_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.stats.addedLines).toBe(0);
      expect(result.stats.removedLines).toBe(0);
      expect(result.stats.modifiedLines).toBe(0);
      expect(result.stats.unchangedLines).toBe(3);
    });

    it('should handle completely empty text gracefully', () => {
      const result = computeDiff('', '', DEFAULT_DIFF_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.lines.length).toBe(0);
      expect(result.stats.leftTotalLines).toBe(0);
      expect(result.stats.rightTotalLines).toBe(0);
    });

    it('should handle additions when original is empty', () => {
      const result = computeDiff('', 'First line\nSecond line', DEFAULT_DIFF_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.stats.addedLines).toBe(2);
      expect(result.stats.removedLines).toBe(0);
    });

    it('should handle deletions when modified is empty', () => {
      const result = computeDiff('First line\nSecond line', '', DEFAULT_DIFF_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.stats.removedLines).toBe(2);
      expect(result.stats.addedLines).toBe(0);
    });

    it('should respect ignoreWhitespace option', () => {
      const orig = '  const a = 1;  ';
      const mod = 'const a = 1;';

      const strictResult = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        ignoreWhitespace: false,
      });
      expect(strictResult.stats.unchangedLines).toBe(0);

      const relaxedResult = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        ignoreWhitespace: true,
      });
      expect(relaxedResult.stats.unchangedLines).toBe(1);
    });

    it('should respect ignoreCase option', () => {
      const orig = 'SELECT * FROM users';
      const mod = 'select * from users';

      const strictResult = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        ignoreCase: false,
      });
      expect(strictResult.stats.unchangedLines).toBe(0);

      const relaxedResult = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        ignoreCase: true,
      });
      expect(relaxedResult.stats.unchangedLines).toBe(1);
    });

    it('should tokenize word changes within modified lines (word granularity)', () => {
      const orig = 'The quick brown fox jumps';
      const mod = 'The fast brown dog leaps';

      const result = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        diffGranularity: 'word',
      });

      expect(result.success).toBe(true);
      const modifiedLine = result.lines[0];
      expect(modifiedLine.type).toBe('modified');
      expect(modifiedLine.leftTokens).toBeDefined();
      expect(modifiedLine.rightTokens).toBeDefined();
      expect(modifiedLine.leftTokens?.some((t) => t.type === 'removed' && t.value === 'quick')).toBe(true);
      expect(modifiedLine.rightTokens?.some((t) => t.type === 'added' && t.value === 'fast')).toBe(true);
    });

    it('should tokenize character changes within modified lines (character granularity)', () => {
      const orig = 'cat';
      const mod = 'car';

      const result = computeDiff(orig, mod, {
        ...DEFAULT_DIFF_OPTIONS,
        diffGranularity: 'character',
      });

      expect(result.success).toBe(true);
      const modifiedLine = result.lines[0];
      expect(modifiedLine.leftTokens?.some((t) => t.type === 'removed' && t.value === 't')).toBe(true);
      expect(modifiedLine.rightTokens?.some((t) => t.type === 'added' && t.value === 'r')).toBe(true);
    });

    it('should preserve strict monotonic line ordering of original and modified lines (DEFECT-55-01)', () => {
      const result = computeDiff(SAMPLE_CODE_ORIGINAL, SAMPLE_CODE_MODIFIED, DEFAULT_DIFF_OPTIONS);
      expect(result.success).toBe(true);

      // Verify leftLineNumber is strictly increasing for all lines where it is present
      const leftNums = result.lines.filter((l) => l.leftLineNumber !== undefined).map((l) => l.leftLineNumber!);
      for (let i = 1; i < leftNums.length; i++) {
        expect(leftNums[i]).toBeGreaterThan(leftNums[i - 1]);
      }

      // Verify rightLineNumber is strictly increasing for all lines where it is present
      const rightNums = result.lines.filter((l) => l.rightLineNumber !== undefined).map((l) => l.rightLineNumber!);
      for (let i = 1; i < rightNums.length; i++) {
        expect(rightNums[i]).toBeGreaterThan(rightNums[i - 1]);
      }

      // Verify leftText lines follow the exact sequence of original lines
      const leftTexts = result.lines.filter((l) => l.leftText !== undefined).map((l) => l.leftText!);
      expect(leftTexts).toEqual(SAMPLE_CODE_ORIGINAL.split('\n'));

      // Verify rightText lines follow the exact sequence of modified lines
      const rightTexts = result.lines.filter((l) => l.rightText !== undefined).map((l) => l.rightText!);
      expect(rightTexts).toEqual(SAMPLE_CODE_MODIFIED.split('\n'));

      // Explicitly check that 'return total;' comes AFTER 'total = total + items[i].price;'
      const returnTotalIdx = result.lines.findIndex((l) => l.leftText?.includes('return total;'));
      const loopCalcIdx = result.lines.findIndex((l) => l.leftText?.includes('total = total + items[i].price;'));
      expect(returnTotalIdx).toBeGreaterThan(loopCalcIdx);
    });
  });

  describe('generateUnifiedPatch', () => {
    it('should generate valid unified diff patch format with headers', () => {
      const result = computeDiff(SAMPLE_CONTRACT_ORIGINAL, SAMPLE_CONTRACT_MODIFIED, DEFAULT_DIFF_OPTIONS);
      const patch = generateUnifiedPatch(result.lines, 'contract_v1.txt', 'contract_v2.txt');

      expect(patch).toContain('--- contract_v1.txt');
      expect(patch).toContain('+++ contract_v2.txt');
      expect(patch).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
      expect(patch).toContain('-4.1 The Client shall pay');
      expect(patch).toContain('+4.1 The Client shall pay');
    });
  });

  describe('generateHtmlDiffReport', () => {
    it('should generate a standalone valid HTML report with embedded styles', () => {
      const result = computeDiff(SAMPLE_CODE_ORIGINAL, SAMPLE_CODE_MODIFIED, DEFAULT_DIFF_OPTIONS);
      const html = generateHtmlDiffReport(result.lines, result.stats, DEFAULT_DIFF_OPTIONS);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<style>');
      expect(html).toContain('PrivKnife Diff Report');
      expect(html).toContain('Added:');
      expect(html).toContain('Removed:');
      expect(html).toContain('</html>');
    });
  });
});
