import type { Worker as TesseractWorker } from 'tesseract.js';
import { openOffscreenPdf } from '../../../core/pdf/offscreen-pdf';
import { preprocessImageBuffer } from './engine';
import type { ExtractedPageResult, LocalOcrTextExtractorOptions } from './types';

export class OcrInputError extends Error {
  constructor(readonly code: 'decodeError' | 'noText') {
    super(code);
  }
}

const MAX_PIXELS = 32_000_000;

type Recognize = (canvas: OffscreenCanvas, page: number, pageCount: number) => Promise<ExtractedPageResult>;

export async function recognizeDocument(
  source: Blob,
  pdf: boolean,
  options: LocalOcrTextExtractorOptions,
  onProgress?: (percent: number) => void,
): Promise<ExtractedPageResult[]> {
  let worker: TesseractWorker | undefined;
  let currentPage = 1;
  let totalPages = 1;
  const recognize: Recognize = async (canvas, page, pageCount) => {
    currentPage = page;
    totalPages = pageCount;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new OcrInputError('decodeError');
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    preprocessImageBuffer(image.data, image.width, image.height, options);
    if (!image.data.some((value, index) => index % 4 === 0 && value < 128)) {
      return { pageNumber: page, text: '', confidence: 0, lines: [] };
    }
    context.putImageData(image, 0, 0);

    if (!worker) {
      const { default: { createWorker, OEM, PSM } } = await import('tesseract.js');
      const asset = new URL('/assets/ocr/', globalThis.location.origin);
      worker = await createWorker(options.ocrLanguage, OEM.LSTM_ONLY, {
        workerPath: new URL('worker.min.js', asset).href,
        corePath: new URL('tesseract-core-lstm.wasm.js', asset).href,
        langPath: new URL('lang/', asset).href.replace(/\/$/, ''),
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: ({ status, progress }) => {
          if (status === 'recognizing text') {
            onProgress?.(10 + Math.round(80 * (currentPage - 1 + progress) / totalPages));
          }
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: {
          auto: PSM.AUTO,
          single_block: PSM.SINGLE_BLOCK,
          single_line: PSM.SINGLE_LINE,
        }[options.pageSegmentationMode],
        preserve_interword_spaces: options.preserveTableSpacing ? '1' : '0',
      });
    }
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const { data } = await worker.recognize(blob);
    const text = data.text.trim();
    return { pageNumber: page, text, confidence: data.confidence, lines: text ? text.split('\n') : [] };
  };

  try {
    return pdf ? await recognizePdf(source, recognize, onProgress) : [await recognizeImage(source, recognize)];
  } finally {
    await worker?.terminate();
  }
}

async function recognizeImage(source: Blob, recognize: Recognize): Promise<ExtractedPageResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new OcrInputError('decodeError');
  }

  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS || typeof OffscreenCanvas === 'undefined') {
      throw new OcrInputError('decodeError');
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new OcrInputError('decodeError');
    try {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      return await recognize(canvas, 1, 1);
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    bitmap.close();
  }
}

async function recognizePdf(source: Blob, recognize: Recognize, onProgress?: (percent: number) => void) {
  const task = openOffscreenPdf(await source.arrayBuffer());
  try {
    const document = await task.promise;
    const pages: ExtractedPageResult[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      try {
        const content = await page.getTextContent();
        const text = content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
        if (text) {
          pages.push({ pageNumber: number, text, confidence: 100, lines: text.split('\n') });
          continue;
        }
        const native = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(3, Math.sqrt(MAX_PIXELS / (native.width * native.height))) });
        const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new OcrInputError('decodeError');
        try {
          await page.render({
            canvas: null,
            canvasContext: context as unknown as CanvasRenderingContext2D,
            viewport,
            background: '#fff',
          }).promise;
          pages.push(await recognize(canvas, number, document.numPages));
        } finally {
          canvas.width = canvas.height = 0;
        }
      } finally {
        page.cleanup();
        onProgress?.(10 + Math.round(80 * number / document.numPages));
      }
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
