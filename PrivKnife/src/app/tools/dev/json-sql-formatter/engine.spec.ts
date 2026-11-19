import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateJsonPath,
  formatAndSortJson,
  formatSql,
  generateTypeScriptInterfaces,
  generateZodSchema,
  jsonToYaml,
  parseJsonWithLocation,
  parseYamlWithLocation,
  processFormatterInput,
} from './engine';
import {
  PROTOTYPE_POLLUTION_JSON,
  SAMPLE_JSON_DOC,
  SAMPLE_SQL_QUERY,
  SAMPLE_YAML_DOC,
} from './test-fixtures';
import { DEFAULT_JSON_SQL_OPTIONS } from './types';

describe('JSON, SQL & YAML Formatter Engine (Seam 1A - Slice 1: JSON, JSONPath, Key Sort & TS/Zod Inference)', () => {
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

  it('Vector 1: returns exact line and column diagnostics for malformed JSON', () => {
    const singleLine = parseJsonWithLocation('{"a": 1,}');
    expect(singleLine.diagnostic.valid).toBe(false);
    expect(singleLine.diagnostic.line).toBe(1);
    expect(singleLine.diagnostic.column).toBeGreaterThanOrEqual(8);
    expect(singleLine.diagnostic.snippet).toContain('^');

    const multiLine = parseJsonWithLocation('{\n  "a": 1,\n  "b": [1, ]\n}');
    expect(multiLine.diagnostic.valid).toBe(false);
    expect(multiLine.diagnostic.line).toBe(3);
    expect(multiLine.diagnostic.column).toBeGreaterThanOrEqual(9);
  });

  it('formats with 2/4 spaces or tabs, minifies, recursively sorts keys, and resists __proto__ pollution', () => {
    const parsed = parseJsonWithLocation(PROTOTYPE_POLLUTION_JSON);
    expect(parsed.diagnostic.valid).toBe(true);

    const sorted2 = formatAndSortJson(PROTOTYPE_POLLUTION_JSON, {
      indentType: '2spaces',
      sortKeys: true,
      minify: false,
    });
    expect(sorted2.diagnostic.valid).toBe(true);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(({} as Record<string, unknown>)['pwned']).toBeUndefined();

    const firstKeyIdx = sorted2.outputText.indexOf('"__proto__"');
    const secondKeyIdx = sorted2.outputText.indexOf('"constructor"');
    const thirdKeyIdx = sorted2.outputText.indexOf('"safe"');
    expect(firstKeyIdx).toBeGreaterThan(-1);
    expect(secondKeyIdx).toBeGreaterThan(firstKeyIdx);
    expect(thirdKeyIdx).toBeGreaterThan(secondKeyIdx);

    const tabbed = formatAndSortJson('{"b":2,"a":1}', {
      indentType: 'tab',
      sortKeys: true,
      minify: false,
    });
    expect(tabbed.outputText).toContain('\t"a": 1');

    const minified = formatAndSortJson('{\n  "b": 2,\n  "a": 1\n}', {
      indentType: '2spaces',
      sortKeys: false,
      minify: true,
    });
    expect(minified.outputText).toBe('{"b":2,"a":1}');
  });

  it('evaluates JSONPath queries including wildcards, negative indexes, bracket keys, and recursive descent', () => {
    const parsed = parseJsonWithLocation(SAMPLE_JSON_DOC);
    expect(parsed.diagnostic.valid).toBe(true);

    const emails = evaluateJsonPath(parsed.value, '$.users[*].email');
    expect(emails.error).toBeUndefined();
    expect(emails.matches).toEqual(['ada@example.test', 'grace@example.test']);

    const lastUser = evaluateJsonPath(parsed.value, '$.users[-1].role');
    expect(lastUser.matches).toEqual(['auditor']);

    const header = evaluateJsonPath(parsed.value, "$['headers']['content-type']");
    expect(header.matches).toEqual(['application/json']);

    const allIds = evaluateJsonPath(parsed.value, '$..id');
    expect(allIds.matches).toEqual([101, 102]);

    const invalid = evaluateJsonPath(parsed.value, 'users[unclosed');
    expect(invalid.error).toBeTruthy();
  });

  it('Vector 2: infers TypeScript interfaces and Zod schemas with optional/nullable merging and hyphenated key quoting', () => {
    const vectorInput = [
      { id: 1, name: 'A', 'content-type': 'application/json' },
      { id: 2, name: null, tag: 'x', 'content-type': 'text/plain' },
    ];

    const ts = generateTypeScriptInterfaces(vectorInput, 'user_record');
    expect(ts).toContain('export interface UserRecordItem');
    expect(ts).toContain('id: number;');
    expect(ts).toContain('name: string | null;');
    expect(ts).toContain('tag?: string;');
    expect(ts).toContain('"content-type": string;');

    const zod = generateZodSchema(vectorInput, 'user_record');
    expect(zod).toContain("import { z } from 'zod';");
    expect(zod).toContain('export const UserRecordItemSchema = z.object({');
    expect(zod).toContain('id: z.number()');
    expect(zod).toContain('z.string().nullable()');
    expect(zod).toContain('z.string().optional()');
    expect(zod).toContain('"content-type": z.string()');
    expect(zod).toContain('export const UserRecordSchema = z.array(UserRecordItemSchema);');

    const emptyTs = generateTypeScriptInterfaces([], 'EmptyList');
    expect(emptyTs).toContain('unknown[]');
    const emptyZod = generateZodSchema([], 'EmptyList');
    expect(emptyZod).toContain('z.array(z.unknown())');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  describe('Seam 1B - Slice 2: Multi-Dialect SQL, Lossless YAML & Unified Dispatcher', () => {
    it('Vector 3: formats SQL across dialects, preserves strings/comments/identifiers, minifies, and flags unclosed tokens', () => {
      const sqlVector =
        "select 'from where' as txt, -- select from\n /* where */ \"select\" from users where id = $1";
      const upperRes = formatSql(sqlVector, {
        dialect: 'postgresql',
        keywordCase: 'upper',
        indentType: '2spaces',
        minify: false,
      });
      expect(upperRes.diagnostic.valid).toBe(true);
      expect(upperRes.outputText).toContain('SELECT');
      expect(upperRes.outputText).toContain("'from where'");
      expect(upperRes.outputText).toContain('-- select from');
      expect(upperRes.outputText).toContain('/* where */');
      expect(upperRes.outputText).toContain('"select"');
      expect(upperRes.outputText).toContain('$1');
      expect(upperRes.outputText).toContain('\nFROM\n');
      expect(upperRes.outputText).toContain('\nWHERE\n');

      // Preserve string literal when lowercasing keywords
      const lowerRes = formatSql("SELECT 'FROM WHERE' AS msg FROM [order]", {
        dialect: 'tsql',
        keywordCase: 'lower',
        indentType: '2spaces',
        minify: false,
      });
      expect(lowerRes.outputText).toContain("'FROM WHERE'");
      expect(lowerRes.outputText).toContain('select');
      expect(lowerRes.outputText).toContain('[order]');

      // Dollar-quoted PostgreSQL block preserved untouched + CTE formatting
      const pgRes = formatSql(
        SAMPLE_SQL_QUERY + "\nSELECT $$SELECT FROM WHERE$$ AS raw_block;",
        {
          dialect: 'postgresql',
          keywordCase: 'upper',
          indentType: '2spaces',
          minify: false,
        }
      );
      expect(pgRes.diagnostic.valid).toBe(true);
      expect(pgRes.outputText).toContain('$$SELECT FROM WHERE$$');
      expect(pgRes.outputText).toContain('LEFT OUTER JOIN');

      // Minify compresses whitespace while keeping literals intact
      const mini = formatSql(sqlVector, {
        dialect: 'mysql',
        keywordCase: 'upper',
        indentType: '2spaces',
        minify: true,
      });
      expect(mini.diagnostic.valid).toBe(true);
      expect(mini.outputText).toContain("'from where'");
      expect(mini.outputText).not.toContain('\n');

      // Syntax errors with line/column
      const badQuote = formatSql("SELECT 'unterminated\nFROM t", {
        dialect: 'sql',
        keywordCase: 'upper',
        indentType: '2spaces',
        minify: false,
      });
      expect(badQuote.diagnostic.valid).toBe(false);
      expect(badQuote.diagnostic.line).toBe(1);

      const badParen = formatSql('SELECT (a + b FROM t', {
        dialect: 'sql',
        keywordCase: 'upper',
        indentType: '2spaces',
        minify: false,
      });
      expect(badParen.diagnostic.valid).toBe(false);
    });

    it('Vector 4: performs lossless JSON -> YAML -> JSON round-trip with ambiguous scalars and __proto__ safety', () => {
      const complexPayload = {
        service: 'privknife',
        enabled: true,
        disabled: false,
        emptyVal: null,
        pi: 3.14,
        ambiguousStrings: ['true', 'false', 'null', '~', 'yes', '42', 'a: b', 'line1\nline2', ''],
        nestedList: [
          { id: 1, ports: [80, 443], emptyObj: {}, emptyArr: [] },
          { id: 2, note: 'contains # hash' },
        ],
      };

      const yamlText = jsonToYaml(complexPayload, '2spaces');
      expect(yamlText).toContain('"true"');
      expect(yamlText).toContain('"42"');

      const parsedBack = parseYamlWithLocation(yamlText);
      expect(parsedBack.diagnostic.valid).toBe(true);
      expect(parsedBack.value).toEqual(complexPayload);

      // Prototype pollution YAML guard
      const protoYaml = "__proto__:\n  polluted: true\nsafe: ok\n";
      const parsedProto = parseYamlWithLocation(protoYaml);
      expect(parsedProto.diagnostic.valid).toBe(true);
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('parses multi-line block scalars & flow YAML collections and flags tab/unclosed errors with line & column', () => {
      const sample = parseYamlWithLocation(SAMPLE_YAML_DOC);
      expect(sample.diagnostic.valid).toBe(true);
      const val = sample.value as Record<string, any>;
      expect(val['kind']).toBe('Deployment');
      expect(val['spec']['ports']).toEqual([80, 443]);
      expect(val['spec']['csp']).toContain("default-src 'self';");
      expect(val['spec']['containers'][0]['name']).toBe('web');

      const tabErr = parseYamlWithLocation('root:\n\tbad: 1');
      expect(tabErr.diagnostic.valid).toBe(false);
      expect(tabErr.diagnostic.line).toBe(2);

      const bracketErr = parseYamlWithLocation('ports: [80, 443\nnext: 1');
      expect(bracketErr.diagnostic.valid).toBe(false);
      expect(bracketErr.diagnostic.line).toBe(1);
    });

    it('dispatches unified processFormatterInput cleanly across JSON views, SQL, and YAML with zero network calls', async () => {
      const tsRes = await processFormatterInput(SAMPLE_JSON_DOC, {
        ...DEFAULT_JSON_SQL_OPTIONS,
        language: 'json',
        jsonOutputView: 'typescript',
        rootTypeName: 'GatewayPayload',
      });
      expect(tsRes.success).toBe(true);
      expect(tsRes.outputText).toContain('export interface GatewayPayload');

      const jpRes = await processFormatterInput(SAMPLE_JSON_DOC, {
        ...DEFAULT_JSON_SQL_OPTIONS,
        language: 'json',
        jsonOutputView: 'formatted',
        jsonPathQuery: '$.users[*].id',
      });
      expect(jpRes.success).toBe(true);
      expect(JSON.parse(jpRes.outputText)).toEqual([101, 102]);

      const yamlToJsonRes = await processFormatterInput(SAMPLE_YAML_DOC, {
        ...DEFAULT_JSON_SQL_OPTIONS,
        language: 'yaml',
        yamlOutputMode: 'json',
      });
      expect(yamlToJsonRes.success).toBe(true);
      expect(JSON.parse(yamlToJsonRes.outputText)['kind']).toBe('Deployment');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });
});
