import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFlagsString,
  buildHighlightSegments,
  detectRedosHazard,
  executeRegexMatch,
  explainRegexPattern,
  exportMatchesToCsv,
  exportMatchesToJson,
  generateRegexCode,
} from './engine';
import { DEFAULT_REGEX_FLAGS, DEFAULT_REGEX_TESTER_OPTIONS } from './types';

describe('Regex Tester & Debugger Engine (Seam 1A - Slice 1: Execution, Zero-Length Guard, Replace & Export)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('Vector 1: matches named capture groups, exact offsets, and named-group substitutions', () => {
    const res = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
      testString: 'Dates: 2026-11-19 and 2027-01-05',
      replacement: '$<day>/$<month>/$<year>',
      runReplace: true,
    });

    expect(res.valid).toBe(true);
    expect(res.timedOut).toBe(false);
    expect(res.matches).toHaveLength(2);
    expect(res.matches[0]).toMatchObject({
      matchNumber: 1,
      start: 7,
      end: 17,
      value: '2026-11-19',
      groups: ['2026', '11', '19'],
      namedGroups: { year: '2026', month: '11', day: '19' },
    });
    expect(res.matches[1].namedGroups).toEqual({
      year: '2027',
      month: '01',
      day: '05',
    });
    expect(res.replacedText).toBe('Dates: 19/11/2026 and 05/01/2027');
  });

  it('Vector 2: terminates cleanly on zero-length matches, astral Unicode surrogate pairs, and maxMatches cap', () => {
    const emptyMatches = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: 'a*',
      flags: { ...DEFAULT_REGEX_FLAGS, global: true },
      testString: 'bbb',
    });
    expect(emptyMatches.valid).toBe(true);
    expect(emptyMatches.matches).toHaveLength(4);
    expect(emptyMatches.matches.every((m) => m.isZeroLength)).toBe(true);

    // Astral Unicode surrogate pairs with u flag must advance 2 code units instead of corrupting index
    const emojiRes = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '(?<=)',
      flags: { ...DEFAULT_REGEX_FLAGS, global: true, unicode: true },
      testString: '🚀🔥',
    });
    expect(emojiRes.valid).toBe(true);
    expect(emojiRes.matches.map((m) => m.start)).toEqual([0, 2, 4]);

    // Truncates cleanly at maxMatches
    const truncatedRes = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: 'a',
      testString: 'aaaaaaaaaaaa',
      maxMatches: 5,
    });
    expect(truncatedRes.matches).toHaveLength(5);
    expect(truncatedRes.truncated).toBe(true);
  });

  it('reports invalid regex syntax errors cleanly and builds losslessly reconstructed highlight segments', () => {
    const bad = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '([a-z',
      testString: 'abc',
    });
    expect(bad.valid).toBe(false);
    expect(bad.syntaxError).toBeTruthy();

    const corpus = 'a=1 b=2 c=3';
    const good = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '\\w=\\d',
      testString: corpus,
    });
    const segments = buildHighlightSegments(corpus, good.matches);
    expect(segments.map((s) => s.text).join('')).toBe(corpus);
    expect(segments.filter((s) => s.matchIndex !== null)).toHaveLength(3);
  });

  it('builds flags string safely and exports matches to JSON and RFC-4180 CSV', () => {
    const flagsStr = buildFlagsString({
      global: true,
      ignoreCase: true,
      multiline: false,
      dotAll: true,
      unicode: true,
      hasIndices: false,
    });
    expect(flagsStr).toBe('gisu');

    const res = executeRegexMatch({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '(?<key>"[^"]+"|\\w+)=(?<val>[^\\s]+)',
      testString: '"a,b"=hello key2=world',
    });

    const json = exportMatchesToJson(res.matches);
    expect(JSON.parse(json)).toHaveLength(2);

    const csv = exportMatchesToCsv(res.matches);
    expect(csv).toContain('match_number,start,end,value,groups,named_groups');
    expect(csv).toContain('""a,b""=hello');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  describe('Seam 1B - Slice 2: Recursive Regex AST Explainer, ReDoS Detector & 5-Lang Codegen', () => {
    it('Vector 4: decomposes lookbehind, named group, character class, lazy quantifier & escaped dot in EN and ES', () => {
      const pattern = '(?<=@)(?<domain>[a-z0-9.-]+?)\\.[a-z]{2,}';
      const enTokens = explainRegexPattern(pattern, DEFAULT_REGEX_FLAGS, 'en');

      expect(enTokens.length).toBeGreaterThanOrEqual(4);
      expect(enTokens[0].category).toBe('group');
      expect(enTokens[0].raw).toBe('(?<=@)');
      expect(enTokens[0].description.toLowerCase()).toContain('lookbehind');

      const namedGroup = enTokens.find((t) => t.raw.startsWith('(?<domain>'));
      expect(namedGroup).toBeDefined();
      expect(namedGroup?.description).toContain('domain');
      expect(
        namedGroup?.children?.some(
          (c) => c.category === 'quantifier' && c.raw === '+?' && c.description.toLowerCase().includes('lazy')
        )
      ).toBe(true);

      expect(enTokens.some((t) => t.category === 'escape' && t.raw === '\\.')).toBe(true);
      expect(enTokens.some((t) => t.category === 'quantifier' && t.raw === '{2,}')).toBe(true);

      const esTokens = explainRegexPattern(pattern, DEFAULT_REGEX_FLAGS, 'es');
      expect(esTokens.length).toBe(enTokens.length);
      expect(esTokens[0].description.toLowerCase()).toContain('retrospectiva');
      const esNamed = esTokens.find((t) => t.raw.startsWith('(?<domain>'));
      expect(esNamed?.description.toLowerCase()).toContain('grupo');
    });

    it('handles anchors, alternation, backreferences, escaped brackets, and malformed edges safely without hanging', () => {
      const tokens = explainRegexPattern('^(foo|bar)\\1[^a-z\\]]+$', DEFAULT_REGEX_FLAGS, 'en');
      expect(tokens.some((t) => t.category === 'anchor' && t.raw === '^')).toBe(true);
      expect(tokens.some((t) => t.category === 'anchor' && t.raw === '$')).toBe(true);
      expect(tokens.some((t) => t.category === 'escape' && t.raw === '\\1')).toBe(true);
      const negClass = tokens.find((t) => t.raw === '[^a-z\\]]');
      expect(negClass?.category).toBe('char_class');

      // Malformed incomplete patterns must return gracefully without infinite loop
      expect(() => explainRegexPattern('([abc\\', DEFAULT_REGEX_FLAGS, 'en')).not.toThrow();
    });

    it('detects static ReDoS nested quantifiers cleanly', () => {
      expect(detectRedosHazard('(a+)+$')).toBe(true);
      expect(detectRedosHazard('(\\w+)*')).toBe(true);
      expect(detectRedosHazard('(?<year>\\d{4})-(?<month>\\d{2})')).toBe(false);
      expect(detectRedosHazard('\\(a\\+\\)+')).toBe(false);
    });

    it('generates ready-to-paste snippets in JavaScript, TypeScript, Python, Go (with RE2 warning), and Java', () => {
      const pattern = '(?<=@)(?<year>\\d{4})';
      const flags = { ...DEFAULT_REGEX_FLAGS, ignoreCase: true };

      const jsCode = generateRegexCode(pattern, flags, 'javascript', 'YEAR=$<year>', true);
      expect(jsCode).toContain('new RegExp(');
      expect(jsCode).toContain('.replace(');

      const tsCode = generateRegexCode(pattern, flags, 'typescript');
      expect(tsCode).toContain('RegExp');

      const pyCode = generateRegexCode(pattern, flags, 'python');
      expect(pyCode).toContain('(?P<year>');
      expect(pyCode).toContain('re.IGNORECASE');

      const goCode = generateRegexCode(pattern, flags, 'go');
      expect(goCode).toContain('regexp.MustCompile');
      expect(goCode).toContain('RE2');

      const javaCode = generateRegexCode(pattern, flags, 'java');
      expect(javaCode).toContain('Pattern.compile');
      expect(javaCode).toContain('Pattern.CASE_INSENSITIVE');
    });
  });
});
