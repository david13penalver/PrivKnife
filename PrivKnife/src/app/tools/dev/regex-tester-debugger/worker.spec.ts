import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeRegexMatch } from './engine';
import {
  DEFAULT_REGEX_TESTER_OPTIONS,
  RegexWorkerRequest,
  RegexWorkerResponse,
} from './types';
import {
  handleRegexWorkerMessage,
  RegexWatchdogRunner,
  WorkerLike,
} from './worker';

describe('Regex Tester Web Worker & ReDoS Watchdog (Seam 2)', () => {
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

  it('executes valid patterns inside handleRegexWorkerMessage and handles syntax or bad request errors cleanly', async () => {
    const msgs: RegexWorkerResponse[] = [];
    await handleRegexWorkerMessage(
      {
        type: 'match',
        requestId: 1,
        locale: 'en',
        options: {
          ...DEFAULT_REGEX_TESTER_OPTIONS,
          runReplace: true,
        },
      },
      (msg) => msgs.push(msg)
    );

    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('result');
    if (msgs[0].type === 'result') {
      expect(msgs[0].result.valid).toBe(true);
      expect(msgs[0].result.matches).toHaveLength(2);
      expect(msgs[0].result.replacedText).toBe('Dates: 19/11/2026 and 05/01/2027');
      expect(msgs[0].result.explanation.length).toBeGreaterThanOrEqual(3);
    }

    const errMsgs: RegexWorkerResponse[] = [];
    await handleRegexWorkerMessage(
      { type: 'invalid' } as unknown as RegexWorkerRequest,
      (msg) => errMsgs.push(msg)
    );
    expect(errMsgs[0]?.type).toBe('error');
  });

  it('Vector 3: watchdog terminates hung ReDoS worker on timeout and respawns a clean worker for subsequent patterns', async () => {
    const terminatedWorkers: number[] = [];
    let spawnCount = 0;

    const runner = new RegexWatchdogRunner(() => {
      const id = ++spawnCount;
      const mockWorker: WorkerLike = {
        onmessage: null,
        onerror: null,
        postMessage(req: RegexWorkerRequest) {
          // Simulate hung catastrophic backtracking on worker #1
          if (id === 1 && req.options.pattern === '(a+)+$') {
            return; // Never replies
          }
          setTimeout(() => {
            const result = executeRegexMatch(req.options, req.locale);
            mockWorker.onmessage?.({
              data: { type: 'result', requestId: req.requestId, result },
            } as MessageEvent<RegexWorkerResponse>);
          }, 5);
        },
        terminate() {
          terminatedWorkers.push(id);
        },
      };
      return mockWorker;
    });

    const timedOutResult = await runner.run({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '(a+)+$',
      testString: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
      timeoutMs: 30,
    });

    expect(timedOutResult.timedOut).toBe(true);
    expect(timedOutResult.redosWarning).toBe(true);
    expect(terminatedWorkers).toEqual([1]);

    // Immediate subsequent valid pattern respawns worker #2 cleanly
    const recoveredResult = await runner.run({
      ...DEFAULT_REGEX_TESTER_OPTIONS,
      pattern: '\\d{4}',
      testString: 'Year 2026',
      timeoutMs: 300,
    });

    expect(spawnCount).toBe(2);
    expect(recoveredResult.timedOut).toBe(false);
    expect(recoveredResult.valid).toBe(true);
    expect(recoveredResult.matches).toHaveLength(1);
    expect(recoveredResult.matches[0].value).toBe('2026');

    runner.dispose();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
