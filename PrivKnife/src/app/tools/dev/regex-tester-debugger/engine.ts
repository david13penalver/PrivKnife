import {
  HighlightSegment,
  RegexCodeLanguage,
  RegexExplanationToken,
  RegexFlagsConfig,
  RegexMatchEntry,
  RegexTesterOptions,
  RegexTesterResult,
} from './types';

function supportsHasIndicesFlag(): boolean {
  try {
    new RegExp('', 'd');
    return true;
  } catch {
    return false;
  }
}

export function buildFlagsString(flags: RegexFlagsConfig): string {
  let out = '';
  if (flags.global) out += 'g';
  if (flags.ignoreCase) out += 'i';
  if (flags.multiline) out += 'm';
  if (flags.dotAll) out += 's';
  if (flags.unicode) out += 'u';
  if (flags.hasIndices && supportsHasIndicesFlag()) out += 'd';
  return out;
}

/**
 * Static heuristic detector for classic nested-quantifier / overlapping-alternation
 * catastrophic backtracking (ReDoS) hazards.
 */
export function detectRedosHazard(pattern: string): boolean {
  if (!pattern) return false;
  // Strip escaped characters so literal `\+` inside groups does not trigger false positives
  const unescaped = pattern.replace(/\\./g, 'x');
  // 1. Group containing quantifier followed immediately by an outer quantifier: e.g. (a+)+, (.*)*, (\w{1,})+
  if (/\([^()]*[+*}][^()]*\)\s*(?:[+*]|\{\s*\d+\s*,\s*\d*\s*\})/.test(unescaped)) {
    return true;
  }
  // 2. Adjacent competing unbounded wildcards / dot-stars inside quantified group or top-level concatenation
  if (/\.\*.*\.\*/.test(unescaped)) {
    return true;
  }
  return false;
}

export function executeRegexMatch(
  options: RegexTesterOptions,
  locale: 'en' | 'es' = 'en'
): RegexTesterResult {
  const started = performance.now();
  const pattern = options.pattern ?? '';
  const testString = options.testString ?? '';
  const flagsStr = buildFlagsString(options.flags);
  const staticRedosHazard = detectRedosHazard(pattern);
  const explanation = explainRegexPattern(pattern, options.flags, locale);

  if (pattern.length === 0) {
    return {
      valid: true,
      timedOut: false,
      staticRedosHazard: false,
      truncated: false,
      matches: [],
      replacedText: options.runReplace ? testString : undefined,
      explanation,
      executionMs: Math.round((performance.now() - started) * 1000) / 1000,
    };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flagsStr);
  } catch (err: unknown) {
    return {
      valid: false,
      syntaxError: err instanceof Error ? err.message : 'Invalid regular expression.',
      timedOut: false,
      staticRedosHazard,
      truncated: false,
      matches: [],
      explanation,
      executionMs: Math.round((performance.now() - started) * 1000) / 1000,
    };
  }

  const maxMatches = Math.max(
    1,
    Math.min(50_000, Math.floor(options.maxMatches || 10_000))
  );
  const matches: RegexMatchEntry[] = [];
  let truncated = false;

  if (!options.flags.global) {
    const m = regex.exec(testString);
    if (m) {
      const value = m[0] ?? '';
      const namedGroups: Record<string, string | undefined> = {};
      if (m.groups) {
        for (const [k, v] of Object.entries(m.groups)) {
          Object.defineProperty(namedGroups, k, {
            value: v,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
      }
      matches.push({
        matchNumber: 1,
        start: m.index,
        end: m.index + value.length,
        value,
        groups: m.slice(1),
        namedGroups,
        isZeroLength: value.length === 0,
      });
    }
  } else {
    regex.lastIndex = 0;
    while (true) {
      const m = regex.exec(testString);
      if (!m) break;

      if (matches.length >= maxMatches) {
        truncated = true;
        break;
      }

      const value = m[0] ?? '';
      const start = m.index;
      const end = start + value.length;
      const namedGroups: Record<string, string | undefined> = {};
      if (m.groups) {
        for (const [k, v] of Object.entries(m.groups)) {
          Object.defineProperty(namedGroups, k, {
            value: v,
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
      }

      matches.push({
        matchNumber: matches.length + 1,
        start,
        end,
        value,
        groups: m.slice(1),
        namedGroups,
        isZeroLength: value.length === 0,
      });

      if (value.length === 0) {
        if (start >= testString.length) {
          break;
        }
        const cp = testString.codePointAt(start);
        const step =
          options.flags.unicode && cp !== undefined && cp > 0xffff ? 2 : 1;
        regex.lastIndex = start + step;
      }
    }
  }

  let replacedText: string | undefined;
  if (options.runReplace) {
    const replaceRegex = new RegExp(pattern, flagsStr);
    replacedText = testString.replace(replaceRegex, options.replacement ?? '');
  }

  return {
    valid: true,
    timedOut: false,
    staticRedosHazard,
    truncated,
    matches,
    replacedText,
    explanation,
    executionMs: Math.round((performance.now() - started) * 1000) / 1000,
  };
}

export function buildHighlightSegments(
  testString: string,
  matches: RegexMatchEntry[]
): HighlightSegment[] {
  if (!testString && matches.length === 0) return [];

  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (m.start < cursor) continue;

    if (m.start > cursor) {
      segments.push({
        text: testString.slice(cursor, m.start),
        matchIndex: null,
        alternate: false,
      });
    }

    const tooltipParts = [`Match #${m.matchNumber} [${m.start}..${m.end}]`];
    const namedEntries = Object.entries(m.namedGroups).filter(
      ([, v]) => v !== undefined
    );
    if (namedEntries.length > 0) {
      tooltipParts.push(namedEntries.map(([k, v]) => `${k}=${v}`).join(', '));
    }

    if (m.start === m.end) {
      segments.push({
        text: '',
        matchIndex: m.matchNumber,
        alternate: i % 2 === 1,
        isZeroWidth: true,
        tooltip: tooltipParts.join(' • '),
      });
    } else {
      segments.push({
        text: testString.slice(m.start, m.end),
        matchIndex: m.matchNumber,
        alternate: i % 2 === 1,
        tooltip: tooltipParts.join(' • '),
      });
      cursor = m.end;
    }
  }

  if (cursor < testString.length) {
    segments.push({
      text: testString.slice(cursor),
      matchIndex: null,
      alternate: false,
    });
  }

  return segments;
}

export function exportMatchesToJson(matches: RegexMatchEntry[]): string {
  return JSON.stringify(matches, null, 2);
}

function csvEscapeCell(raw: string): string {
  const safe = /^[=+@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function exportMatchesToCsv(matches: RegexMatchEntry[]): string {
  const rows = ['match_number,start,end,value,groups,named_groups'];
  for (const m of matches) {
    rows.push(
      [
        String(m.matchNumber),
        String(m.start),
        String(m.end),
        csvEscapeCell(m.value),
        csvEscapeCell(JSON.stringify(m.groups)),
        csvEscapeCell(JSON.stringify(m.namedGroups)),
      ].join(',')
    );
  }
  return rows.join('\n');
}

// ============================================================================
// Seam 1B: Recursive-Descent Regex AST Explainer (EN/ES) & 5-Lang Codegen
// ============================================================================

function describeEscape(seq: string, locale: 'en' | 'es'): string {
  const es = locale === 'es';
  const map: Record<string, [string, string]> = {
    '\\d': ['Matches any ASCII digit [0-9]', 'Coincide con cualquier dígito [0-9]'],
    '\\D': ['Matches any non-digit character', 'Coincide con cualquier carácter no numérico'],
    '\\w': ['Matches any word character [a-zA-Z0-9_]', 'Coincide con carácter de palabra [a-zA-Z0-9_]'],
    '\\W': ['Matches any non-word character', 'Coincide con carácter que no es palabra'],
    '\\s': ['Matches any whitespace character', 'Coincide con cualquier espacio en blanco'],
    '\\S': ['Matches any non-whitespace character', 'Coincide con carácter distinto de espacio'],
    '\\b': ['Word boundary assertion', 'Aserción de límite de palabra'],
    '\\B': ['Non-word boundary assertion', 'Aserción de no límite de palabra'],
    '\\n': ['Newline character', 'Salto de línea'],
    '\\r': ['Carriage return character', 'Retorno de carro'],
    '\\t': ['Horizontal tab character', 'Tabulador horizontal'],
  };
  if (map[seq]) {
    return es ? map[seq][1] : map[seq][0];
  }
  if (/^\\[1-9]\d*$/.test(seq)) {
    const idx = seq.slice(1);
    return es
      ? `Retrorreferencia al grupo de captura #${idx}`
      : `Backreference to capturing group #${idx}`;
  }
  if (/^\\k<[^>]+>$/.test(seq)) {
    const name = seq.slice(3, -1);
    return es
      ? `Retrorreferencia al grupo nombrado "${name}"`
      : `Backreference to named group "${name}"`;
  }
  const lit = seq.slice(1);
  return es ? `Carácter literal escapado "${lit}"` : `Escaped literal "${lit}"`;
}

function describeQuantifier(
  raw: string,
  locale: 'en' | 'es'
): { baseDesc: string; lazy: boolean } {
  const es = locale === 'es';
  const lazy = raw.endsWith('?') && raw.length > 1;
  const core = lazy ? raw.slice(0, -1) : raw;

  let baseDesc: string;
  if (core === '*') {
    baseDesc = es ? 'Cuantificador: 0 o más veces' : 'Quantifier: 0 or more times';
  } else if (core === '+') {
    baseDesc = es ? 'Cuantificador: 1 o más veces' : 'Quantifier: 1 or more times';
  } else if (core === '?') {
    baseDesc = es ? 'Cuantificador: opcional (0 o 1 vez)' : 'Quantifier: optional (0 or 1 time)';
  } else {
    const m = /^\{(\d+)(?:,(\d*))?\}$/.exec(core);
    if (m) {
      const min = m[1];
      const max = m[2];
      if (max === undefined) {
        baseDesc = es ? `Cuantificador: exactamente ${min} veces` : `Quantifier: exactly ${min} times`;
      } else if (max === '') {
        baseDesc = es ? `Cuantificador: ${min} o más veces` : `Quantifier: ${min} or more times`;
      } else {
        baseDesc = es
          ? `Cuantificador: entre ${min} y ${max} veces`
          : `Quantifier: between ${min} and ${max} times`;
      }
    } else {
      baseDesc = es ? `Cuantificador ${raw}` : `Quantifier ${raw}`;
    }
  }

  if (lazy) {
    baseDesc += es
      ? ' (perezoso: coincide lo mínimo posible)'
      : ' (lazy: matches as few characters as possible)';
  } else {
    baseDesc += es ? ' (codicioso)' : ' (greedy)';
  }
  return { baseDesc, lazy };
}

function readEscapeToken(pattern: string, start: number): { raw: string; nextIdx: number } {
  if (start + 1 >= pattern.length) {
    return { raw: pattern.slice(start), nextIdx: pattern.length };
  }
  const c = pattern[start + 1];
  if (c === 'k' && pattern[start + 2] === '<') {
    const close = pattern.indexOf('>', start + 3);
    if (close >= 0) {
      return { raw: pattern.slice(start, close + 1), nextIdx: close + 1 };
    }
  }
  if ((c === 'u' || c === 'p' || c === 'P') && pattern[start + 2] === '{') {
    const close = pattern.indexOf('}', start + 3);
    if (close >= 0) {
      return { raw: pattern.slice(start, close + 1), nextIdx: close + 1 };
    }
  }
  if (c === 'x' && /^[0-9a-fA-F]{2}/.test(pattern.slice(start + 2, start + 4))) {
    return { raw: pattern.slice(start, start + 4), nextIdx: start + 4 };
  }
  if (c === 'u' && /^[0-9a-fA-F]{4}/.test(pattern.slice(start + 2, start + 6))) {
    return { raw: pattern.slice(start, start + 6), nextIdx: start + 6 };
  }
  return { raw: pattern.slice(start, start + 2), nextIdx: start + 2 };
}

function findMatchingGroupClose(pattern: string, openIdx: number): number {
  let depth = 1;
  let inCharClass = false;
  let i = openIdx + 1;

  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (inCharClass) {
      if (ch === ']') inCharClass = false;
      i++;
      continue;
    }
    if (ch === '[') {
      inCharClass = true;
      i++;
      continue;
    }
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }

  return pattern.length;
}

export function explainRegexPattern(
  pattern: string,
  flags: RegexFlagsConfig,
  locale: 'en' | 'es' = 'en'
): RegexExplanationToken[] {
  if (!pattern) return [];

  const es = locale === 'es';
  let captureCounter = 0;

  const parseRange = (
    startOffset: number,
    endOffset: number
  ): RegexExplanationToken[] => {
    const tokens: RegexExplanationToken[] = [];
    let i = startOffset;

    while (i < endOffset) {
      const ch = pattern[i];

      if (ch === '^') {
        tokens.push({
          raw: '^',
          start: i,
          end: i + 1,
          category: 'anchor',
          description: flags.multiline
            ? es
              ? 'Ancla: inicio de línea (bandera m)'
              : 'Anchor: start of line (multiline flag)'
            : es
              ? 'Ancla: inicio de la cadena'
              : 'Anchor: start of string',
        });
        i++;
        continue;
      }

      if (ch === '$') {
        tokens.push({
          raw: '$',
          start: i,
          end: i + 1,
          category: 'anchor',
          description: flags.multiline
            ? es
              ? 'Ancla: fin de línea (bandera m)'
              : 'Anchor: end of line (multiline flag)'
            : es
              ? 'Ancla: fin de la cadena'
              : 'Anchor: end of string',
        });
        i++;
        continue;
      }

      if (ch === '|') {
        tokens.push({
          raw: '|',
          start: i,
          end: i + 1,
          category: 'alternation',
          description: es ? 'Alternancia (O lógico)' : 'Alternation branch (OR)',
        });
        i++;
        continue;
      }

      if (ch === '.') {
        tokens.push({
          raw: '.',
          start: i,
          end: i + 1,
          category: 'escape',
          description: flags.dotAll
            ? es
              ? 'Comodín: cualquier carácter incluido salto de línea'
              : 'Wildcard: matches any character including newline (dotAll)'
            : es
              ? 'Comodín: cualquier carácter excepto salto de línea'
              : 'Wildcard: matches any character except newline',
        });
        i++;
        continue;
      }

      if (ch === '\\') {
        const esc = readEscapeToken(pattern, i);
        tokens.push({
          raw: esc.raw,
          start: i,
          end: esc.nextIdx,
          category: 'escape',
          description: describeEscape(esc.raw, locale),
        });
        i = esc.nextIdx;
        continue;
      }

      if (ch === '[') {
        const start = i;
        i++;
        if (i < endOffset && pattern[i] === '^') i++;
        if (i < endOffset && pattern[i] === ']') i++;
        while (i < endOffset && pattern[i] !== ']') {
          if (pattern[i] === '\\') i += 2;
          else i++;
        }
        const closePos = i < endOffset && pattern[i] === ']' ? i + 1 : endOffset;
        const raw = pattern.slice(start, closePos);
        const negated = raw.startsWith('[^');
        const body = negated ? raw.slice(2, -1) : raw.slice(1, raw.endsWith(']') ? -1 : undefined);
        tokens.push({
          raw,
          start,
          end: closePos,
          category: 'char_class',
          description: negated
            ? es
              ? `Clase negada: coincide con cualquier carácter EXCEPTO [${body}]`
              : `Negated character class: any character NOT in [${body}]`
            : es
              ? `Clase de caracteres: coincide con cualquiera de [${body}]`
              : `Character class: matches any character in [${body}]`,
        });
        i = closePos;
        continue;
      }

      if (ch === '(') {
        const closeParen = findMatchingGroupClose(pattern, i);
        const fullEnd = closeParen < endOffset ? closeParen + 1 : endOffset;
        const innerEnd = Math.min(closeParen, endOffset);
        let bodyStart = i + 1;
        let desc = '';

        const rest = pattern.slice(i);
        if (rest.startsWith('(?<=')) {
          bodyStart = i + 4;
          desc = es
            ? 'Aserción retrospectiva positiva (lookbehind)'
            : 'Positive lookbehind assertion';
        } else if (rest.startsWith('(?<!')) {
          bodyStart = i + 4;
          desc = es
            ? 'Aserción retrospectiva negativa (lookbehind)'
            : 'Negative lookbehind assertion';
        } else if (rest.startsWith('(?=')) {
          bodyStart = i + 3;
          desc = es
            ? 'Aserción anticipada positiva (lookahead)'
            : 'Positive lookahead assertion';
        } else if (rest.startsWith('(?!')) {
          bodyStart = i + 3;
          desc = es
            ? 'Aserción anticipada negativa (lookahead)'
            : 'Negative lookahead assertion';
        } else if (rest.startsWith('(?:')) {
          bodyStart = i + 3;
          desc = es ? 'Grupo sin captura (agrupación)' : 'Non-capturing group';
        } else {
          const namedMatch = /^\(\?<([A-Za-z_][A-Za-z0-9_]*)>/.exec(rest);
          if (namedMatch) {
            captureCounter++;
            bodyStart = i + namedMatch[0].length;
            desc = es
              ? `Grupo nombrado "${namedMatch[1]}" (#${captureCounter})`
              : `Named capturing group "${namedMatch[1]}" (#${captureCounter})`;
          } else {
            captureCounter++;
            desc = es
              ? `Grupo de captura #${captureCounter}`
              : `Capturing group #${captureCounter}`;
          }
        }

        const children =
          bodyStart < innerEnd ? parseRange(bodyStart, innerEnd) : [];
        tokens.push({
          raw: pattern.slice(i, fullEnd),
          start: i,
          end: fullEnd,
          category: 'group',
          description: desc,
          children,
        });
        i = fullEnd;
        continue;
      }

      if (ch === '*' || ch === '+' || ch === '?') {
        const nextIsLazy = i + 1 < endOffset && pattern[i + 1] === '?';
        const qEnd = nextIsLazy ? i + 2 : i + 1;
        const raw = pattern.slice(i, qEnd);
        tokens.push({
          raw,
          start: i,
          end: qEnd,
          category: 'quantifier',
          description: describeQuantifier(raw, locale).baseDesc,
        });
        i = qEnd;
        continue;
      }

      if (ch === '{') {
        const braceMatch = /^\{\d+(?:,\d*)?\}\??/.exec(pattern.slice(i, endOffset));
        if (braceMatch) {
          const qEnd = i + braceMatch[0].length;
          tokens.push({
            raw: braceMatch[0],
            start: i,
            end: qEnd,
            category: 'quantifier',
            description: describeQuantifier(braceMatch[0], locale).baseDesc,
          });
          i = qEnd;
          continue;
        }
      }

      // Accumulate contiguous plain literal characters (stop before quantifiers so single atom stays crisp)
      const litStart = i;
      i++;
      while (
        i < endOffset &&
        !'^$|.*+?()[]{}\\'.includes(pattern[i]) &&
        !(
          i + 1 < endOffset &&
          '*+?{'.includes(pattern[i + 1]) &&
          i > litStart
        )
      ) {
        i++;
      }
      const litRaw = pattern.slice(litStart, i);
      tokens.push({
        raw: litRaw,
        start: litStart,
        end: i,
        category: 'literal',
        description: es
          ? `Texto literal "${litRaw}"`
          : `Literal sequence "${litRaw}"`,
      });
    }

    return tokens;
  };

  return parseRange(0, pattern.length);
}

export function generateRegexCode(
  pattern: string,
  flags: RegexFlagsConfig,
  language: RegexCodeLanguage,
  replacement = '',
  runReplace = false
): string {
  const flagsStr = buildFlagsString(flags);
  const patternJson = JSON.stringify(pattern);
  const replacementJson = JSON.stringify(replacement);

  switch (language) {
    case 'javascript': {
      const lines = [
        `const regex = new RegExp(${patternJson}, '${flagsStr}');`,
        `const matches = Array.from(inputText.matchAll(regex));`,
      ];
      if (runReplace || replacement) {
        lines.push(`const replaced = inputText.replace(regex, ${replacementJson});`);
      }
      return lines.join('\n');
    }

    case 'typescript': {
      const lines = [
        `const regex: RegExp = new RegExp(${patternJson}, '${flagsStr}');`,
        `const matches: RegExpExecArray[] = Array.from(inputText.matchAll(regex));`,
      ];
      if (runReplace || replacement) {
        lines.push(
          `const replaced: string = inputText.replace(regex, ${replacementJson});`
        );
      }
      return lines.join('\n');
    }

    case 'python': {
      // Translate JS named groups (?<name>...) to Python (?P<name>...)
      const pyPattern = pattern.replace(/\(\?<([A-Za-z_][A-Za-z0-9_]*)>/g, '(?P<$1>');
      const pyLiteral = !pyPattern.includes('"')
        ? `r"${pyPattern}"`
        : !pyPattern.includes("'")
          ? `r'${pyPattern}'`
          : JSON.stringify(pyPattern);
      const pyFlags: string[] = [];
      if (flags.ignoreCase) pyFlags.push('re.IGNORECASE');
      if (flags.multiline) pyFlags.push('re.MULTILINE');
      if (flags.dotAll) pyFlags.push('re.DOTALL');
      const flagArg = pyFlags.length > 0 ? `, ${pyFlags.join(' | ')}` : '';
      const lines = [
        `import re`,
        `pattern = re.compile(${pyLiteral}${flagArg})`,
        `matches = [m.groupdict() or m.group(0) for m in pattern.finditer(input_text)]`,
      ];
      if (runReplace || replacement) {
        lines.push(`replaced = pattern.sub(${replacementJson}, input_text)`);
      }
      return lines.join('\n');
    }

    case 'go': {
      let inlinePrefix = '';
      if (flags.ignoreCase) inlinePrefix += 'i';
      if (flags.multiline) inlinePrefix += 'm';
      if (flags.dotAll) inlinePrefix += 's';
      const goPattern = inlinePrefix ? `(?${inlinePrefix})${pattern}` : pattern;
      const usesUnsupportedRe2 = /\(\?[<!=]|\\[1-9]|\\k</.test(pattern);
      const goLit = !goPattern.includes('`')
        ? `\`${goPattern}\``
        : JSON.stringify(goPattern);
      const lines: string[] = [];
      if (usesUnsupportedRe2) {
        lines.push(
          `// Note: Go RE2 does not support lookarounds (?=, ?<=) or backreferences.`
        );
      }
      lines.push(`re := regexp.MustCompile(${goLit})`);
      lines.push(`matches := re.FindAllStringSubmatch(inputText, -1)`);
      if (runReplace || replacement) {
        lines.push(`replaced := re.ReplaceAllString(inputText, ${replacementJson})`);
      }
      return lines.join('\n');
    }

    case 'java': {
      const javaFlags: string[] = [];
      if (flags.ignoreCase) javaFlags.push('Pattern.CASE_INSENSITIVE');
      if (flags.multiline) javaFlags.push('Pattern.MULTILINE');
      if (flags.dotAll) javaFlags.push('Pattern.DOTALL');
      const flagExpr = javaFlags.length > 0 ? `, ${javaFlags.join(' | ')}` : '';
      const lines = [
        `import java.util.regex.*;`,
        `Pattern pattern = Pattern.compile(${patternJson}${flagExpr});`,
        `Matcher matcher = pattern.matcher(inputText);`,
        `while (matcher.find()) { System.out.println(matcher.group()); }`,
      ];
      if (runReplace || replacement) {
        lines.push(`String replaced = matcher.replaceAll(${replacementJson});`);
      }
      return lines.join('\n');
    }
  }
}
