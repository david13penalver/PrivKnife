import { PDFDocument, PDFName, PDFNumber, rgb, StandardFonts } from 'pdf-lib';
import {
  ImagesToPdfOptions,
  OutputImageFormat,
  PdfPageImageRendererFn,
  PdfToImagesOptions,
} from './types';

export const DEFAULT_PDF_TO_IMAGES_OPTIONS: PdfToImagesOptions = {
  format: 'image/png',
  dpi: 150,
  quality: 0.9,
  selectedPages: [1],
  transparentBackground: false,
};

export const DEFAULT_IMAGES_TO_PDF_OPTIONS: ImagesToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  marginPt: 24,
  jpegQuality: 0.88,
  outputFileName: 'compiled-images.pdf',
};

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const out = new Uint8Array(12 + len);
  const view = new DataView(out.buffer);
  view.setUint32(0, len);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + len, crc32(out.subarray(4, 8 + len)));
  return out;
}

/**
 * Generates an uncompressed, 100% standards-compliant RGB PNG of any dimension.
 */
export function createSolidPngBytes(
  width: number,
  height: number,
  r = 30,
  g = 64,
  b = 175
): Uint8Array {
  const rowSize = 1 + width * 3;
  const raw = new Uint8Array(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  // Zlib stored block (supports up to 65535 raw bytes)
  const zlib = new Uint8Array(2 + 5 + raw.length + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  zlib[2] = 0x01; // BFINAL=1, BTYPE=00 (no compression)
  zlib[3] = raw.length & 0xff;
  zlib[4] = (raw.length >>> 8) & 0xff;
  const nlen = ~raw.length & 0xffff;
  zlib[5] = nlen & 0xff;
  zlib[6] = (nlen >>> 8) & 0xff;
  zlib.set(raw, 7);
  const adler = adler32(raw);
  new DataView(zlib.buffer).setUint32(7 + raw.length, adler);

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const c1 = pngChunk('IHDR', ihdr);
  const c2 = pngChunk('IDAT', zlib);
  const c3 = pngChunk('IEND', new Uint8Array(0));

  const full = new Uint8Array(sig.length + c1.length + c2.length + c3.length);
  let off = 0;
  full.set(sig, off); off += sig.length;
  full.set(c1, off); off += c1.length;
  full.set(c2, off); off += c2.length;
  full.set(c3, off);
  return full;
}

export const LANDSCAPE_PNG_BYTES = createSolidPngBytes(20, 10, 37, 99, 235);
export const PORTRAIT_PNG_BYTES = createSolidPngBytes(10, 20, 16, 185, 129);

export const MINIMAL_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03,
  0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04,
  0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07, 0x07, 0x06, 0x08, 0x0c,
  0x0a, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0b, 0x0d, 0x0e, 0x12, 0x10, 0x0d, 0x0e,
  0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15,
  0x0c, 0x0f, 0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xff, 0xc0,
  0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
  0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  0x7f, 0xff, 0xd9,
]);

export async function createSyntheticPdf(pageCount = 3): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < Math.max(1, pageCount); i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Sample Document - Page ${i + 1}`, {
      x: 50,
      y: 780,
      size: 18,
      font,
      color: rgb(0.1, 0.1, 0.15),
    });
  }

  return pdfDoc.save({ useObjectStreams: false });
}

export async function createFakeEncryptedPdfBytes(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([200, 200]);
  const encDict = pdfDoc.context.obj({
    Filter: PDFName.of('Standard'),
    V: PDFNumber.of(4),
    R: PDFNumber.of(4),
    Length: PDFNumber.of(128),
  });
  const encRef = pdfDoc.context.register(encDict);
  pdfDoc.context.trailerInfo.Encrypt = encRef;
  return pdfDoc.save({ useObjectStreams: false });
}

export function createCorruptPdfBytes(): Uint8Array {
  return Uint8Array.from(
    '%PDF-1.7\n%%CORRUPTED_TRUNCATED_PDF',
    (ch) => ch.charCodeAt(0)
  );
}

export function createMockPageRenderer(
  format: OutputImageFormat,
  wasClamped = false
): PdfPageImageRendererFn {
  return async (_bytes, pageNumbers, _opts, hooks) => {
    const out = [];
    for (let i = 0; i < pageNumbers.length; i++) {
      if (hooks?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const bytes =
        format === 'image/jpeg'
          ? MINIMAL_JPEG_BYTES
          : format === 'image/webp'
            ? Uint8Array.from('RIFF\x00\x00\x00\x00WEBP', (c) => c.charCodeAt(0))
            : LANDSCAPE_PNG_BYTES;
      out.push({
        pageNumber: pageNumbers[i],
        bytes,
        mimeType: format,
        wasClamped,
      });
      hooks?.onProgress?.(i + 1, pageNumbers.length);
    }
    return out;
  };
}
