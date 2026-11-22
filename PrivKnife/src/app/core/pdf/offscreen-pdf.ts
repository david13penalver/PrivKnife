import { getDocument, PDFWorker } from 'pdfjs-dist';

type Surface = { canvas: OffscreenCanvas | null; context: OffscreenCanvasRenderingContext2D | null };

class OffscreenCanvasFactory {
  create(width: number, height: number): Surface {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF canvas rendering is unavailable.');
    return { canvas, context };
  }

  reset(surface: Surface, width: number, height: number): void {
    if (!surface.canvas) throw new Error('PDF canvas has already been released.');
    surface.canvas.width = width;
    surface.canvas.height = height;
  }

  destroy(surface: Surface): void {
    this.reset(surface, 0, 0);
    surface.canvas = null;
    surface.context = null;
  }
}

export function openOffscreenPdf(buffer: ArrayBuffer) {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('PDF canvas rendering is unavailable.');
  }
  const origin = globalThis.location.origin;
  const port = new Worker(new URL('/pdf.worker.min.mjs', origin), { type: 'module' });
  const worker = PDFWorker.create({ port });
  try {
    const task = getDocument({
      data: new Uint8Array(buffer),
      worker,
      CanvasFactory: OffscreenCanvasFactory,
      disableFontFace: true,
      useWorkerFetch: false,
      useSystemFonts: false,
      standardFontDataUrl: new URL('/assets/pdf/standard-fonts/', origin).href,
      wasmUrl: new URL('/assets/pdf/wasm/', origin).href,
      stopAtErrors: true,
    });
    let portFailed = false;
    const failed = new Promise<never>((_, reject) => {
      port.addEventListener('error', () => {
        portFailed = true;
        reject(new Error('PDF rendering worker failed.'));
      }, { once: true });
    });
    return {
      promise: Promise.race([task.promise, failed]),
      async destroy() {
        try {
          if (!portFailed) await task.destroy();
        } finally {
          worker.destroy();
          port.terminate();
        }
      },
    };
  } catch (error) {
    worker.destroy();
    port.terminate();
    throw error;
  }
}
