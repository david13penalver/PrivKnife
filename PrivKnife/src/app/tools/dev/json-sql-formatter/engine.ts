import {
  DEFAULT_JSON_SQL_OPTIONS,
  FormatterDeps,
  JsonSqlFormatterOptions,
  JsonSqlFormatterResult,
  JsonTreeRow,
  SqlDialect,
  SyntaxDiagnostic,
} from './types';

function defineSafeProp(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function getIndentUnit(indentType: '2spaces' | '4spaces' | 'tab'): string {
  if (indentType === '4spaces') return '    ';
  if (indentType === 'tab') return '\t';
  return '  ';
}

function offsetToLineCol(
  source: string,
  offset: number
): { line: number; column: number; snippet: string } {
  const safeOffset = Math.max(0, Math.min(source.length, offset));
  const prefix = source.slice(0, safeOffset);
  const lines = prefix.split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  const allLines = source.split('\n');
  const targetLine = allLines[line - 1] ?? '';
  const snippet = `${targetLine}\n${' '.repeat(Math.max(0, column - 1))}^`;
  return { line, column, snippet };
}

function scanFallbackJsonErrorOffset(source: string): number {
  const len = source.length;
  let i = 0;
  const skipWs = () => {
    while (i < len && /\s/.test(source[i])) i++;
  };

  skipWs();
  if (i >= len) return 0;

  const stack: Array<'{' | '['> = [];
  let expectValue = true;

  while (i < len) {
    skipWs();
    if (i >= len) break;
    const ch = source[i];

    if (ch === '"') {
      if (!expectValue && stack[stack.length - 1] === undefined) return i;
      i++;
      while (i < len && source[i] !== '"') {
        if (source[i] === '\\') i += 2;
        else i++;
      }
      if (i >= len) return len - 1;
      i++;
      expectValue = false;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      i++;
      expectValue = true;
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (expectValue && source.slice(0, i).trimEnd().endsWith(',')) {
        return i;
      }
      const open = stack.pop();
      if ((ch === '}' && open !== '{') || (ch === ']' && open !== '[')) {
        return i;
      }
      i++;
      expectValue = false;
      continue;
    }

    if (ch === ',' || ch === ':') {
      if (expectValue) return i;
      i++;
      expectValue = true;
      continue;
    }

    i++;
    expectValue = false;
  }

  return Math.max(0, len - 1);
}

export function parseJsonWithLocation(source: string): {
  diagnostic: SyntaxDiagnostic;
  value?: unknown;
} {
  if (!source || !source.trim()) {
    return {
      diagnostic: {
        valid: false,
        message: 'Input JSON text is empty.',
        line: 1,
        column: 1,
      },
    };
  }

  try {
    const value = JSON.parse(source);
    return { diagnostic: { valid: true }, value };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON syntax.';
    const lcMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(msg);
    if (lcMatch) {
      const line = Number(lcMatch[1]);
      const col = Number(lcMatch[2]);
      const lines = source.split('\n');
      const lineText = lines[line - 1] ?? '';
      return {
        diagnostic: {
          valid: false,
          message: msg,
          line,
          column: col,
          snippet: `${lineText}\n${' '.repeat(Math.max(0, col - 1))}^`,
        },
      };
    }

    const posMatch = /position\s+(\d+)/i.exec(msg);
    const offset = posMatch
      ? Number(posMatch[1])
      : scanFallbackJsonErrorOffset(source);
    const loc = offsetToLineCol(source, offset);
    return {
      diagnostic: {
        valid: false,
        message: msg,
        line: loc.line,
        column: loc.column,
        snippet: loc.snippet,
      },
    };
  }
}

export function sortJsonValueKeys(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => sortJsonValueKeys(item));
  }
  if (val !== null && typeof val === 'object') {
    const record = val as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      defineSafeProp(out, k, sortJsonValueKeys(record[k]));
    }
    return out;
  }
  return val;
}

export function formatAndSortJson(
  source: string,
  options: {
    indentType: '2spaces' | '4spaces' | 'tab';
    sortKeys: boolean;
    minify: boolean;
  }
): JsonSqlFormatterResult {
  const started = performance.now();
  const parsed = parseJsonWithLocation(source);
  const inputBytes = new TextEncoder().encode(source).byteLength;

  if (!parsed.diagnostic.valid) {
    return {
      success: false,
      diagnostic: parsed.diagnostic,
      outputText: '',
      stats: {
        inputBytes,
        outputBytes: 0,
        lineCount: 0,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      },
    };
  }

  const normalized = options.sortKeys
    ? sortJsonValueKeys(parsed.value)
    : parsed.value;
  const formatted = options.minify
    ? JSON.stringify(normalized)
    : JSON.stringify(normalized, null, getIndentUnit(options.indentType));

  const outputBytes = new TextEncoder().encode(formatted).byteLength;
  return {
    success: true,
    diagnostic: { valid: true },
    outputText: formatted,
    parsedValue: normalized,
    stats: {
      inputBytes,
      outputBytes,
      lineCount: formatted ? formatted.split('\n').length : 0,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    },
  };
}

// ============================================================================
// Lightweight Safe JSONPath Evaluator
// ============================================================================

type PathStep =
  | { kind: 'prop'; key: string; recursive: boolean }
  | { kind: 'wildcard'; recursive: boolean }
  | { kind: 'indexes'; indexes: number[]; recursive: boolean };

function tokenizeJsonPath(path: string): { steps?: PathStep[]; error?: string } {
  const trimmed = (path ?? '').trim();
  if (!trimmed.startsWith('$')) {
    return { error: 'JSONPath expression must start with $' };
  }

  const steps: PathStep[] = [];
  let i = 1;

  while (i < trimmed.length) {
    let recursive = false;
    if (trimmed[i] === '.' && trimmed[i + 1] === '.') {
      recursive = true;
      i += 2;
    } else if (trimmed[i] === '.') {
      i += 1;
      if (i >= trimmed.length) {
        return { error: 'Trailing dot in JSONPath expression.' };
      }
    }

    if (trimmed[i] === '*') {
      steps.push({ kind: 'wildcard', recursive });
      i += 1;
      continue;
    }

    if (trimmed[i] === '[') {
      const closeIdx = trimmed.indexOf(']', i + 1);
      if (closeIdx < 0) {
        return { error: 'Unclosed bracket [ in JSONPath expression.' };
      }
      const inside = trimmed.slice(i + 1, closeIdx).trim();
      i = closeIdx + 1;

      if (inside === '*') {
        steps.push({ kind: 'wildcard', recursive });
        continue;
      }

      if (
        (inside.startsWith("'") && inside.endsWith("'")) ||
        (inside.startsWith('"') && inside.endsWith('"'))
      ) {
        steps.push({
          kind: 'prop',
          key: inside.slice(1, -1),
          recursive,
        });
        continue;
      }

      const idxParts = inside.split(',').map((s) => s.trim());
      const indexes: number[] = [];
      for (const p of idxParts) {
        if (!/^-?\d+$/.test(p)) {
          return { error: `Unsupported JSONPath bracket token: [${inside}]` };
        }
        indexes.push(Number(p));
      }
      steps.push({ kind: 'indexes', indexes, recursive });
      continue;
    }

    // Bare property name up to next `.` or `[`
    const start = i;
    while (i < trimmed.length && trimmed[i] !== '.' && trimmed[i] !== '[') {
      i += 1;
    }
    const key = trimmed.slice(start, i);
    if (!key) {
      return { error: `Unexpected character "${trimmed[i]}" at offset ${i}.` };
    }
    steps.push({ kind: 'prop', key, recursive });
  }

  return { steps };
}

function collectDescendantValues(root: unknown): unknown[] {
  const out: unknown[] = [root];
  if (Array.isArray(root)) {
    for (const item of root) out.push(...collectDescendantValues(item));
  } else if (root !== null && typeof root === 'object') {
    const rec = root as Record<string, unknown>;
    for (const k of Object.keys(rec)) {
      out.push(...collectDescendantValues(rec[k]));
    }
  }
  return out;
}

function applyJsonPathStep(nodes: unknown[], step: PathStep): unknown[] {
  const candidates = step.recursive
    ? nodes.flatMap((n) => collectDescendantValues(n))
    : nodes;

  const out: unknown[] = [];
  for (const node of candidates) {
    if (step.kind === 'wildcard') {
      if (Array.isArray(node)) {
        out.push(...node);
      } else if (node !== null && typeof node === 'object') {
        const rec = node as Record<string, unknown>;
        for (const k of Object.keys(rec)) out.push(rec[k]);
      }
      continue;
    }

    if (step.kind === 'indexes') {
      if (Array.isArray(node)) {
        for (const rawIdx of step.indexes) {
          const resolvedIdx = rawIdx < 0 ? node.length + rawIdx : rawIdx;
          if (resolvedIdx >= 0 && resolvedIdx < node.length) {
            out.push(node[resolvedIdx]);
          }
        }
      }
      continue;
    }

    if (
      node !== null &&
      typeof node === 'object' &&
      !Array.isArray(node) &&
      Object.prototype.hasOwnProperty.call(node, step.key)
    ) {
      out.push((node as Record<string, unknown>)[step.key]);
    }
  }
  return out;
}

export function evaluateJsonPath(
  rootValue: unknown,
  path: string
): { matches: unknown[]; error?: string } {
  const tok = tokenizeJsonPath(path);
  if (tok.error || !tok.steps) {
    return { matches: [], error: tok.error || 'Invalid JSONPath query.' };
  }

  let current: unknown[] = [rootValue];
  for (const step of tok.steps) {
    current = applyJsonPathStep(current, step);
  }
  return { matches: current };
}

// ============================================================================
// Recursive TypeScript & Zod Schema Generator (__proto__-safe)
// ============================================================================

type InferredType =
  | { kind: 'primitive'; type: 'string' | 'number' | 'boolean' | 'null' | 'unknown' }
  | { kind: 'array'; element: InferredType }
  | { kind: 'object'; fields: Map<string, { type: InferredType; optional: boolean }> }
  | { kind: 'union'; members: InferredType[] };

function sanitizePascalName(rawName: string): string {
  const words = String(rawName ?? 'Root')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'Root';
  const joined = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return /^\d/.test(joined) ? `Root${joined}` : joined;
}

function formatPropertyKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) &&
    key !== '__proto__' &&
    key !== 'constructor'
    ? key
    : JSON.stringify(key);
}

function flattenUnion(types: InferredType[]): InferredType[] {
  const flat: InferredType[] = [];
  for (const t of types) {
    if (t.kind === 'union') {
      flat.push(...flattenUnion(t.members));
    } else {
      flat.push(t);
    }
  }
  return flat;
}

function inferTypeFromValue(val: unknown): InferredType {
  if (val === null) return { kind: 'primitive', type: 'null' };
  if (typeof val === 'string') return { kind: 'primitive', type: 'string' };
  if (typeof val === 'number') return { kind: 'primitive', type: 'number' };
  if (typeof val === 'boolean') return { kind: 'primitive', type: 'boolean' };

  if (Array.isArray(val)) {
    if (val.length === 0) {
      return { kind: 'array', element: { kind: 'primitive', type: 'unknown' } };
    }
    let acc = inferTypeFromValue(val[0]);
    for (let i = 1; i < val.length; i++) {
      acc = mergeInferredTypes(acc, inferTypeFromValue(val[i]));
    }
    return { kind: 'array', element: acc };
  }

  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    const fields = new Map<string, { type: InferredType; optional: boolean }>();
    for (const k of Object.keys(rec)) {
      fields.set(k, { type: inferTypeFromValue(rec[k]), optional: false });
    }
    return { kind: 'object', fields };
  }

  return { kind: 'primitive', type: 'unknown' };
}

function typeSignatureKey(t: InferredType): string {
  if (t.kind === 'primitive') return `p:${t.type}`;
  if (t.kind === 'array') return `a:${typeSignatureKey(t.element)}`;
  if (t.kind === 'object') return 'object';
  return 'union';
}

function mergeInferredTypes(a: InferredType, b: InferredType): InferredType {
  if (a.kind === 'primitive' && a.type === 'unknown') return b;
  if (b.kind === 'primitive' && b.type === 'unknown') return a;

  if (a.kind === 'primitive' && b.kind === 'primitive' && a.type === b.type) {
    return a;
  }

  if (a.kind === 'array' && b.kind === 'array') {
    return { kind: 'array', element: mergeInferredTypes(a.element, b.element) };
  }

  if (a.kind === 'object' && b.kind === 'object') {
    const merged = new Map<string, { type: InferredType; optional: boolean }>();
    for (const [k, fieldA] of a.fields.entries()) {
      const fieldB = b.fields.get(k);
      if (fieldB) {
        merged.set(k, {
          type: mergeInferredTypes(fieldA.type, fieldB.type),
          optional: fieldA.optional || fieldB.optional,
        });
      } else {
        merged.set(k, { type: fieldA.type, optional: true });
      }
    }
    for (const [k, fieldB] of b.fields.entries()) {
      if (!a.fields.has(k)) {
        merged.set(k, { type: fieldB.type, optional: true });
      }
    }
    return { kind: 'object', fields: merged };
  }

  const rawMembers = flattenUnion([a, b]);
  const deduped: InferredType[] = [];
  const seenPrim = new Set<string>();
  let mergedObj: Extract<InferredType, { kind: 'object' }> | null = null;
  let mergedArr: Extract<InferredType, { kind: 'array' }> | null = null;

  for (const m of rawMembers) {
    if (m.kind === 'primitive') {
      if (!seenPrim.has(m.type)) {
        seenPrim.add(m.type);
        deduped.push(m);
      }
    } else if (m.kind === 'object') {
      mergedObj = mergedObj
        ? (mergeInferredTypes(mergedObj, m) as Extract<InferredType, { kind: 'object' }>)
        : m;
    } else if (m.kind === 'array') {
      mergedArr = mergedArr
        ? (mergeInferredTypes(mergedArr, m) as Extract<InferredType, { kind: 'array' }>)
        : m;
    }
  }
  if (mergedArr) deduped.push(mergedArr);
  if (mergedObj) deduped.push(mergedObj);

  // Deduplicate identical signature keys
  const finalMembers: InferredType[] = [];
  const seenSig = new Set<string>();
  for (const m of deduped) {
    const sig = typeSignatureKey(m);
    if (!seenSig.has(sig) || m.kind === 'object' || m.kind === 'array') {
      seenSig.add(sig);
      finalMembers.push(m);
    }
  }

  return finalMembers.length === 1
    ? finalMembers[0]
    : { kind: 'union', members: finalMembers };
}

export function generateTypeScriptInterfaces(
  rootValue: unknown,
  rootName = 'Root'
): string {
  const rootPascal = sanitizePascalName(rootName);
  const rootType = inferTypeFromValue(rootValue);
  const interfaces: string[] = [];
  const usedNames = new Set<string>();

  const claimName = (preferred: string): string => {
    let candidate = sanitizePascalName(preferred);
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    let suffix = 2;
    while (usedNames.has(`${candidate}${suffix}`)) suffix++;
    const finalName = `${candidate}${suffix}`;
    usedNames.add(finalName);
    return finalName;
  };

  const renderType = (node: InferredType, hintName: string): string => {
    if (node.kind === 'primitive') return node.type;
    if (node.kind === 'array') {
      const elemName = hintName === rootPascal ? `${hintName}Item` : `${hintName}Item`;
      const inner = renderType(node.element, elemName);
      return inner.includes(' | ') ? `(${inner})[]` : `${inner}[]`;
    }
    if (node.kind === 'union') {
      // Put 'null' at the end for idiomatic TS readability
      const nonNull = node.members.filter(
        (m) => !(m.kind === 'primitive' && m.type === 'null')
      );
      const hasNull = nonNull.length !== node.members.length;
      const parts = nonNull.map((m) => renderType(m, hintName));
      if (hasNull) parts.push('null');
      return parts.join(' | ');
    }

    const ifaceName = claimName(hintName);
    const lines: string[] = [];
    for (const [k, field] of node.fields.entries()) {
      const propKey = formatPropertyKey(k);
      const opt = field.optional ? '?' : '';
      const childHint = `${ifaceName}${sanitizePascalName(k)}`;
      const fieldTypeStr = renderType(field.type, childHint);
      lines.push(`  ${propKey}${opt}: ${fieldTypeStr};`);
    }
    interfaces.push(`export interface ${ifaceName} {\n${lines.join('\n')}\n}`);
    return ifaceName;
  };

  const rootRef = renderType(rootType, rootPascal);
  if (rootType.kind !== 'object') {
    interfaces.push(`export type ${rootPascal} = ${rootRef};`);
  }
  return interfaces.join('\n\n');
}

export function generateZodSchema(rootValue: unknown, rootName = 'Root'): string {
  const rootPascal = sanitizePascalName(rootName);
  const rootType = inferTypeFromValue(rootValue);
  const definitions: string[] = [];
  const usedSchemaNames = new Set<string>();

  const claimSchemaName = (preferredPascal: string): string => {
    let base = `${sanitizePascalName(preferredPascal)}Schema`;
    if (!usedSchemaNames.has(base)) {
      usedSchemaNames.add(base);
      return base;
    }
    let suffix = 2;
    while (usedSchemaNames.has(`${sanitizePascalName(preferredPascal)}${suffix}Schema`)) {
      suffix++;
    }
    const chosen = `${sanitizePascalName(preferredPascal)}${suffix}Schema`;
    usedSchemaNames.add(chosen);
    return chosen;
  };

  const renderZod = (node: InferredType, hintPascal: string): string => {
    if (node.kind === 'primitive') {
      if (node.type === 'string') return 'z.string()';
      if (node.type === 'number') return 'z.number()';
      if (node.type === 'boolean') return 'z.boolean()';
      if (node.type === 'null') return 'z.null()';
      return 'z.unknown()';
    }
    if (node.kind === 'array') {
      const elemHint = hintPascal === rootPascal ? `${hintPascal}Item` : `${hintPascal}Item`;
      const elemExpr = renderZod(node.element, elemHint);
      return `z.array(${elemExpr})`;
    }
    if (node.kind === 'union') {
      const nonNull = node.members.filter(
        (m) => !(m.kind === 'primitive' && m.type === 'null')
      );
      const hasNull = nonNull.length !== node.members.length;
      if (nonNull.length === 0) return 'z.null()';
      const baseExpr =
        nonNull.length === 1
          ? renderZod(nonNull[0], hintPascal)
          : `z.union([${nonNull.map((m) => renderZod(m, hintPascal)).join(', ')}])`;
      return hasNull ? `${baseExpr}.nullable()` : baseExpr;
    }

    const schemaVar = claimSchemaName(hintPascal);
    const lines: string[] = [];
    for (const [k, field] of node.fields.entries()) {
      const propKey = formatPropertyKey(k);
      let expr = renderZod(field.type, `${hintPascal}${sanitizePascalName(k)}`);
      if (field.optional) {
        expr = `${expr}.optional()`;
      }
      lines.push(`  ${propKey}: ${expr},`);
    }
    definitions.push(`export const ${schemaVar} = z.object({\n${lines.join('\n')}\n});`);
    return schemaVar;
  };

  const rootExpr = renderZod(rootType, rootPascal);
  if (rootType.kind !== 'object') {
    const topVar = claimSchemaName(rootPascal);
    definitions.push(`export const ${topVar} = ${rootExpr};`);
  }

  return `import { z } from 'zod';\n\n${definitions.join('\n\n')}`;
}

export function buildJsonTreeRows(
  rootValue: unknown,
  expandedPaths: Set<string>,
  arrayRenderLimits: Map<string, number>,
  defaultArrayPageSize = 100
): JsonTreeRow[] {
  const rows: JsonTreeRow[] = [];

  const visit = (value: unknown, key: string, path: string, depth: number) => {
    const isExpanded = expandedPaths.has(path) || depth < 2;
    if (Array.isArray(value)) {
      const limit = arrayRenderLimits.get(path) ?? defaultArrayPageSize;
      rows.push({
        path,
        key,
        depth,
        kind: 'array',
        previewValue: `[${value.length} items]`,
        childCount: value.length,
        hasChildren: value.length > 0,
        expanded: isExpanded,
        totalArrayItems: value.length,
        renderedArrayLimit: limit,
      });
      if (isExpanded && value.length > 0) {
        const cap = Math.min(value.length, limit);
        for (let i = 0; i < cap; i++) {
          visit(value[i], `[${i}]`, `${path}[${i}]`, depth + 1);
        }
      }
      return;
    }

    if (value !== null && typeof value === 'object') {
      const rec = value as Record<string, unknown>;
      const keys = Object.keys(rec);
      rows.push({
        path,
        key,
        depth,
        kind: 'object',
        previewValue: `{${keys.length} keys}`,
        childCount: keys.length,
        hasChildren: keys.length > 0,
        expanded: isExpanded,
      });
      if (isExpanded && keys.length > 0) {
        for (const k of keys) {
          visit(rec[k], k, `${path}.${k}`, depth + 1);
        }
      }
      return;
    }

    const kind: JsonTreeRow['kind'] =
      value === null
        ? 'null'
        : typeof value === 'string'
          ? 'string'
          : typeof value === 'number'
            ? 'number'
            : 'boolean';
    const preview =
      typeof value === 'string'
        ? JSON.stringify(value)
        : String(value);

    rows.push({
      path,
      key,
      depth,
      kind,
      previewValue: preview,
      childCount: 0,
      hasChildren: false,
      expanded: false,
    });
  };

  visit(rootValue, '$', '$', 0);
  return rows;
}

// ============================================================================
// Seam 1B: Multi-Dialect SQL Lexer / Beautifier / Minifier
// ============================================================================

type SqlTokenType =
  | 'whitespace'
  | 'block_comment'
  | 'line_comment'
  | 'string'
  | 'dollar_string'
  | 'quoted_ident'
  | 'param'
  | 'operator'
  | 'punct'
  | 'number'
  | 'word';

interface SqlToken {
  type: SqlTokenType;
  value: string;
  offset: number;
}

const SQL_KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'ALL',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'IN',
  'IS',
  'NULL',
  'TRUE',
  'FALSE',
  'AS',
  'ON',
  'USING',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'NATURAL',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'NULLS',
  'FIRST',
  'LAST',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'NEXT',
  'ROWS',
  'ONLY',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'WITH',
  'RECURSIVE',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'RETURNING',
  'CREATE',
  'TABLE',
  'VIEW',
  'INDEX',
  'IF',
  'EXISTS',
  'ALTER',
  'DROP',
  'PRIMARY',
  'KEY',
  'REFERENCES',
  'DEFAULT',
  'CONSTRAINT',
  'UNIQUE',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'BETWEEN',
  'LIKE',
  'ILIKE',
  'OVER',
  'PARTITION',
  'WINDOW',
  'CAST',
  'COALESCE',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'ON_CONFLICT',
  'CONFLICT',
  'DO',
  'NOTHING',
]);

const MAJOR_SQL_NEWLINE_CLAUSES = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'FULL OUTER JOIN',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'UNION',
  'UNION ALL',
  'INTERSECT',
  'EXCEPT',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'RETURNING',
]);

function tokenizeSql(
  source: string,
  dialect: SqlDialect
): { tokens?: SqlToken[]; error?: SyntaxDiagnostic } {
  const tokens: SqlToken[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1] ?? '';

    if (/\s/.test(ch)) {
      const start = i;
      while (i < len && /\s/.test(source[i])) i++;
      tokens.push({ type: 'whitespace', value: source.slice(start, i), offset: start });
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      const start = i;
      const closeIdx = source.indexOf('*/', i + 2);
      if (closeIdx < 0) {
        const loc = offsetToLineCol(source, start);
        return {
          error: {
            valid: false,
            message: 'Unterminated /* block comment in SQL.',
            line: loc.line,
            column: loc.column,
            snippet: loc.snippet,
          },
        };
      }
      i = closeIdx + 2;
      tokens.push({ type: 'block_comment', value: source.slice(start, i), offset: start });
      continue;
    }

    // Line comment -- or MySQL/BigQuery #
    if (
      (ch === '-' && next === '-') ||
      (ch === '#' && (dialect === 'mysql' || dialect === 'bigquery'))
    ) {
      const start = i;
      const nl = source.indexOf('\n', i);
      i = nl < 0 ? len : nl;
      tokens.push({ type: 'line_comment', value: source.slice(start, i), offset: start });
      continue;
    }

    // PostgreSQL dollar-quoted string $tag$...$tag$
    if (dialect === 'postgresql' && ch === '$') {
      const tagMatch = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(source.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const start = i;
        const endIdx = source.indexOf(tag, i + tag.length);
        if (endIdx < 0) {
          const loc = offsetToLineCol(source, start);
          return {
            error: {
              valid: false,
              message: `Unterminated dollar-quoted string ${tag}.`,
              line: loc.line,
              column: loc.column,
              snippet: loc.snippet,
            },
          };
        }
        i = endIdx + tag.length;
        tokens.push({ type: 'dollar_string', value: source.slice(start, i), offset: start });
        continue;
      }
    }

    // Single-quoted string literal
    if (ch === "'") {
      const start = i;
      i++;
      let closed = false;
      while (i < len) {
        if (source[i] === '\\' && (dialect === 'mysql' || dialect === 'bigquery')) {
          i += 2;
          continue;
        }
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) {
        const loc = offsetToLineCol(source, start);
        return {
          error: {
            valid: false,
            message: 'Unterminated single-quoted string literal in SQL.',
            line: loc.line,
            column: loc.column,
            snippet: loc.snippet,
          },
        };
      }
      tokens.push({ type: 'string', value: source.slice(start, i), offset: start });
      continue;
    }

    // Quoted identifier: "...", `...`, or T-SQL [...]
    if (ch === '"' || ch === '`' || (ch === '[' && dialect === 'tsql')) {
      const closeChar = ch === '[' ? ']' : ch;
      const start = i;
      i++;
      let closed = false;
      while (i < len) {
        if (source[i] === closeChar) {
          if (ch !== '[' && source[i + 1] === closeChar) {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) {
        const loc = offsetToLineCol(source, start);
        return {
          error: {
            valid: false,
            message: `Unterminated quoted identifier starting with ${ch}.`,
            line: loc.line,
            column: loc.column,
            snippet: loc.snippet,
          },
        };
      }
      tokens.push({ type: 'quoted_ident', value: source.slice(start, i), offset: start });
      continue;
    }

    // Parameter placeholder ($1, :id, @param, ?)
    if (ch === '?' || ch === ':' || ch === '@' || ch === '$') {
      const pMatch = /^(?:\$\d+|[:@][A-Za-z_][A-Za-z0-9_]*|\?)/.exec(source.slice(i));
      if (pMatch) {
        tokens.push({ type: 'param', value: pMatch[0], offset: i });
        i += pMatch[0].length;
        continue;
      }
    }

    // Multi-char operators
    const opMatch = /^(?:<>|!=|<=|>=|::|->>|->|\|\||:=|\*\*|<<|>>)/.exec(
      source.slice(i)
    );
    if (opMatch) {
      tokens.push({ type: 'operator', value: opMatch[0], offset: i });
      i += opMatch[0].length;
      continue;
    }

    if ('(),;.'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch, offset: i });
      i++;
      continue;
    }

    if ('+-*/%=<>~!&|^'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch, offset: i });
      i++;
      continue;
    }

    if (/\d/.test(ch)) {
      const nMatch = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(source.slice(i));
      const val = nMatch ? nMatch[0] : ch;
      tokens.push({ type: 'number', value: val, offset: i });
      i += val.length;
      continue;
    }

    const wMatch = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(source.slice(i));
    if (wMatch) {
      tokens.push({ type: 'word', value: wMatch[0], offset: i });
      i += wMatch[0].length;
      continue;
    }

    tokens.push({ type: 'operator', value: ch, offset: i });
    i++;
  }

  // Validate parentheses matching
  const parenStack: number[] = [];
  for (const tok of tokens) {
    if (tok.type === 'punct' && tok.value === '(') {
      parenStack.push(tok.offset);
    } else if (tok.type === 'punct' && tok.value === ')') {
      if (parenStack.length === 0) {
        const loc = offsetToLineCol(source, tok.offset);
        return {
          error: {
            valid: false,
            message: 'Unmatched closing parenthesis ) in SQL.',
            line: loc.line,
            column: loc.column,
            snippet: loc.snippet,
          },
        };
      }
      parenStack.pop();
    }
  }
  if (parenStack.length > 0) {
    const loc = offsetToLineCol(source, parenStack[parenStack.length - 1]);
    return {
      error: {
        valid: false,
        message: 'Unclosed opening parenthesis ( in SQL.',
        line: loc.line,
        column: loc.column,
        snippet: loc.snippet,
      },
    };
  }

  return { tokens };
}

function applySqlKeywordCase(
  word: string,
  mode: 'upper' | 'lower' | 'preserve'
): string {
  if (mode === 'upper') return word.toUpperCase();
  if (mode === 'lower') return word.toLowerCase();
  return word;
}

export function formatSql(
  source: string,
  options: {
    dialect: SqlDialect;
    keywordCase: 'upper' | 'lower' | 'preserve';
    indentType: '2spaces' | '4spaces' | 'tab';
    minify: boolean;
  }
): JsonSqlFormatterResult {
  const started = performance.now();
  const inputBytes = new TextEncoder().encode(source ?? '').byteLength;
  if (!source || !source.trim()) {
    return {
      success: false,
      diagnostic: { valid: false, message: 'Input SQL text is empty.', line: 1, column: 1 },
      outputText: '',
      stats: { inputBytes, outputBytes: 0, lineCount: 0, durationMs: 0 },
    };
  }

  const tokenized = tokenizeSql(source, options.dialect);
  if (tokenized.error || !tokenized.tokens) {
    return {
      success: false,
      diagnostic: tokenized.error ?? { valid: false, message: 'Invalid SQL syntax.' },
      outputText: '',
      stats: {
        inputBytes,
        outputBytes: 0,
        lineCount: 0,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      },
    };
  }

  const nonWs = tokenized.tokens.filter((t) => t.type !== 'whitespace');
  const indentUnit = getIndentUnit(options.indentType);

  // Rewrite SQL keywords ONLY on bare 'word' tokens (never strings, comments, quoted idents, or params)
  const cased = nonWs.map((t) =>
    t.type === 'word' && SQL_KEYWORDS.has(t.value.toUpperCase())
      ? { ...t, value: applySqlKeywordCase(t.value, options.keywordCase) }
      : t
  );

  if (options.minify) {
    const noComments = cased.filter(
      (t) => t.type !== 'line_comment' && t.type !== 'block_comment'
    );
    let miniOut = '';
    for (let i = 0; i < noComments.length; i++) {
      const cur = noComments[i];
      const prev = i > 0 ? noComments[i - 1] : null;
      const needsSpace =
        prev !== null &&
        cur.value !== ',' &&
        cur.value !== ';' &&
        cur.value !== '.' &&
        cur.value !== ')' &&
        prev.value !== '.' &&
        prev.value !== '(' &&
        cur.value !== '::' &&
        prev.value !== '::' &&
        !(prev.type === 'word' && cur.value === '(');
      if (needsSpace) miniOut += ' ';
      miniOut += cur.value;
    }
    const trimmed = miniOut.trim();
    return {
      success: true,
      diagnostic: { valid: true },
      outputText: trimmed,
      stats: {
        inputBytes,
        outputBytes: new TextEncoder().encode(trimmed).byteLength,
        lineCount: trimmed ? trimmed.split('\n').length : 0,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      },
    };
  }

  // Collapse multi-word SQL clause prefixes (LEFT OUTER JOIN, GROUP BY, ORDER BY, etc.)
  const merged: SqlToken[] = [];
  for (let i = 0; i < cased.length; i++) {
    const a = cased[i];
    const b = cased[i + 1];
    const c = cased[i + 2];
    if (a.type === 'word' && b?.type === 'word' && c?.type === 'word') {
      const upper3 = `${a.value.toUpperCase()} ${b.value.toUpperCase()} ${c.value.toUpperCase()}`;
      if (MAJOR_SQL_NEWLINE_CLAUSES.has(upper3)) {
        merged.push({ type: 'word', value: `${a.value} ${b.value} ${c.value}`, offset: a.offset });
        i += 2;
        continue;
      }
    }
    if (a.type === 'word' && b?.type === 'word') {
      const upper2 = `${a.value.toUpperCase()} ${b.value.toUpperCase()}`;
      if (MAJOR_SQL_NEWLINE_CLAUSES.has(upper2) || upper2 === 'IS NOT') {
        merged.push({ type: 'word', value: `${a.value} ${b.value}`, offset: a.offset });
        i += 1;
        continue;
      }
    }
    merged.push(a);
  }

  const lines: string[] = [];
  let lineBuf = '';
  let depth = 0;
  let inClauseBody = false;

  const pushLine = (extraIndent = 0) => {
    const trimmed = lineBuf.trimEnd();
    if (trimmed.length > 0) {
      const level = Math.max(0, depth + (inClauseBody ? 1 : 0) + extraIndent);
      lines.push(`${indentUnit.repeat(level)}${trimmed}`);
    }
    lineBuf = '';
  };

  for (let i = 0; i < merged.length; i++) {
    const tok = merged[i];
    const upper = tok.type === 'word' ? tok.value.toUpperCase() : '';
    const prev = i > 0 ? merged[i - 1] : null;
    const next = i + 1 < merged.length ? merged[i + 1] : null;

    if (tok.type === 'line_comment') {
      if (lineBuf.trim().length > 0) {
        pushLine();
      }
      lines.push(`${indentUnit.repeat(Math.max(0, depth + (inClauseBody ? 1 : 0)))}${tok.value}`);
      continue;
    }

    if (tok.type === 'block_comment') {
      if (lineBuf.length > 0 && !lineBuf.endsWith(' ')) lineBuf += ' ';
      lineBuf += tok.value;
      continue;
    }

    if (tok.type === 'word' && MAJOR_SQL_NEWLINE_CLAUSES.has(upper)) {
      pushLine();
      inClauseBody = false;
      lines.push(`${indentUnit.repeat(depth)}${tok.value}`);
      inClauseBody = true;
      continue;
    }

    if (tok.type === 'word' && (upper === 'AND' || upper === 'OR') && depth === 0) {
      pushLine();
      lineBuf = tok.value;
      continue;
    }

    if (tok.value === '(') {
      if (
        prev &&
        prev.type !== 'word' &&
        prev.value !== '(' &&
        lineBuf.length > 0 &&
        !lineBuf.endsWith(' ')
      ) {
        lineBuf += ' ';
      }
      lineBuf += '(';
      depth++;
      continue;
    }

    if (tok.value === ')') {
      if (lineBuf.trim().length > 0 && next && MAJOR_SQL_NEWLINE_CLAUSES.has(next.value.toUpperCase())) {
        pushLine();
      }
      depth = Math.max(0, depth - 1);
      if (lineBuf.trim().length === 0) {
        inClauseBody = false;
      }
      lineBuf = lineBuf.trimEnd() + ')';
      continue;
    }

    if (tok.value === ',') {
      lineBuf = lineBuf.trimEnd() + ',';
      if (depth === 0) {
        pushLine();
      } else {
        lineBuf += ' ';
      }
      continue;
    }

    if (tok.value === ';') {
      lineBuf = lineBuf.trimEnd() + ';';
      pushLine();
      inClauseBody = false;
      lines.push('');
      continue;
    }

    if (tok.value === '.') {
      lineBuf = lineBuf.trimEnd() + '.';
      continue;
    }

    const needsSpace =
      lineBuf.length > 0 &&
      !lineBuf.endsWith(' ') &&
      !lineBuf.endsWith('(') &&
      !lineBuf.endsWith('.') &&
      tok.value !== '::' &&
      !(prev?.value === '::');
    if (needsSpace) lineBuf += ' ';
    lineBuf += tok.value;
  }

  pushLine();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const formatted = lines.join('\n');

  return {
    success: true,
    diagnostic: { valid: true },
    outputText: formatted,
    stats: {
      inputBytes,
      outputBytes: new TextEncoder().encode(formatted).byteLength,
      lineCount: formatted ? formatted.split('\n').length : 0,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    },
  };
}

// ============================================================================
// Seam 1B: Pure-TS YAML Parser, Validator & Lossless Serializer
// ============================================================================

const YAML_AMBIGUOUS_SCALAR_RE =
  /^(?:true|false|yes|no|on|off|null|~|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0o[0-7]+|[-+]?\.inf|\.nan)$/i;

function shouldQuoteYamlString(val: string): boolean {
  if (val.length === 0) return true;
  if (/^\s|\s$/.test(val)) return true;
  if (/[\r\n\t\u0000-\u001F]/.test(val)) return true;
  if (YAML_AMBIGUOUS_SCALAR_RE.test(val)) return true;
  if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(val)) return true;
  if (val.includes(': ') || val.endsWith(':') || val.includes(' #')) return true;
  if (val.includes('"') || val.includes("'")) return true;
  return false;
}

function serializeYamlScalar(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : 'null';
  }
  const s = String(val);
  return shouldQuoteYamlString(s) ? JSON.stringify(s) : s;
}

function serializeYamlKey(key: string): string {
  return /^[A-Za-z0-9_.-]+$/.test(key) &&
    !YAML_AMBIGUOUS_SCALAR_RE.test(key) &&
    !key.startsWith('-') &&
    !key.startsWith('.')
    ? key
    : JSON.stringify(key);
}

export function jsonToYaml(
  value: unknown,
  indentType: '2spaces' | '4spaces' | 'tab' = '2spaces'
): string {
  const unit = indentType === '4spaces' ? '    ' : '  ';

  const renderNode = (node: unknown, level: number): string => {
    const pad = unit.repeat(level);
    if (Array.isArray(node)) {
      if (node.length === 0) return '[]';
      const lines: string[] = [];
      for (const item of node) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.keys(item as Record<string, unknown>);
          if (entries.length === 0) {
            lines.push(`${pad}- {}`);
          } else {
            entries.forEach((k, idx) => {
              const prefix = idx === 0 ? `${pad}- ` : `${pad}  `;
              const childVal = (item as Record<string, unknown>)[k];
              if (
                childVal !== null &&
                typeof childVal === 'object' &&
                !(
                  (Array.isArray(childVal) && childVal.length === 0) ||
                  (!Array.isArray(childVal) && Object.keys(childVal).length === 0)
                )
              ) {
                lines.push(`${prefix}${serializeYamlKey(k)}:`);
                lines.push(renderNode(childVal, level + 2));
              } else {
                lines.push(
                  `${prefix}${serializeYamlKey(k)}: ${serializeYamlScalarOrEmpty(childVal)}`
                );
              }
            });
          }
        } else if (Array.isArray(item) && item.length > 0) {
          lines.push(`${pad}-`);
          lines.push(renderNode(item, level + 1));
        } else {
          lines.push(`${pad}- ${serializeYamlScalarOrEmpty(item)}`);
        }
      }
      return lines.join('\n');
    }

    if (node !== null && typeof node === 'object') {
      const rec = node as Record<string, unknown>;
      const keys = Object.keys(rec);
      if (keys.length === 0) return '{}';
      const lines: string[] = [];
      for (const k of keys) {
        const v = rec[k];
        if (
          v !== null &&
          typeof v === 'object' &&
          !(
            (Array.isArray(v) && v.length === 0) ||
            (!Array.isArray(v) && Object.keys(v).length === 0)
          )
        ) {
          lines.push(`${pad}${serializeYamlKey(k)}:`);
          lines.push(renderNode(v, level + 1));
        } else {
          lines.push(`${pad}${serializeYamlKey(k)}: ${serializeYamlScalarOrEmpty(v)}`);
        }
      }
      return lines.join('\n');
    }

    return `${pad}${serializeYamlScalar(node)}`;
  };

  const serializeYamlScalarOrEmpty = (v: unknown): string => {
    if (Array.isArray(v) && v.length === 0) return '[]';
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) {
      return '{}';
    }
    return serializeYamlScalar(v);
  };

  return renderNode(value, 0);
}

interface YamlLine {
  lineNum: number;
  indent: number;
  raw: string;
  trimmed: string;
}

class YamlSyntaxError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number
  ) {
    super(message);
  }
}

function stripYamlComment(text: string): string {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (quote === '"' && ch === '\\') {
        i++;
        continue;
      }
      if (quote === "'" && ch === "'" && text[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i).trimEnd();
    }
  }
  return text.trimEnd();
}

function splitKeyValueColon(text: string): number {
  let quote: '"' | "'" | null = null;
  let bracketDepth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (quote === '"' && ch === '\\') {
        i++;
        continue;
      }
      if (quote === "'" && ch === "'" && text[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '[' || ch === '{') bracketDepth++;
    else if (ch === ']' || ch === '}') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (
      ch === ':' &&
      bracketDepth === 0 &&
      (i + 1 === text.length || /\s/.test(text[i + 1]))
    ) {
      return i;
    }
  }
  return -1;
}

function parseQuotedYamlString(raw: string, lineNum: number, col: number): string {
  const quote = raw[0];
  if (raw.length < 2 || raw[raw.length - 1] !== quote) {
    throw new YamlSyntaxError(`Unterminated ${quote} string in YAML.`, lineNum, col);
  }
  const inner = raw.slice(1, -1);
  if (quote === "'") {
    return inner.replace(/''/g, "'");
  }
  try {
    return JSON.parse(raw) as string;
  } catch {
    throw new YamlSyntaxError('Invalid escape sequence inside YAML double-quoted string.', lineNum, col);
  }
}

function parseYamlFlowValue(text: string, lineNum: number, col: number): unknown {
  const trimmed = text.trim();
  if (trimmed === '[]') return [];
  if (trimmed === '{}') return {};

  const expectedClose = trimmed[0] === '[' ? ']' : '}';
  if (trimmed[trimmed.length - 1] !== expectedClose) {
    throw new YamlSyntaxError(
      `Unclosed flow collection (expected "${expectedClose}").`,
      lineNum,
      col + trimmed.length
    );
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return expectedClose === ']' ? [] : {};

  // Split top-level commas respecting nested brackets & quotes
  const parts: string[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      if (quote === '"' && ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());

  if (expectedClose === ']') {
    return parts.filter((p) => p.length > 0).map((p) => parseYamlInlineValue(p, lineNum, col));
  }

  const out: Record<string, unknown> = {};
  for (const part of parts) {
    if (!part) continue;
    const colon = splitKeyValueColon(part);
    if (colon < 0) {
      throw new YamlSyntaxError('Expected "key: value" inside flow mapping.', lineNum, col);
    }
    const rawKey = part.slice(0, colon).trim();
    const rawVal = part.slice(colon + 1).trim();
    const key =
      rawKey.startsWith('"') || rawKey.startsWith("'")
        ? parseQuotedYamlString(rawKey, lineNum, col)
        : rawKey;
    defineSafeProp(out, key, parseYamlInlineValue(rawVal, lineNum, col));
  }
  return out;
}

function parseYamlInlineValue(raw: string, lineNum: number, col: number): unknown {
  const s = stripYamlComment(raw).trim();
  if (!s || s === 'null' || s === 'Null' || s === 'NULL' || s === '~') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (s.startsWith('"') || s.startsWith("'")) {
    return parseQuotedYamlString(s, lineNum, col);
  }
  if (s.startsWith('[') || s.startsWith('{')) {
    return parseYamlFlowValue(s, lineNum, col);
  }
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

export function parseYamlWithLocation(source: string): {
  diagnostic: SyntaxDiagnostic;
  value?: unknown;
} {
  if (!source || !source.trim()) {
    return {
      diagnostic: { valid: false, message: 'Input YAML text is empty.', line: 1, column: 1 },
    };
  }

  const rawLines = source.replace(/\r\n/g, '\n').split('\n');
  const lines: YamlLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const tabIdx = raw.indexOf('\t');
    const leading = /^ */.exec(raw)?.[0].length ?? 0;
    if (tabIdx >= 0 && tabIdx <= leading) {
      const col = tabIdx + 1;
      return {
        diagnostic: {
          valid: false,
          message: 'Tab indentation is not allowed in YAML. Use spaces instead.',
          line: i + 1,
          column: col,
          snippet: `${raw}\n${' '.repeat(Math.max(0, col - 1))}^`,
        },
      };
    }

    const uncommented = stripYamlComment(raw);
    const trimmed = uncommented.trimStart();
    if (!trimmed || trimmed === '---' || trimmed === '...') continue;

    lines.push({
      lineNum: i + 1,
      indent: leading,
      raw,
      trimmed,
    });
  }

  if (lines.length === 0) {
    return { diagnostic: { valid: true }, value: null };
  }

  try {
    let cursor = 0;

    const parseBlockScalar = (header: string, minIndent: number): string => {
      const folded = header.startsWith('>');
      const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
      const baseCursorIndent =
        cursor < lines.length && lines[cursor].indent >= minIndent
          ? lines[cursor].indent
          : minIndent;
      if (cursor >= lines.length || lines[cursor].indent < minIndent) {
        return '';
      }
      const collected: string[] = [];
      const firstLineNum = lines[cursor].lineNum;
      let expectedLineNum = firstLineNum;

      while (cursor < lines.length && lines[cursor].indent >= baseCursorIndent) {
        while (expectedLineNum < lines[cursor].lineNum) {
          collected.push('');
          expectedLineNum++;
        }
        collected.push(lines[cursor].raw.slice(baseCursorIndent));
        expectedLineNum = lines[cursor].lineNum + 1;
        cursor++;
      }

      const body = folded ? collected.join(' ').trim() : collected.join('\n');
      return chomp === 'strip' ? body : `${body}\n`;
    };

    const parseSequence = (seqIndent: number): unknown[] => {
      const arr: unknown[] = [];
      while (cursor < lines.length && lines[cursor].indent === seqIndent) {
        const line = lines[cursor];
        if (line.trimmed !== '-' && !line.trimmed.startsWith('- ')) break;
        cursor++;

        const afterDash = line.trimmed.length === 1 ? '' : line.trimmed.slice(2).trimStart();
        const itemChildIndent = seqIndent + 2;

        if (!afterDash) {
          if (cursor < lines.length && lines[cursor].indent > seqIndent) {
            arr.push(parseBlock(lines[cursor].indent));
          } else {
            arr.push(null);
          }
          continue;
        }

        if (/^[|>][+-]?$/.test(afterDash)) {
          arr.push(parseBlockScalar(afterDash, seqIndent + 1));
          continue;
        }

        const colonIdx = splitKeyValueColon(afterDash);
        if (colonIdx >= 0) {
          const itemObj: Record<string, unknown> = {};
          const key = decodeYamlKey(afterDash.slice(0, colonIdx).trim(), line.lineNum, line.indent + 3);
          const rest = afterDash.slice(colonIdx + 1).trim();

          if (!rest) {
            if (cursor < lines.length && lines[cursor].indent > itemChildIndent) {
              defineSafeProp(itemObj, key, parseBlock(lines[cursor].indent));
            } else {
              defineSafeProp(itemObj, key, null);
            }
          } else if (/^[|>][+-]?$/.test(rest)) {
            defineSafeProp(itemObj, key, parseBlockScalar(rest, itemChildIndent + 1));
          } else {
            defineSafeProp(
              itemObj,
              key,
              parseYamlInlineValue(rest, line.lineNum, line.indent + 3 + colonIdx)
            );
          }

          if (cursor < lines.length && lines[cursor].indent === itemChildIndent) {
            const extra = parseMapping(itemChildIndent);
            for (const ek of Object.keys(extra)) {
              defineSafeProp(itemObj, ek, extra[ek]);
            }
          }
          arr.push(itemObj);
          continue;
        }

        arr.push(parseYamlInlineValue(afterDash, line.lineNum, line.indent + 3));
      }
      return arr;
    };

    const decodeYamlKey = (rawKey: string, lineNum: number, col: number): string => {
      if (rawKey.startsWith('"') || rawKey.startsWith("'")) {
        return parseQuotedYamlString(rawKey, lineNum, col);
      }
      return rawKey;
    };

    const parseMapping = (mapIndent: number): Record<string, unknown> => {
      const obj: Record<string, unknown> = {};
      while (cursor < lines.length && lines[cursor].indent === mapIndent) {
        const line = lines[cursor];
        if (line.trimmed === '-' || line.trimmed.startsWith('- ')) break;

        const colonIdx = splitKeyValueColon(line.trimmed);
        if (colonIdx < 0) {
          throw new YamlSyntaxError(
            'Expected "key: value" mapping entry or list item "-".',
            line.lineNum,
            line.indent + 1
          );
        }

        const key = decodeYamlKey(
          line.trimmed.slice(0, colonIdx).trim(),
          line.lineNum,
          line.indent + 1
        );
        const valText = line.trimmed.slice(colonIdx + 1).trim();
        cursor++;

        if (!valText) {
          if (cursor < lines.length && lines[cursor].indent > mapIndent) {
            defineSafeProp(obj, key, parseBlock(lines[cursor].indent));
          } else if (
            cursor < lines.length &&
            lines[cursor].indent === mapIndent &&
            (lines[cursor].trimmed === '-' || lines[cursor].trimmed.startsWith('- '))
          ) {
            defineSafeProp(obj, key, parseSequence(mapIndent));
          } else {
            defineSafeProp(obj, key, null);
          }
          continue;
        }

        if (/^[|>][+-]?$/.test(valText)) {
          defineSafeProp(obj, key, parseBlockScalar(valText, mapIndent + 1));
          continue;
        }

        defineSafeProp(
          obj,
          key,
          parseYamlInlineValue(valText, line.lineNum, line.indent + colonIdx + 2)
        );
      }
      return obj;
    };

    const parseBlock = (expectedIndent: number): unknown => {
      if (cursor >= lines.length) return null;
      const head = lines[cursor];
      if (head.trimmed === '-' || head.trimmed.startsWith('- ')) {
        return parseSequence(expectedIndent);
      }
      const colonIdx = splitKeyValueColon(head.trimmed);
      if (colonIdx >= 0) {
        return parseMapping(expectedIndent);
      }
      cursor++;
      return parseYamlInlineValue(head.trimmed, head.lineNum, head.indent + 1);
    };

    const root = parseBlock(lines[0].indent);
    if (cursor < lines.length) {
      const unexpected = lines[cursor];
      throw new YamlSyntaxError(
        `Unexpected indentation (${unexpected.indent} spaces).`,
        unexpected.lineNum,
        unexpected.indent + 1
      );
    }

    return { diagnostic: { valid: true }, value: root };
  } catch (err: unknown) {
    if (err instanceof YamlSyntaxError) {
      const targetLine = rawLines[err.line - 1] ?? '';
      return {
        diagnostic: {
          valid: false,
          message: err.message,
          line: err.line,
          column: err.column,
          snippet: `${targetLine}\n${' '.repeat(Math.max(0, err.column - 1))}^`,
        },
      };
    }
    return {
      diagnostic: {
        valid: false,
        message: err instanceof Error ? err.message : 'Invalid YAML syntax.',
        line: 1,
        column: 1,
      },
    };
  }
}

/**
 * Unified async formatter & validator entrypoint used identically by the Angular UI
 * and Web Worker (`worker.ts`) across JSON, SQL, and YAML modes.
 */
export async function processFormatterInput(
  inputText: string,
  partialOptions: Partial<JsonSqlFormatterOptions> = {},
  deps: FormatterDeps = {}
): Promise<JsonSqlFormatterResult> {
  const options: JsonSqlFormatterOptions = {
    ...DEFAULT_JSON_SQL_OPTIONS,
    ...partialOptions,
  };
  const started = performance.now();
  const inputBytes = new TextEncoder().encode(inputText ?? '').byteLength;

  deps.onProgress?.(15, `Parsing ${options.language.toUpperCase()} input`);

  if (options.language === 'sql') {
    deps.onProgress?.(60, 'Tokenizing and formatting SQL statements');
    const res = formatSql(inputText, {
      dialect: options.sqlDialect,
      keywordCase: options.sqlKeywordCase,
      indentType: options.indentType,
      minify: options.sqlMinify,
    });
    deps.onProgress?.(100, 'Complete');
    return res;
  }

  if (options.language === 'yaml') {
    deps.onProgress?.(55, 'Validating YAML AST');
    const parsed = parseYamlWithLocation(inputText);
    if (!parsed.diagnostic.valid) {
      deps.onProgress?.(100, 'Validation error');
      return {
        success: false,
        diagnostic: parsed.diagnostic,
        outputText: '',
        stats: {
          inputBytes,
          outputBytes: 0,
          lineCount: 0,
          durationMs: Math.round((performance.now() - started) * 100) / 100,
        },
      };
    }
    const outputText =
      options.yamlOutputMode === 'json'
        ? JSON.stringify(parsed.value, null, getIndentUnit(options.indentType))
        : jsonToYaml(parsed.value, options.indentType);
    deps.onProgress?.(100, 'Complete');
    return {
      success: true,
      diagnostic: { valid: true },
      outputText,
      parsedValue: parsed.value,
      stats: {
        inputBytes,
        outputBytes: new TextEncoder().encode(outputText).byteLength,
        lineCount: outputText ? outputText.split('\n').length : 0,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      },
    };
  }

  // JSON mode
  const parsed = parseJsonWithLocation(inputText);
  if (!parsed.diagnostic.valid) {
    deps.onProgress?.(100, 'Syntax error');
    return {
      success: false,
      diagnostic: parsed.diagnostic,
      outputText: '',
      stats: {
        inputBytes,
        outputBytes: 0,
        lineCount: 0,
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      },
    };
  }

  deps.onProgress?.(55, 'Transforming JSON payload');
  let activeValue = options.sortJsonKeys
    ? sortJsonValueKeys(parsed.value)
    : parsed.value;

  if (options.jsonPathQuery && options.jsonPathQuery.trim().length > 0) {
    const jp = evaluateJsonPath(activeValue, options.jsonPathQuery);
    if (jp.error) {
      return {
        success: false,
        diagnostic: { valid: false, message: jp.error, line: 1, column: 1 },
        outputText: '',
        stats: {
          inputBytes,
          outputBytes: 0,
          lineCount: 0,
          durationMs: Math.round((performance.now() - started) * 100) / 100,
        },
      };
    }
    activeValue = jp.matches;
  }

  let outputText = '';
  switch (options.jsonOutputView) {
    case 'minified':
      outputText = JSON.stringify(activeValue);
      break;
    case 'typescript':
      outputText = generateTypeScriptInterfaces(activeValue, options.rootTypeName);
      break;
    case 'zod':
      outputText = generateZodSchema(activeValue, options.rootTypeName);
      break;
    case 'yaml':
      outputText = jsonToYaml(activeValue, options.indentType);
      break;
    case 'tree':
    case 'formatted':
    default:
      outputText = JSON.stringify(
        activeValue,
        null,
        getIndentUnit(options.indentType)
      );
      break;
  }

  deps.onProgress?.(100, 'Complete');
  return {
    success: true,
    diagnostic: { valid: true },
    outputText,
    parsedValue: activeValue,
    stats: {
      inputBytes,
      outputBytes: new TextEncoder().encode(outputText).byteLength,
      lineCount: outputText ? outputText.split('\n').length : 0,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    },
  };
}
