import { Injectable, OnDestroy, signal } from '@angular/core';
import type {
  LocalOcrTextExtractorOptions,
  LocalOcrTextExtractorResult,
  LocalOcrWorkerRequest,
  LocalOcrWorkerResponse,
} from './types';

type OcrError = 'decodeError' | 'noText' | 'workerError';

@Injectable()
export class OcrJob implements OnDestroy {
  readonly busy = signal(false);
  readonly progress = signal(0);
  readonly result = signal<LocalOcrTextExtractorResult | null>(null);
  readonly error = signal<OcrError | null>(null);
  private cancelCurrent?: () => void;

  clear(): void {
    this.cancelCurrent?.();
    this.result.set(null);
    this.error.set(null);
    this.progress.set(0);
  }

  async run(file: Blob, originalFileName: string, options: LocalOcrTextExtractorOptions): Promise<void> {
    this.clear();
    this.busy.set(true);

    return new Promise<void>((resolve) => {
      let worker: Worker | undefined;
      const cancel = () => {
        if (worker) {
          worker.onmessage = null;
          worker.onerror = null;
          worker.onmessageerror = null;
          worker.terminate();
        }
        this.cancelCurrent = undefined;
        this.busy.set(false);
        resolve();
      };
      this.cancelCurrent = cancel;
      const isCurrent = () => this.cancelCurrent === cancel;
      const fail = (code: OcrError) => {
        if (!isCurrent()) return;
        this.error.set(code);
        cancel();
      };
      void (async () => {
        try {
          const fileBuffer = await file.arrayBuffer();
          if (!isCurrent()) return;
          worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = ({ data }: MessageEvent<LocalOcrWorkerResponse>) => {
            if (!isCurrent()) return;
            if (data.type === 'progress' && typeof data.progress === 'number') {
              this.progress.update((last) => Math.max(last, Math.min(100, data.progress!)));
            } else if (data.type === 'ocr') {
              if (data.success && data.result) {
                this.result.set(data.result);
                this.progress.set(100);
                cancel();
              } else {
                fail(data.error === 'decodeError' || data.error === 'noText' ? data.error : 'workerError');
              }
            }
          };
          worker.onerror = () => fail('workerError');
          worker.onmessageerror = () => fail('workerError');
          worker.postMessage({ type: 'ocr', fileBuffer, options, originalFileName } satisfies LocalOcrWorkerRequest, [fileBuffer]);
        } catch {
          fail('workerError');
        }
      })();
    });
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
