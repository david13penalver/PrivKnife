/// <reference lib="webworker" />

import { detectRedosHazard, executeRegexMatch, explainRegexPattern } from './engine';
import {
  RegexTesterOptions,
  RegexTesterResult,
  RegexWorkerRequest,
  RegexWorkerResponse,
} from './types';

export interface WorkerLike {
  onmessage: ((event: MessageEvent<RegexWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage: (data: RegexWorkerRequest) => void;
  terminate: () => void;
}

export class RegexWatchdogRunner {
  private activeWorker: WorkerLike | null = null;
  private requestSeq = 0;
  private activeTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingResolve: ((res: RegexTesterResult) => void) | null = null;
  private activeRequestId = 0;

  constructor(private readonly workerFactory: () => WorkerLike) {}

  run(
    options: RegexTesterOptions,
    locale: 'en' | 'es' = 'en'
  ): Promise<RegexTesterResult> {
    this.clearPendingTimer();

    if (this.pendingResolve) {
      // Cancel superseded in-flight match cleanly
      const prevResolve = this.pendingResolve;
      this.pendingResolve = null;
      prevResolve({
        valid: true,
        timedOut: false,
        truncated: false,
        matches: [],
        explanation: [],
        executionMs: 0,
      });
    }

    const requestId = ++this.requestSeq;
    this.activeRequestId = requestId;
    const timeoutMs = Math.max(20, Math.min(10_000, options.timeoutMs || 1500));

    if (!this.activeWorker) {
      this.activeWorker = this.createBoundWorker();
    }

    return new Promise<RegexTesterResult>((resolve) => {
      this.pendingResolve = resolve;

      this.activeTimer = setTimeout(() => {
        if (this.activeRequestId !== requestId || !this.pendingResolve) return;
        this.pendingResolve = null;
        this.activeTimer = null;
        this.terminateCurrentWorker();

        resolve({
          valid: true,
          timedOut: true,
          redosWarning: true,
          staticRedosHazard: detectRedosHazard(options.pattern),
          truncated: false,
          matches: [],
          replacedText: undefined,
          explanation: explainRegexPattern(options.pattern, options.flags, locale),
          executionMs: timeoutMs,
        });
      }, timeoutMs);

      this.activeWorker!.postMessage({
        type: 'match',
        requestId,
        options,
        locale,
      });
    });
  }

  dispose(): void {
    this.clearPendingTimer();
    this.pendingResolve = null;
    this.terminateCurrentWorker();
  }

  private createBoundWorker(): WorkerLike {
    const worker = this.workerFactory();

    worker.onmessage = (event: MessageEvent<RegexWorkerResponse>) => {
      const msg = event.data;
      if (!msg || msg.requestId !== this.activeRequestId || !this.pendingResolve) {
        return;
      }
      this.clearPendingTimer();
      const resolve = this.pendingResolve;
      this.pendingResolve = null;

      if (msg.type === 'result') {
        resolve(msg.result);
      } else {
        resolve({
          valid: false,
          syntaxError: msg.error || 'Worker execution failed.',
          timedOut: false,
          truncated: false,
          matches: [],
          explanation: [],
          executionMs: 0,
        });
      }
    };

    worker.onerror = () => {
      this.clearPendingTimer();
      this.terminateCurrentWorker();
      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve({
          valid: false,
          syntaxError: 'Regex execution worker crashed unexpectedly.',
          timedOut: false,
          truncated: false,
          matches: [],
          explanation: [],
          executionMs: 0,
        });
      }
    };

    return worker;
  }

  private terminateCurrentWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private clearPendingTimer(): void {
    if (this.activeTimer !== null) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }
}

export async function handleRegexWorkerMessage(
  data: RegexWorkerRequest,
  post: (msg: RegexWorkerResponse) => void
): Promise<void> {
  if (!data || data.type !== 'match') {
    post({
      type: 'error',
      requestId: (data as { requestId?: number } | undefined)?.requestId ?? 0,
      error: 'Unsupported Regex worker request payload.',
    });
    return;
  }

  try {
    const result = executeRegexMatch(data.options, data.locale ?? 'en');
    post({
      type: 'result',
      requestId: data.requestId,
      result,
    });
  } catch (err: unknown) {
    post({
      type: 'error',
      requestId: data.requestId,
      error:
        err instanceof Error
          ? err.message
          : 'Regular expression worker execution failed.',
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<RegexWorkerRequest>) => {
    void handleRegexWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
