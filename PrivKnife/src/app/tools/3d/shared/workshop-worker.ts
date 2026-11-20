/// <reference lib="webworker" />

import type { MeshPart } from './mesh';
import type { WorkshopMetrics, WorkshopPost, WorkshopRequest } from './workshop-protocol';

interface WorkshopEngine<T> {
  validate(options: T): { valid: boolean; error?: string };
  generate(options: T): MeshPart[];
  metrics(options: T, parts: MeshPart[]): WorkshopMetrics;
  stl(parts: MeshPart[]): ArrayBuffer;
  threeMf(options: T, parts: MeshPart[]): Promise<Blob>;
  preview?(options: T, parts: MeshPart[]): void;
}

export function makeWorkshopHandler<T>(engine: WorkshopEngine<T>) {
  return async (request: WorkshopRequest<T>, post: WorkshopPost): Promise<void> => {
    if (!request || !['preview', 'stl', '3mf'].includes(request.type)) {
      post({ type: 'error', key: 'invalid' });
      return;
    }
    let parts: MeshPart[] = [];
    try {
      const validation = engine.validate(request.options);
      if (!validation.valid) {
        post({ type: 'error', key: validation.error ?? 'invalid' });
        return;
      }
      post({ type: 'progress', percent: 10 });
      parts = engine.generate(request.options);
      const metrics = engine.metrics(request.options, parts);
      post({ type: 'progress', percent: 70 });
      if (request.type === 'preview') {
        engine.preview?.(request.options, parts);
        const payload = parts.map(({ geometry, material }) => ({
          positions: Float32Array.from(geometry.attributes['position'].array).buffer,
          indices: geometry.index ? Uint32Array.from(geometry.index.array).buffer : null,
          material: material ?? 0,
        }));
        const transfers = payload.flatMap(({ positions, indices }) => indices ? [positions, indices] : [positions]);
        post({ type: 'progress', percent: 100 });
        post({ type: 'preview', parts: payload, metrics }, transfers);
      } else {
        const buffer = request.type === 'stl'
          ? engine.stl(parts)
          : await (await engine.threeMf(request.options, parts)).arrayBuffer();
        post({ type: 'progress', percent: 100 });
        post({ type: 'download', buffer, metrics }, [buffer]);
      }
    } catch {
      post({ type: 'error', key: 'generationError' });
    } finally {
      parts.forEach(({ geometry }) => geometry.dispose());
    }
  };
}

export function listenForWorkshopRequests<T>(handler: ReturnType<typeof makeWorkshopHandler<T>>): void {
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    addEventListener('message', (event: MessageEvent<WorkshopRequest<T>>) => {
      void handler(event.data, (message, transfer) => postMessage(message, { transfer }));
    });
  }
}
