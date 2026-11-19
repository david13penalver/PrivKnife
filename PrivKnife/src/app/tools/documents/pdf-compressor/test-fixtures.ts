import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import {
  ImageReencoderFn,
  PageRasterizerFn,
  PdfCompressorOptions,
} from './types';

export const DEFAULT_COMPRESSOR_OPTIONS: PdfCompressorOptions = {
  preset: 'recommended',
  mode: 'smart_stream',
  targetDpi: 150,
  maxImageDimensionPx: 1800,
  jpegQuality: 0.72,
  convertToGrayscale: false,
  stripMetadata: true,
  removeThumbnails: true,
};

// Minimal valid 1x1 JPEG bytes (SOI..EOI)
export const MINIMAL_VALID_JPEG = new Uint8Array([
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

export interface SyntheticTextPdfOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  includeXmp?: boolean;
  includeThumb?: boolean;
}

export async function createSyntheticTextPdf(
  pageCount: number = 1,
  opts: SyntheticTextPdfOptions = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  if (opts.title) pdfDoc.setTitle(opts.title);
  if (opts.author) pdfDoc.setAuthor(opts.author);
  if (opts.subject) pdfDoc.setSubject(opts.subject);
  if (opts.keywords) pdfDoc.setKeywords(opts.keywords);

  if (opts.includeXmp) {
    const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/">${' '.repeat(
      1024
    )}</x:xmpmeta><?xpacket end="w"?>`;
    const xmpStream = pdfDoc.context.stream(xmp, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
      Length: PDFNumber.of(xmp.length),
    });
    const xmpRef = pdfDoc.context.register(xmpStream);
    pdfDoc.catalog.set(PDFName.of('Metadata'), xmpRef);
  }

  for (let i = 0; i < Math.max(1, pageCount); i++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Synthetic Document - Page ${i + 1}`, {
      x: 50,
      y: 780,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (opts.includeThumb) {
      const thumbBytes = new Uint8Array(512).fill(0xaa);
      const thumbStream = pdfDoc.context.stream(thumbBytes, {
        Type: PDFName.of('XObject'),
        Subtype: PDFName.of('Image'),
        Width: PDFNumber.of(64),
        Height: PDFNumber.of(64),
        BitsPerComponent: PDFNumber.of(8),
        ColorSpace: PDFName.of('DeviceGray'),
      });
      const thumbRef = pdfDoc.context.register(thumbStream);
      page.node.set(PDFName.of('Thumb'), thumbRef);
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}

export interface SyntheticImagePdfOptions {
  width?: number;
  height?: number;
  streamByteSize?: number;
  filter?: 'DCTDecode' | 'JBIG2Decode';
  colorSpace?: 'DeviceRGB' | 'DeviceCMYK';
  includeSoftMask?: boolean;
  includeTinyIcon?: boolean;
  pageCount?: number;
}

function buildPaddedJpegBytes(totalBytes: number): Uint8Array {
  const size = Math.max(MINIMAL_VALID_JPEG.length, totalBytes);
  const out = new Uint8Array(size);
  out.set(MINIMAL_VALID_JPEG.subarray(0, MINIMAL_VALID_JPEG.length - 2), 0);
  // Fill middle with pseudo-random non-zero pattern before EOI marker
  for (let i = MINIMAL_VALID_JPEG.length - 2; i < size - 2; i++) {
    out[i] = (i * 31 + 17) & 0xff;
  }
  out[size - 2] = 0xff;
  out[size - 1] = 0xd9;
  return out;
}

export async function createSyntheticImagePdf(
  opts: SyntheticImagePdfOptions = {}
): Promise<Uint8Array> {
  const width = opts.width ?? 2400;
  const height = opts.height ?? 1600;
  const streamByteSize = opts.streamByteSize ?? 30000;
  const filter = opts.filter ?? 'DCTDecode';
  const colorSpace = opts.colorSpace ?? 'DeviceRGB';
  const pages = Math.max(1, opts.pageCount ?? 1);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let p = 0; p < pages; p++) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    page.drawText(`Photo Page ${p + 1}`, { x: 40, y: 800, size: 14, font });

    const payload =
      filter === 'DCTDecode'
        ? buildPaddedJpegBytes(streamByteSize)
        : new Uint8Array(streamByteSize).fill(0x55);

    const imgDict: Record<string, unknown> = {
      Type: PDFName.of('XObject'),
      Subtype: PDFName.of('Image'),
      Width: PDFNumber.of(width),
      Height: PDFNumber.of(height),
      BitsPerComponent: PDFNumber.of(8),
      ColorSpace: PDFName.of(colorSpace),
      Filter: PDFName.of(filter),
    };

    let sMaskRef: PDFRef | undefined;
    if (opts.includeSoftMask) {
      const sMaskBytes = buildPaddedJpegBytes(4096);
      const sMaskStream = pdfDoc.context.stream(sMaskBytes, {
        Type: PDFName.of('XObject'),
        Subtype: PDFName.of('Image'),
        Width: PDFNumber.of(width),
        Height: PDFNumber.of(height),
        BitsPerComponent: PDFNumber.of(8),
        ColorSpace: PDFName.of('DeviceGray'),
        Filter: PDFName.of('DCTDecode'),
      });
      sMaskRef = pdfDoc.context.register(sMaskStream);
      imgDict['SMask'] = sMaskRef;
    }

    const imgStream = pdfDoc.context.stream(payload, imgDict as any);
    const imgRef = pdfDoc.context.register(imgStream);

    const xObjects = pdfDoc.context.obj({ Im0: imgRef });

    if (opts.includeTinyIcon) {
      const iconBytes = buildPaddedJpegBytes(2048);
      const iconStream = pdfDoc.context.stream(iconBytes, {
        Type: PDFName.of('XObject'),
        Subtype: PDFName.of('Image'),
        Width: PDFNumber.of(32),
        Height: PDFNumber.of(32),
        BitsPerComponent: PDFNumber.of(8),
        ColorSpace: PDFName.of('DeviceRGB'),
        Filter: PDFName.of('DCTDecode'),
      });
      const iconRef = pdfDoc.context.register(iconStream);
      xObjects.set(PDFName.of('Icon0'), iconRef);
    }

    const resources = page.node.Resources();
    if (resources) {
      resources.set(PDFName.of('XObject'), xObjects);
    }
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
    '%PDF-1.7\n%%CORRUPTED_TRUNCATED_GARBAGE_STREAM',
    (ch) => ch.charCodeAt(0)
  );
}

export function createNonPdfPngBytes(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
}

export function createMockReencoder(
  mode: number | 'throw' | 'null'
): ImageReencoderFn {
  return async () => {
    if (mode === 'throw') {
      throw new Error('Simulated canvas decode failure');
    }
    if (mode === 'null') {
      return null;
    }
    return buildPaddedJpegBytes(mode);
  };
}

export function createMockRasterizer(pageByteSize = 1500, pageCount = 2): PageRasterizerFn {
  return async (_bytes, _options, onProgress) => {
    const pages = [];
    const frame = buildPaddedJpegBytes(pageByteSize);
    for (let i = 0; i < pageCount; i++) {
      onProgress?.(i + 1, pageCount);
      pages.push({
        jpegBytes: frame,
        widthPt: 595.28,
        heightPt: 841.89,
      });
    }
    return pages;
  };
}

export function countImageStreams(pdfDoc: PDFDocument): Array<{
  ref: PDFRef;
  width: number;
  height: number;
  byteLength: number;
  colorSpace: string;
  filter: string;
}> {
  const results: Array<{
    ref: PDFRef;
    width: number;
    height: number;
    byteLength: number;
    colorSpace: string;
    filter: string;
  }> = [];

  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.get(PDFName.of('Subtype'));
    if (subtype !== PDFName.of('Image')) continue;

    const w = obj.dict.lookupMaybe(PDFName.of('Width'), PDFNumber)?.asNumber() ?? 0;
    const h = obj.dict.lookupMaybe(PDFName.of('Height'), PDFNumber)?.asNumber() ?? 0;
    const cs = obj.dict.get(PDFName.of('ColorSpace'))?.toString() ?? '';
    const filter = obj.dict.get(PDFName.of('Filter'))?.toString() ?? '';
    results.push({
      ref,
      width: w,
      height: h,
      byteLength: obj.contents.byteLength,
      colorSpace: cs,
      filter,
    });
  }

  return results;
}
