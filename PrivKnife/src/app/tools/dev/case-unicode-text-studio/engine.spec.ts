import { describe, expect, it, vi } from 'vitest';
import {
  applyZalgo,
  computeTextStats,
  deduplicateLines,
  filterKaomojis,
  removeEmptyLines,
  reverseText,
  sortLines,
  stripZalgo,
  tokenizeIdentifier,
  transformAllCases,
  transformAllUnicodeStyles,
  transformCase,
  transformUnicodeStyle,
  trimLines,
} from './engine';
import { KAOMOJI_CATALOG } from './kaomoji';
import {
  ACRONYM_VECTOR,
  BATCH_IDENTIFIERS,
  GERMAN_SLUG_VECTOR,
  SPANISH_SLUG_VECTOR,
  SURROGATE_SAMPLE,
  UNASSIGNED_MATH_HOLES,
} from './test-fixtures';
import { KAOMOJI_CATEGORIES, UNICODE_STYLES } from './types';

describe('Case & Text Transform Engine (Spec 121 — Seam 1A)', () => {
  it('splits acronym, camelCase, snake_case, and numeric transitions cleanly', () => {
    expect(tokenizeIdentifier(ACRONYM_VECTOR)).toEqual([
      'XML',
      'Http',
      'Request',
      '2',
      'Id',
    ]);
    expect(tokenizeIdentifier('getHTTPResponse2URL')).toEqual([
      'get',
      'HTTP',
      'Response',
      '2',
      'URL',
    ]);
    expect(tokenizeIdentifier('user_firstName-v3.api/path')).toEqual([
      'user',
      'first',
      'Name',
      'v',
      '3',
      'api',
      'path',
    ]);
    expect(tokenizeIdentifier('   ___---   ')).toEqual([]);
  });

  it('converts across all 13 identifier and prose case formats accurately', () => {
    expect(transformCase(ACRONYM_VECTOR, 'camel')).toBe('xmlHttpRequest2Id');
    expect(transformCase(ACRONYM_VECTOR, 'pascal')).toBe('XmlHttpRequest2Id');
    expect(transformCase(ACRONYM_VECTOR, 'snake')).toBe('xml_http_request_2_id');
    expect(transformCase(ACRONYM_VECTOR, 'screaming_snake')).toBe('XML_HTTP_REQUEST_2_ID');
    expect(transformCase(ACRONYM_VECTOR, 'kebab')).toBe('xml-http-request-2-id');
    expect(transformCase(ACRONYM_VECTOR, 'cobol')).toBe('XML-HTTP-REQUEST-2-ID');
    expect(transformCase(ACRONYM_VECTOR, 'dot')).toBe('xml.http.request.2.id');
    expect(transformCase(ACRONYM_VECTOR, 'path')).toBe('xml/http/request/2/id');
    expect(transformCase('the_lord_of_the_rings', 'title')).toBe('The Lord of the Rings');
    expect(transformCase('HELLO_WORLD_TEST', 'sentence')).toBe('Hello world test');
    expect(transformCase('PrivKnife Dev', 'upper')).toBe('PRIVKNIFE DEV');
    expect(transformCase('PrivKnife Dev', 'lower')).toBe('privknife dev');
    expect(transformCase(SPANISH_SLUG_VECTOR, 'slug')).toBe('hola-espana-cafe-2026');
  });

  it('handles diacritics, sharp-s transliteration, punctuation-only slugs, and multi-line batch mode', () => {
    expect(transformCase(GERMAN_SLUG_VECTOR, 'slug')).toBe('strasse-uber');
    expect(transformCase('!!! --- ???', 'slug')).toBe('');
    expect(transformCase('Café Niño', 'slug', { batchLineByLine: false, stripDiacriticsForSlug: false })).toBe('café-niño');

    const batchSnake = transformCase(BATCH_IDENTIFIERS, 'snake', {
      batchLineByLine: true,
      stripDiacriticsForSlug: true,
    });
    expect(batchSnake).toBe('first_name\nlast_name\n\nxml_parser');
  });

  it('runs trim, deduplicate, sort, removeEmptyLines, and surrogate-safe reverseText', () => {
    expect(trimLines('  alpha  \n\tbeta \r\n  gamma  ')).toBe('alpha\nbeta\ngamma');
    expect(deduplicateLines('beta\nalpha\nbeta\ngamma\nalpha')).toBe('beta\nalpha\ngamma');
    expect(sortLines('b\na\nc', 'asc')).toBe('a\nb\nc');
    expect(sortLines('b\na\nc', 'desc')).toBe('c\nb\na');
    expect(removeEmptyLines('one\n\n   \ntwo\n')).toBe('one\ntwo');
    expect(reverseText(SURROGATE_SAMPLE)).toBe('éB🚀A');
  });

  it('computes accurate character, codepoint, word, line, and UTF-8 byte stats', () => {
    expect(computeTextStats('')).toEqual({
      characters: 0,
      codePoints: 0,
      words: 0,
      lines: 0,
      utf8Bytes: 0,
    });

    const stats = computeTextStats('Hello 🚀\nCafé');
    expect(stats.characters).toBe(13); // 5 + 1 + 2 + 1 + 4
    expect(stats.codePoints).toBe(12); // 🚀 is 1 codepoint
    expect(stats.words).toBe(3);
    expect(stats.lines).toBe(2);
    expect(stats.utf8Bytes).toBe(16);
  });
});

describe('Unicode Typography, Zalgo/De-Zalgo, Kaomoji & Privacy (Spec 121 — Seam 1B)', () => {
  it('maps A-Z, a-z, 0-9 across all 16 Unicode styles without any unassigned block holes', () => {
    const fullAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const holeSet = new Set(UNASSIGNED_MATH_HOLES);

    for (const styleMeta of UNICODE_STYLES) {
      const rendered = transformUnicodeStyle(fullAlphabet, styleMeta.id);
      expect(rendered.length).toBeGreaterThan(0);

      for (const ch of Array.from(rendered)) {
        const cp = ch.codePointAt(0)!;
        expect(holeSet.has(cp)).toBe(false);
      }
    }

    // Explicit historic Letterlike Symbol redirections
    expect(transformUnicodeStyle('h', 'italic_serif')).toBe('ℎ');
    expect(transformUnicodeStyle('BEFHILMR', 'script')).toBe('ℬℰℱℋℐℒℳℛ');
    expect(transformUnicodeStyle('ego', 'script')).toBe('ℯℊℴ');
    expect(transformUnicodeStyle('CHIRZ', 'fraktur')).toBe('ℭℌℑℜℨ');
    expect(transformUnicodeStyle('CHNPQRZ', 'double_struck')).toBe('ℂℍℕℙℚℝℤ');

    // Codepoint-safe upside-down reversal with astral emoji intact
    const flipped = transformUnicodeStyle('PrivKnife 🚀', 'upside_down');
    expect(Array.from(flipped)[0]).toBe('🚀');
  });

  it('applies deterministic Zalgo diacritics and cleanly strips back with stripZalgo', () => {
    const noisy = applyZalgo('PrivKnife', {
      intensity: 5,
      includeUp: true,
      includeMid: true,
      includeDown: true,
      seed: 42,
    });
    expect(noisy.length).toBeGreaterThan('PrivKnife'.length);
    expect(stripZalgo(noisy)).toBe('PrivKnife');

    // Same seed must produce identical output
    expect(
      applyZalgo('PrivKnife', {
        intensity: 5,
        includeUp: true,
        includeMid: true,
        includeDown: true,
        seed: 42,
      }),
    ).toBe(noisy);

    // Preserves legitimate precomposed NFC accents while stripping Zalgo marks
    const accentedNoisy = applyZalgo('Café España', {
      intensity: 4,
      includeUp: true,
      includeMid: true,
      includeDown: true,
      seed: 7,
    });
    expect(stripZalgo(accentedNoisy)).toBe('Café España');

    // No directions selected or whitespace-only text remains unchanged
    expect(
      applyZalgo('A\nB', {
        intensity: 10,
        includeUp: false,
        includeMid: false,
        includeDown: false,
        seed: 1,
      }),
    ).toBe('A\nB');
  });

  it('provides 150+ unique curated Kaomojis across 8 categories with instant keyword search', () => {
    expect(KAOMOJI_CATALOG.length).toBeGreaterThanOrEqual(150);
    const ids = new Set(KAOMOJI_CATALOG.map((k) => k.id));
    expect(ids.size).toBe(KAOMOJI_CATALOG.length);

    for (const cat of KAOMOJI_CATEGORIES) {
      expect(filterKaomojis('', cat).length).toBeGreaterThan(0);
    }

    const shrugs = filterKaomojis('dunno', 'all');
    expect(shrugs.some((k) => k.emoticon === '¯\\_(ツ)_/¯')).toBe(true);
    expect(filterKaomojis('no-such-kaomoji-xyz', 'all')).toEqual([]);
  });

  it('performs zero network requests, zero storage writes, and zero Math.random() calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const mathSpy = vi.spyOn(Math, 'random');

    try {
      transformAllCases(ACRONYM_VECTOR);
      transformAllUnicodeStyles('PrivKnife 2026');
      stripZalgo(
        applyZalgo('PrivKnife', {
          intensity: 5,
          includeUp: true,
          includeMid: true,
          includeDown: true,
          seed: 99,
        }),
      );
      filterKaomojis('cat', 'animals');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(mathSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      storageSpy.mockRestore();
      mathSpy.mockRestore();
    }
  });
});
