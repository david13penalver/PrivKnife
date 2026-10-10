import { ExifCategory, ExifTag, ParsedMetadata, StrippedResult } from './types';

// Known EXIF Tag IDs & Names
const EXIF_TAG_NAMES: Record<number, { name: string; category: ExifCategory; sensitive: boolean }> = {
  0x010e: { name: 'ImageDescription', category: 'Other', sensitive: false },
  0x010f: { name: 'Make', category: 'Device', sensitive: false },
  0x0110: { name: 'Model', category: 'Device', sensitive: false },
  0x0112: { name: 'Orientation', category: 'Technical', sensitive: false },
  0x011a: { name: 'XResolution', category: 'Technical', sensitive: false },
  0x011b: { name: 'YResolution', category: 'Technical', sensitive: false },
  0x0128: { name: 'ResolutionUnit', category: 'Technical', sensitive: false },
  0x0131: { name: 'Software', category: 'Device', sensitive: false },
  0x0132: { name: 'DateTime', category: 'Timestamp', sensitive: true },
  0x013b: { name: 'Artist', category: 'Other', sensitive: true },
  0x013e: { name: 'WhitePoint', category: 'Technical', sensitive: false },
  0x0211: { name: 'YCbCrCoefficients', category: 'Technical', sensitive: false },
  0x0213: { name: 'YCbCrPositioning', category: 'Technical', sensitive: false },
  0x8298: { name: 'Copyright', category: 'Other', sensitive: true },
  0x829a: { name: 'ExposureTime', category: 'Technical', sensitive: false },
  0x829d: { name: 'FNumber', category: 'Technical', sensitive: false },
  0x8827: { name: 'ISOSpeedRatings', category: 'Technical', sensitive: false },
  0x9003: { name: 'DateTimeOriginal', category: 'Timestamp', sensitive: true },
  0x9004: { name: 'DateTimeDigitized', category: 'Timestamp', sensitive: true },
  0x920a: { name: 'FocalLength', category: 'Technical', sensitive: false },
  0xa420: { name: 'ImageUniqueID', category: 'Device', sensitive: true },
  0xa431: { name: 'SerialNumber', category: 'Device', sensitive: true },
  0xa432: { name: 'LensInfo', category: 'Technical', sensitive: false },
  0xa433: { name: 'LensMake', category: 'Device', sensitive: false },
  0xa434: { name: 'LensModel', category: 'Device', sensitive: false },
};

// Known GPS Tag IDs
const GPS_TAG_NAMES: Record<number, { name: string; category: ExifCategory; sensitive: boolean }> = {
  0x0000: { name: 'GPSVersionID', category: 'Technical', sensitive: false },
  0x0001: { name: 'GPSLatitudeRef', category: 'Location', sensitive: true },
  0x0002: { name: 'GPSLatitude', category: 'Location', sensitive: true },
  0x0003: { name: 'GPSLongitudeRef', category: 'Location', sensitive: true },
  0x0004: { name: 'GPSLongitude', category: 'Location', sensitive: true },
  0x0005: { name: 'GPSAltitudeRef', category: 'Location', sensitive: true },
  0x0006: { name: 'GPSAltitude', category: 'Location', sensitive: true },
  0x0007: { name: 'GPSTimeStamp', category: 'Timestamp', sensitive: true },
  0x001d: { name: 'GPSDateStamp', category: 'Timestamp', sensitive: true },
};

/**
 * Detects image format from magic bytes.
 */
export function detectFormat(buffer: Uint8Array): 'jpeg' | 'png' | 'unknown' {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  return 'unknown';
}

/**
 * Parses EXIF metadata from JPEG or PNG buffers.
 */
export function parseMetadata(buffer: Uint8Array, fileName = 'image'): ParsedMetadata {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image buffer is empty.');
  }

  const format = detectFormat(buffer);
  if (format === 'unknown') {
    throw new Error('Unsupported image format. Only JPEG and PNG files are supported.');
  }

  if (format === 'jpeg') {
    return parseJpegMetadata(buffer, fileName);
  } else {
    return parsePngMetadata(buffer, fileName);
  }
}

/**
 * Strips all metadata from JPEG or PNG buffers without recompression.
 */
export function stripMetadata(buffer: Uint8Array, fileName = 'image'): StrippedResult {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image buffer is empty.');
  }

  const format = detectFormat(buffer);
  if (format === 'unknown') {
    throw new Error('Unsupported image format. Only JPEG and PNG files are supported.');
  }

  const initialMetadata = parseMetadata(buffer, fileName);

  if (format === 'jpeg') {
    const cleaned = stripJpegMetadata(buffer);
    return {
      cleanedBuffer: cleaned,
      originalSize: buffer.length,
      cleanedSize: cleaned.length,
      tagsRemovedCount: initialMetadata.tagCount,
      mimeType: 'image/jpeg',
    };
  } else {
    const cleaned = stripPngMetadata(buffer);
    return {
      cleanedBuffer: cleaned,
      originalSize: buffer.length,
      cleanedSize: cleaned.length,
      tagsRemovedCount: initialMetadata.tagCount,
      mimeType: 'image/png',
    };
  }
}

/* ==========================================================================
   JPEG BINARY PARSING & STRIPPING
   ========================================================================== */

function parseJpegMetadata(buffer: Uint8Array, fileName: string): ParsedMetadata {
  const tags: ExifTag[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 2; // Skip SOI (0xFF, 0xD8)

  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // EOI (End of Image) or SOS (Start of Scan)
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    // Marker without length (RST, SOI, TEM)
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) break;
    const length = view.getUint16(offset + 2, false); // Length includes the 2 length bytes
    const segmentStart = offset + 4;
    const segmentEnd = offset + 2 + length;

    // Check APP1 (0xFF, 0xE1)
    if (marker === 0xe1 && length >= 8) {
      const isExif =
        buffer[segmentStart] === 0x45 && // E
        buffer[segmentStart + 1] === 0x78 && // x
        buffer[segmentStart + 2] === 0x69 && // i
        buffer[segmentStart + 3] === 0x66 && // f
        buffer[segmentStart + 4] === 0x00 &&
        buffer[segmentStart + 5] === 0x00;

      if (isExif) {
        const tiffStart = segmentStart + 6;
        parseTiffHeader(buffer, tiffStart, segmentEnd, tags);
      } else {
        // XMP or other APP1
        tags.push({
          name: 'XMP Metadata',
          category: 'Other',
          value: 'Embedded XMP Packet',
          isSensitive: true,
        });
      }
    } else if (marker === 0xfe) {
      // COM (Comment)
      const commentBytes = buffer.slice(segmentStart, segmentEnd);
      const text = new TextDecoder().decode(commentBytes).replace(/\0/g, '').trim();
      tags.push({
        name: 'Comment',
        category: 'Other',
        value: text || 'JPEG Comment',
        isSensitive: false,
      });
    } else if (marker === 0xed) {
      // APP13 (Photoshop / IPTC)
      tags.push({
        name: 'IPTC / Photoshop',
        category: 'Other',
        value: 'Photoshop IRB / IPTC metadata',
        isSensitive: true,
      });
    }

    offset = segmentEnd;
  }

  return {
    hasMetadata: tags.length > 0,
    format: 'jpeg',
    tagCount: tags.length,
    tags,
    fileSize: buffer.length,
    fileName,
  };
}

function parseTiffHeader(
  buffer: Uint8Array,
  tiffStart: number,
  segmentEnd: number,
  tags: ExifTag[],
): void {
  if (tiffStart + 8 > segmentEnd) return;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Endianness
  const endianBytes = String.fromCharCode(buffer[tiffStart], buffer[tiffStart + 1]);
  const isLittle = endianBytes === 'II';
  if (!isLittle && endianBytes !== 'MM') return;

  const magic = view.getUint16(tiffStart + 2, isLittle);
  if (magic !== 42) return;

  const ifd0Offset = view.getUint32(tiffStart + 4, isLittle);
  if (tiffStart + ifd0Offset >= segmentEnd) return;

  parseIfd(buffer, tiffStart, tiffStart + ifd0Offset, segmentEnd, isLittle, tags, EXIF_TAG_NAMES);
}

function parseIfd(
  buffer: Uint8Array,
  tiffStart: number,
  ifdOffset: number,
  segmentEnd: number,
  isLittle: boolean,
  tags: ExifTag[],
  dictionary: Record<number, { name: string; category: ExifCategory; sensitive: boolean }>,
): void {
  if (ifdOffset + 2 > segmentEnd) return;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const entryCount = view.getUint16(ifdOffset, isLittle);
  let p = ifdOffset + 2;

  let gpsPointer: number | null = null;
  let exifPointer: number | null = null;

  for (let i = 0; i < entryCount; i++) {
    if (p + 12 > segmentEnd) break;
    const tagId = view.getUint16(p, isLittle);
    const type = view.getUint16(p + 2, isLittle);
    const count = view.getUint32(p + 4, isLittle);
    const valueOrOffset = view.getUint32(p + 8, isLittle);

    // Pointers to sub-IFDs
    if (tagId === 0x8825) {
      gpsPointer = valueOrOffset;
    } else if (tagId === 0x8769) {
      exifPointer = valueOrOffset;
    } else {
      const known = dictionary[tagId];
      const tagName = known ? known.name : `Tag 0x${tagId.toString(16).toUpperCase()}`;
      const category = known ? known.category : 'Other';
      const sensitive = known ? known.sensitive : false;

      let valueStr = '';
      if (type === 2) {
        // ASCII String
        const stringOffset = count <= 4 ? p + 8 : tiffStart + valueOrOffset;
        if (stringOffset + count <= segmentEnd) {
          const raw = buffer.slice(stringOffset, stringOffset + count);
          valueStr = new TextDecoder().decode(raw).replace(/\0/g, '').trim();
        }
      } else {
        valueStr = valueOrOffset.toString();
      }

      if (valueStr) {
        tags.push({
          id: tagId,
          name: tagName,
          category,
          value: valueStr,
          isSensitive: sensitive,
        });
      }
    }
    p += 12;
  }

  // Parse GPS sub-IFD
  if (gpsPointer && tiffStart + gpsPointer < segmentEnd) {
    parseIfd(buffer, tiffStart, tiffStart + gpsPointer, segmentEnd, isLittle, tags, GPS_TAG_NAMES);
  }

  // Parse Exif sub-IFD
  if (exifPointer && tiffStart + exifPointer < segmentEnd) {
    parseIfd(buffer, tiffStart, tiffStart + exifPointer, segmentEnd, isLittle, tags, EXIF_TAG_NAMES);
  }
}

function stripJpegMetadata(buffer: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Keep SOI
  parts.push(new Uint8Array([0xff, 0xd8]));
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOS (Start of Scan) - rest of file is entropy-coded image data until EOI
    if (marker === 0xda) {
      parts.push(buffer.slice(offset));
      break;
    }

    // EOI
    if (marker === 0xd9) {
      parts.push(new Uint8Array([0xff, 0xd9]));
      break;
    }

    // Marker without length
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(buffer.slice(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) break;
    const length = view.getUint16(offset + 2, false);
    const segmentEnd = offset + 2 + length;

    // Filter out APP1-APP15 and COM markers
    // APP1: 0xE1 (EXIF, XMP), APP2: 0xE2, APP13: 0xED (IPTC), COM: 0xFE
    const isAppMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

    if (!isAppMetadata) {
      // Retain framing segment (DQT, SOF, DHT, etc.)
      parts.push(buffer.slice(offset, segmentEnd));
    }

    offset = segmentEnd;
  }

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let p = 0;
  for (const part of parts) {
    result.set(part, p);
    p += part.length;
  }
  return result;
}

/* ==========================================================================
   PNG BINARY PARSING & STRIPPING
   ========================================================================== */

function parsePngMetadata(buffer: Uint8Array, fileName: string): ParsedMetadata {
  const tags: ExifTag[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 8; // Skip PNG header

  while (offset + 8 <= buffer.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7],
    );
    const chunkDataOffset = offset + 8;
    const chunkTotalLength = 12 + length; // 4 len + 4 type + data + 4 crc

    if (chunkDataOffset + length > buffer.length) break;

    if (type === 'tEXt') {
      const data = buffer.slice(chunkDataOffset, chunkDataOffset + length);
      const nullIdx = data.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = new TextDecoder().decode(data.slice(0, nullIdx));
        const text = new TextDecoder().decode(data.slice(nullIdx + 1));
        const isSensitive = /author|date|time|software|comment|location/i.test(keyword);
        tags.push({
          name: keyword,
          category: isSensitive ? 'Timestamp' : 'Other',
          value: text,
          isSensitive,
        });
      }
    } else if (type === 'zTXt' || type === 'iTXt') {
      const data = buffer.slice(chunkDataOffset, chunkDataOffset + length);
      const nullIdx = data.indexOf(0);
      const keyword = nullIdx !== -1 ? new TextDecoder().decode(data.slice(0, nullIdx)) : type;
      tags.push({
        name: keyword,
        category: 'Other',
        value: `Compressed metadata (${type})`,
        isSensitive: true,
      });
    } else if (type === 'eXIf') {
      tags.push({
        name: 'eXIf',
        category: 'Other',
        value: 'Embedded EXIF data block',
        isSensitive: true,
      });
    }

    offset += chunkTotalLength;
  }

  return {
    hasMetadata: tags.length > 0,
    format: 'png',
    tagCount: tags.length,
    tags,
    fileSize: buffer.length,
    fileName,
  };
}

function stripPngMetadata(buffer: Uint8Array): Uint8Array {
  const METADATA_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'dSIG']);
  const parts: Uint8Array[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Keep PNG 8-byte signature
  parts.push(buffer.slice(0, 8));
  let offset = 8;

  while (offset + 8 <= buffer.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      buffer[offset + 4],
      buffer[offset + 5],
      buffer[offset + 6],
      buffer[offset + 7],
    );
    const chunkTotalLength = 12 + length;

    if (offset + chunkTotalLength > buffer.length) break;

    // Filter out metadata chunks
    if (!METADATA_CHUNKS.has(type)) {
      parts.push(buffer.slice(offset, offset + chunkTotalLength));
    }

    offset += chunkTotalLength;
  }

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let p = 0;
  for (const part of parts) {
    result.set(part, p);
    p += part.length;
  }
  return result;
}
