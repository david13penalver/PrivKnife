import {
  buildDataUri,
  decodeBase64ToBytes,
  encodeBytesToBase64,
  runCodecTransform,
  sniffBinaryMagicBytes,
} from './engine';
import { EncoderWorkbenchOptions, EncoderWorkbenchResult } from './types';

export interface WorkerLike {
  onmessage: ((ev: MessageEvent<EncoderWorkerResponse>) => void) | null;
  onerror: ((ev: ErrorEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
}

export type EncoderWorkerRequest =
  | {
      id: string;
      action: 'encode_file';
      bytes: Uint8Array;
      mimeType: string;
      urlSafe?: boolean;
      omitPadding?: boolean;
      wrap76?: boolean;
      asDataUri?: boolean;
    }
  | {
      id: string;
      action: 'decode_base64';
      input: string;
    }
  | {
      id: string;
      action: 'transform';
      input: string;
      options: EncoderWorkbenchOptions;
    };

export type EncoderWorkerResponse =
  | {
      id: string;
      type: 'progress';
      percent: number;
    }
  | {
      id: string;
      type: 'result';
      result: EncoderWorkbenchResult;
    }
  | {
      id: string;
      type: 'error';
      error: string;
    };

export function handleWorkerMessage(
  request: EncoderWorkerRequest,
  onProgress?: (percent: number) => void
): EncoderWorkerResponse {
  try {
    onProgress?.(10);

    if (request.action === 'encode_file') {
      onProgress?.(60);
      const outputText = request.asDataUri
        ? buildDataUri(request.bytes, request.mimeType)
        : encodeBytesToBase64(request.bytes, {
            urlSafe: request.urlSafe,
            omitPadding: request.omitPadding,
            wrap76: request.wrap76,
          });
      onProgress?.(100);
      return {
        id: request.id,
        type: 'result',
        result: {
          success: true,
          outputText,
          inputBytes: request.bytes.byteLength,
          outputBytes: new TextEncoder().encode(outputText).byteLength,
        },
      };
    }

    if (request.action === 'decode_base64') {
      onProgress?.(60);
      const { bytes, declaredMime } = decodeBase64ToBytes(request.input);
      const detectedBinary = sniffBinaryMagicBytes(bytes, declaredMime);
      const outputText = detectedBinary
        ? `[Binary payload detected: ${detectedBinary.mimeType} (${bytes.byteLength} bytes)]`
        : new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      onProgress?.(100);
      return {
        id: request.id,
        type: 'result',
        result: {
          success: true,
          outputText,
          inputBytes: new TextEncoder().encode(request.input).byteLength,
          outputBytes: bytes.byteLength,
          detectedBinary,
          decodedBytes: bytes,
        },
      };
    }

    onProgress?.(60);
    const result = runCodecTransform(request.input, request.options);
    onProgress?.(100);
    return {
      id: request.id,
      type: 'result',
      result,
    };
  } catch (err) {
    return {
      id: request.id,
      type: 'error',
      error: err instanceof Error ? err.message : 'Worker processing failed.',
    };
  }
}

const workerScope =
  typeof self !== 'undefined' &&
  typeof (self as unknown as { document?: unknown }).document === 'undefined' &&
  typeof (self as unknown as { postMessage?: unknown }).postMessage === 'function'
    ? (self as unknown as {
        addEventListener: (
          type: 'message',
          listener: (ev: MessageEvent<EncoderWorkerRequest>) => void
        ) => void;
        postMessage: (msg: EncoderWorkerResponse, transfer?: Transferable[]) => void;
      })
    : null;

if (workerScope) {
  workerScope.addEventListener('message', (ev: MessageEvent<EncoderWorkerRequest>) => {
    const req = ev.data;
    const reply = handleWorkerMessage(req, (percent) => {
      workerScope.postMessage({ id: req.id, type: 'progress', percent });
    });

    if (
      reply.type === 'result' &&
      reply.result.decodedBytes?.buffer instanceof ArrayBuffer
    ) {
      workerScope.postMessage(reply, [reply.result.decodedBytes.buffer]);
      return;
    }
    workerScope.postMessage(reply);
  });
}

interface PendingRequest {
  resolve: (result: EncoderWorkbenchResult) => void;
  reject: (reason: Error) => void;
  onProgress?: (percent: number) => void;
}

export class EncoderWorkerClient {
  private worker: WorkerLike | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(private readonly workerFactory?: () => WorkerLike) {}

  run(
    request: EncoderWorkerRequest,
    onProgress?: (percent: number) => void
  ): Promise<EncoderWorkbenchResult> {
    const worker = this.getOrCreateWorker();
    return new Promise<EncoderWorkbenchResult>((resolve, reject) => {
      this.pending.set(request.id, { resolve, reject, onProgress });
      try {
        const transfer =
          request.action === 'encode_file' &&
          request.bytes.buffer instanceof ArrayBuffer
            ? [request.bytes.buffer]
            : undefined;
        worker.postMessage(request, transfer);
      } catch (err) {
        this.pending.delete(request.id);
        reject(err instanceof Error ? err : new Error('Failed to post worker task.'));
      }
    });
  }

  dispose(): void {
    for (const [id, entry] of this.pending.entries()) {
      entry.reject(new Error(`Worker disposed while processing request "${id}".`));
    }
    this.pending.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private getOrCreateWorker(): WorkerLike {
    if (this.worker) {
      return this.worker;
    }

    const worker: WorkerLike = this.workerFactory
      ? this.workerFactory()
      : new Worker(new URL('./worker', import.meta.url), { type: 'module' });

    worker.onmessage = (ev: MessageEvent<EncoderWorkerResponse>) => {
      const msg = ev.data;
      const entry = this.pending.get(msg.id);
      if (!entry) {
        return;
      }

      if (msg.type === 'progress') {
        entry.onProgress?.(msg.percent);
        return;
      }

      this.pending.delete(msg.id);
      if (msg.type === 'error') {
        entry.reject(new Error(msg.error));
      } else {
        entry.resolve(msg.result);
      }
    };

    worker.onerror = (ev: ErrorEvent) => {
      const error = new Error(ev.message || 'Encoder Web Worker encountered an error.');
      for (const entry of this.pending.values()) {
        entry.reject(error);
      }
      this.pending.clear();
    };

    this.worker = worker;
    return worker;
  }
}
