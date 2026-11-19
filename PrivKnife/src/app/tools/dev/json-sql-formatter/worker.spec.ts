import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLargeJsonArrayText } from './test-fixtures';
import {
  DEFAULT_JSON_SQL_OPTIONS,
  FormatterWorkerRequest,
  FormatterWorkerResponse,
} from './types';
import { handleFormatterWorkerMessage } from './worker';

describe('JSON, SQL & YAML Formatter Web Worker (Seam 2)', () => {
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

  it('formats large JSON (>250 KB) inside worker with monotonic progress updates and zero network calls', async () => {
    const largeJson = buildLargeJsonArrayText(2500);
    expect(largeJson.length).toBeGreaterThan(250_000);

    const messages: FormatterWorkerResponse[] = [];
    await handleFormatterWorkerMessage(
      {
        type: 'format',
        inputText: largeJson,
        options: {
          ...DEFAULT_JSON_SQL_OPTIONS,
          language: 'json',
          sortJsonKeys: true,
        },
      },
      (msg) => messages.push(msg)
    );

    const progress = messages.filter((m) => m.type === 'progress');
    expect(progress.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < progress.length; i++) {
      if (progress[i].type === 'progress' && progress[i - 1].type === 'progress') {
        expect(progress[i].percent).toBeGreaterThanOrEqual(
          progress[i - 1].percent
        );
      }
    }

    const done = messages.find((m) => m.type === 'done');
    expect(done?.type).toBe('done');
    if (done?.type === 'done') {
      expect(done.result.success).toBe(true);
      expect(done.result.stats.inputBytes).toBeGreaterThan(250_000);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('formats SQL and returns line/column diagnostic errors for invalid YAML cleanly', async () => {
    const sqlMsgs: FormatterWorkerResponse[] = [];
    await handleFormatterWorkerMessage(
      {
        type: 'format',
        inputText: "select 'from where' from users where id = $1",
        options: {
          ...DEFAULT_JSON_SQL_OPTIONS,
          language: 'sql',
          sqlKeywordCase: 'upper',
        },
      },
      (m) => sqlMsgs.push(m)
    );
    const sqlDone = sqlMsgs.find((m) => m.type === 'done');
    expect(sqlDone?.type === 'done' && sqlDone.result.success).toBe(true);
    if (sqlDone?.type === 'done') {
      expect(sqlDone.result.outputText).toContain('SELECT');
      expect(sqlDone.result.outputText).toContain("'from where'");
    }

    const yamlMsgs: FormatterWorkerResponse[] = [];
    await handleFormatterWorkerMessage(
      {
        type: 'format',
        inputText: 'key:\n\tbad_tab: 1',
        options: {
          ...DEFAULT_JSON_SQL_OPTIONS,
          language: 'yaml',
        },
      },
      (m) => yamlMsgs.push(m)
    );
    const yamlDone = yamlMsgs.find((m) => m.type === 'done');
    expect(yamlDone?.type === 'done').toBe(true);
    if (yamlDone?.type === 'done') {
      expect(yamlDone.result.success).toBe(false);
      expect(yamlDone.result.diagnostic.valid).toBe(false);
      expect(yamlDone.result.diagnostic.line).toBe(2);
    }
  });

  it('handles malformed worker request payload cleanly without throwing', async () => {
    const errMsgs: FormatterWorkerResponse[] = [];
    await handleFormatterWorkerMessage(
      { type: 'invalid' } as unknown as FormatterWorkerRequest,
      (m) => errMsgs.push(m)
    );
    expect(errMsgs[0]?.type).toBe('error');
  });
});
