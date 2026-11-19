import { describe, expect, it, vi } from 'vitest';
import { PNG_1X1_BASE64, PNG_1X1_DATA_URI, UTF8_SAMPLE_TEXT } from './test-fixtures';
import { DEFAULT_WORKBENCH_OPTIONS } from './types';
import {
  EncoderWorkerClient,
  EncoderWorkerRequest,
  EncoderWorkerResponse,
  WorkerLike,
  handleWorkerMessage,
} from './worker';

describe('Universal Encoder/Decoder Workbench Worker (Seam 2)', () => {
  it('handleWorkerMessage encodes file bytes to Base64/Data URI with deterministic progress and decodes binary payloads', () => {
    const progressEvents: number[] = [];
    const sampleBytes = new TextEncoder().encode('Hello PNG?');

    const encodeRes = handleWorkerMessage(
      {
        id: 'req-1',
        action: 'encode_file',
        bytes: sampleBytes,
        mimeType: 'text/plain',
        asDataUri: true,
      },
      (percent) => progressEvents.push(percent)
    );

    expect(encodeRes.type).toBe('result');
    if (encodeRes.type === 'result') {
      expect(encodeRes.result.success).toBe(true);
      expect(encodeRes.result.outputText).toMatch(/^data:text\/plain;base64,/);
      expect(encodeRes.result.inputBytes).toBe(sampleBytes.byteLength);
    }
    expect(progressEvents).toEqual([10, 60, 100]);

    const decodeRes = handleWorkerMessage({
      id: 'req-2',
      action: 'decode_base64',
      input: PNG_1X1_DATA_URI,
    });
    expect(decodeRes.type).toBe('result');
    if (decodeRes.type === 'result') {
      expect(decodeRes.result.success).toBe(true);
      expect(decodeRes.result.detectedBinary?.mimeType).toBe('image/png');
      expect(decodeRes.result.decodedBytes?.byteLength).toBe(70);
    }

    const badDecodeRes = handleWorkerMessage({
      id: 'req-3',
      action: 'decode_base64',
      input: 'invalid!base64',
    });
    expect(badDecodeRes.type).toBe('error');
    if (badDecodeRes.type === 'error') {
      expect(badDecodeRes.error).toMatch(/character|base64/i);
    }

    const transformRes = handleWorkerMessage({
      id: 'req-4',
      action: 'transform',
      input: UTF8_SAMPLE_TEXT,
      options: { ...DEFAULT_WORKBENCH_OPTIONS, mode: 'hex' },
    });
    expect(transformRes.type).toBe('result');
    if (transformRes.type === 'result') {
      expect(transformRes.result.success).toBe(true);
      expect(transformRes.result.outputText).toContain('50 72 69 76');
    }
  });

  it('EncoderWorkerClient dispatches messages, forwards progress/results, handles worker.onerror, and calls terminate() on dispose', async () => {
    const progressLog: number[] = [];
    const postedRequests: EncoderWorkerRequest[] = [];
    let activeMockWorker: MockWorker | null = null;

    class MockWorker implements WorkerLike {
      onmessage: ((ev: MessageEvent<EncoderWorkerResponse>) => void) | null = null;
      onerror: ((ev: ErrorEvent) => void) | null = null;
      terminate = vi.fn();

      postMessage(msg: EncoderWorkerRequest): void {
        postedRequests.push(msg);
        if (msg.id === 'req-fail') {
          this.onerror?.(new ErrorEvent('error', { message: 'Worker crashed' }));
          return;
        }
        this.onmessage?.({
          data: { id: msg.id, type: 'progress', percent: 50 },
        } as MessageEvent<EncoderWorkerResponse>);
        const reply = handleWorkerMessage(msg);
        this.onmessage?.({
          data: reply,
        } as MessageEvent<EncoderWorkerResponse>);
      }
    }

    const client = new EncoderWorkerClient(() => {
      activeMockWorker = new MockWorker();
      return activeMockWorker;
    });

    const result = await client.run(
      {
        id: 'req-ok',
        action: 'decode_base64',
        input: PNG_1X1_BASE64,
      },
      (pct) => progressLog.push(pct)
    );
    expect(postedRequests).toHaveLength(1);
    expect(progressLog).toEqual([50]);
    expect(result.detectedBinary?.mimeType).toBe('image/png');

    await expect(
      client.run({
        id: 'req-fail',
        action: 'decode_base64',
        input: 'abc',
      })
    ).rejects.toThrow(/Worker crashed/i);

    client.dispose();
    expect(activeMockWorker).not.toBeNull();
    expect(activeMockWorker!.terminate).toHaveBeenCalledTimes(1);
  });
});
