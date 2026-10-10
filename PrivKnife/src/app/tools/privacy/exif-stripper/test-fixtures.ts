/**
 * Independent synthetic binary fixtures for EXIF & Metadata Stripper testing.
 * These fixtures avoid reliance on external files, network requests, or mock abstractions.
 */

// Simple CRC32 implementation for valid PNG chunk generation
function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length;
  const chunk = new Uint8Array(12 + length);
  const view = new DataView(chunk.buffer);

  // Length (4 bytes, Big-Endian)
  view.setUint32(0, length, false);

  // Type (4 bytes)
  const typeBytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    typeBytes[i] = type.charCodeAt(i);
    chunk[4 + i] = typeBytes[i];
  }

  // Data
  chunk.set(data, 8);

  // CRC calculated over Type + Data
  const typeAndData = new Uint8Array(4 + length);
  typeAndData.set(typeBytes, 0);
  typeAndData.set(data, 4);
  const crc = calculateCrc32(typeAndData);
  view.setUint32(8 + length, crc, false);

  return chunk;
}

/**
 * Creates a valid synthetic JPEG containing an APP1 EXIF segment with:
 * - Make: "PrivKnife Camera"
 * - Model: "PK-100"
 * - DateTime: "2026:10:10 12:00:00"
 * - GPS Latitude Ref: "N", Longitude Ref: "W"
 */
export function createMockJpegWithExif(): Uint8Array {
  const parts: Uint8Array[] = [];

  // SOI (Start of Image)
  parts.push(new Uint8Array([0xff, 0xd8]));

  // APP1 Exif Header: "Exif\0\0" (6 bytes)
  const exifHeader = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

  const makeStr = new TextEncoder().encode('PrivKnife\0');
  const modelStr = new TextEncoder().encode('PK-100\0');
  const dateStr = new TextEncoder().encode('2026:10:10 12:00:00\0');

  const ifd0Start = 8;
  const ifd0Count = 4;
  const ifd0Size = 2 + (ifd0Count * 12) + 4; // 2 + 48 + 4 = 54
  const afterIfd0 = ifd0Start + ifd0Size; // 62

  const makeOffset = afterIfd0;
  const modelOffset = makeOffset + makeStr.length;
  const dateOffset = modelOffset + modelStr.length;
  const gpsIfdOffset = dateOffset + dateStr.length;

  const gpsEntries = 2;
  const gpsIfdSize = 2 + (gpsEntries * 12) + 4; // 30 bytes
  const totalTiffSize = gpsIfdOffset + gpsIfdSize;

  const tiff = new Uint8Array(totalTiffSize);
  const view = new DataView(tiff.buffer);

  // TIFF Header (Little Endian 'II')
  tiff[0] = 0x49;
  tiff[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifd0Start, true);

  // IFD0
  let p = ifd0Start;
  view.setUint16(p, ifd0Count, true);
  p += 2;

  // Make (0x010F, ASCII = 2)
  view.setUint16(p, 0x010f, true); p += 2;
  view.setUint16(p, 2, true); p += 2;
  view.setUint32(p, makeStr.length, true); p += 4;
  view.setUint32(p, makeOffset, true); p += 4;

  // Model (0x0110, ASCII = 2)
  view.setUint16(p, 0x0110, true); p += 2;
  view.setUint16(p, 2, true); p += 2;
  view.setUint32(p, modelStr.length, true); p += 4;
  view.setUint32(p, modelOffset, true); p += 4;

  // DateTime (0x0132, ASCII = 2)
  view.setUint16(p, 0x0132, true); p += 2;
  view.setUint16(p, 2, true); p += 2;
  view.setUint32(p, dateStr.length, true); p += 4;
  view.setUint32(p, dateOffset, true); p += 4;

  // GPSInfo IFD pointer (0x8825, LONG = 4)
  view.setUint16(p, 0x8825, true); p += 2;
  view.setUint16(p, 4, true); p += 2;
  view.setUint32(p, 1, true); p += 4;
  view.setUint32(p, gpsIfdOffset, true); p += 4;

  // Next IFD = 0
  view.setUint32(p, 0, true);

  // Copy strings into TIFF buffer
  tiff.set(makeStr, makeOffset);
  tiff.set(modelStr, modelOffset);
  tiff.set(dateStr, dateOffset);

  // GPS IFD
  p = gpsIfdOffset;
  view.setUint16(p, gpsEntries, true);
  p += 2;

  // GPSLatitudeRef (0x0001, ASCII 2, "N\0")
  view.setUint16(p, 0x0001, true); p += 2;
  view.setUint16(p, 2, true); p += 2;
  view.setUint32(p, 2, true); p += 4;
  tiff[p] = 0x4e; // 'N'
  tiff[p + 1] = 0x00;
  p += 4;

  // GPSLongitudeRef (0x0003, ASCII 2, "W\0")
  view.setUint16(p, 0x0003, true); p += 2;
  view.setUint16(p, 2, true); p += 2;
  view.setUint32(p, 2, true); p += 4;
  tiff[p] = 0x57; // 'W'
  tiff[p + 1] = 0x00;
  p += 4;

  view.setUint32(p, 0, true);

  // Combine Exif header + TIFF payload
  const app1Payload = new Uint8Array(exifHeader.length + tiff.length);
  app1Payload.set(exifHeader, 0);
  app1Payload.set(tiff, exifHeader.length);

  // APP1 marker (0xFF, 0xE1) + Length (2 bytes Big-Endian)
  const app1Marker = new Uint8Array(4);
  app1Marker[0] = 0xff;
  app1Marker[1] = 0xe1;
  const app1Len = 2 + app1Payload.length;
  app1Marker[2] = (app1Len >> 8) & 0xff;
  app1Marker[3] = app1Len & 0xff;

  parts.push(app1Marker);
  parts.push(app1Payload);

  // DQT segment
  parts.push(new Uint8Array([0xff, 0xdb, 0x00, 0x05, 0x00, 0x01, 0x01]));
  // SOF0 segment
  parts.push(new Uint8Array([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]));
  // SOS segment
  parts.push(new Uint8Array([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]));
  // Minimal image data + EOI
  parts.push(new Uint8Array([0x00, 0xff, 0xd9]));

  // Concatenate parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/**
 * Creates a clean JPEG without any APP metadata markers.
 */
export function createMockJpegClean(): Uint8Array {
  const parts: Uint8Array[] = [
    new Uint8Array([0xff, 0xd8]), // SOI
    new Uint8Array([0xff, 0xdb, 0x00, 0x05, 0x00, 0x01, 0x01]), // DQT
    new Uint8Array([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]), // SOF0
    new Uint8Array([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]), // SOS
    new Uint8Array([0x00, 0xff, 0xd9]), // Data + EOI
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/**
 * Creates a valid synthetic PNG with metadata chunks:
 * - tEXt chunk: "Author\0PrivKnife User"
 * - tEXt chunk: "Software\0PrivKnife Studio"
 */
export function createMockPngWithMetadata(): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: 1x1, 8-bit truecolor (13 bytes)
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 1, false); // width
  view.setUint32(4, 1, false); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const ihdrChunk = createPngChunk('IHDR', ihdr);

  // Metadata tEXt chunks
  const authorData = new TextEncoder().encode('Author\0PrivKnife User');
  const authorChunk = createPngChunk('tEXt', authorData);

  const softwareData = new TextEncoder().encode('Software\0PrivKnife Studio');
  const softwareChunk = createPngChunk('tEXt', softwareData);

  // Minimal IDAT chunk (1x1 pixel raw deflate stream)
  const idatData = new Uint8Array([0x78, 0x9c, 0x63, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01]);
  const idatChunk = createPngChunk('IDAT', idatData);

  // IEND chunk
  const iendChunk = createPngChunk('IEND', new Uint8Array(0));

  const chunks = [sig, ihdrChunk, authorChunk, softwareChunk, idatChunk, iendChunk];
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Creates a clean valid PNG without any metadata chunks.
 */
export function createMockPngClean(): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 1, false);
  view.setUint32(4, 1, false);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const ihdrChunk = createPngChunk('IHDR', ihdr);

  const idatData = new Uint8Array([0x78, 0x9c, 0x63, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01]);
  const idatChunk = createPngChunk('IDAT', idatData);

  const iendChunk = createPngChunk('IEND', new Uint8Array(0));

  const chunks = [sig, ihdrChunk, idatChunk, iendChunk];
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

/**
 * Creates an invalid / corrupt byte array.
 */
export function createMockCorruptedFile(): Uint8Array {
  return new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
}
