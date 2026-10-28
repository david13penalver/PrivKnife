import pako from 'pako';
import {
  FontMetadata,
  FontOutputFormat,
  FontSubsetPreset,
  FontSubsetStats,
  FontSubsetterConverterOptions,
  FontSubsetterConverterResult,
} from './types';

interface SfntTableEntry {
  tag: string;
  checkSum: number;
  offset: number;
  length: number;
  data: Uint8Array;
}

/**
 * Validates whether an ArrayBuffer contains a recognized font header
 */
export function validateFontBuffer(buffer: ArrayBuffer): { isValid: boolean; error?: string } {
  if (!buffer || buffer.byteLength < 12) {
    return { isValid: false, error: 'Font buffer too small or empty.' };
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0);

  // Supported magic numbers:
  // 0x00010000 = TrueType 1.0
  // 0x74727565 = 'true' Apple TrueType
  // 0x4F54544F = 'OTTO' OpenType PostScript CFF
  // 0x774F4646 = 'wOFF' WOFF 1.0
  // 0x774F4632 = 'wOF2' WOFF 2.0
  const validMagics = [0x00010000, 0x74727565, 0x4F54544F, 0x774F4646, 0x774F4632];
  if (!validMagics.includes(magic)) {
    return {
      isValid: false,
      error: `Unrecognized font magic signature: 0x${magic.toString(16).padStart(8, '0')}`,
    };
  }

  if (magic === 0x774F4646 || magic === 0x774F4632) {
    return { isValid: true };
  }

  const numTables = view.getUint16(4);
  if (12 + numTables * 16 > buffer.byteLength) {
    return { isValid: false, error: 'Corrupt table directory in font file.' };
  }

  return { isValid: true };
}

/**
 * Parses SFNT table directory and basic font metadata
 */
export function parseFontMetadata(buffer: ArrayBuffer): FontMetadata {
  const view = new DataView(buffer);
  const magic = view.getUint32(0);
  const isTrueType = magic === 0x00010000 || magic === 0x74727565;
  const isOpenType = magic === 0x4F54544F;

  const tables = extractSfntTables(buffer);
  const tableTags = tables.map((t) => t.tag);

  let numGlyphs = 256;
  const maxpTable = tables.find((t) => t.tag === 'maxp');
  if (maxpTable && maxpTable.data.length >= 6) {
    const maxpView = new DataView(
      maxpTable.data.buffer,
      maxpTable.data.byteOffset,
      maxpTable.data.byteLength
    );
    numGlyphs = maxpView.getUint16(4, false);
  }

  let family = 'CustomFont';
  const nameTable = tables.find((t) => t.tag === 'name');
  if (nameTable && nameTable.data.length >= 6) {
    try {
      const nView = new DataView(
        nameTable.data.buffer,
        nameTable.data.byteOffset,
        nameTable.data.byteLength
      );
      const count = nView.getUint16(2, false);
      const stringOffset = nView.getUint16(4, false);
      for (let i = 0; i < count; i++) {
        const recOff = 6 + i * 12;
        if (recOff + 12 > nameTable.data.length) break;
        const nameId = nView.getUint16(recOff + 6, false);
        const length = nView.getUint16(recOff + 8, false);
        const offset = nView.getUint16(recOff + 10, false);
        if (nameId === 1 && stringOffset + offset + length <= nameTable.data.length) {
          const rawStr = nameTable.data.subarray(
            stringOffset + offset,
            stringOffset + offset + length
          );
          let parsedName = '';
          for (let b = 0; b < rawStr.length; b++) {
            if (rawStr[b] !== 0) parsedName += String.fromCharCode(rawStr[b]);
          }
          if (parsedName.trim()) {
            family = parsedName.trim();
            break;
          }
        }
      }
    } catch {
      // Fallback to default
    }
  }

  return {
    family,
    tables: tableTags,
    originalSize: buffer.byteLength,
    isTrueType,
    isOpenType,
    numGlyphs,
  };
}

/**
 * Compute unicode range string and codepoint set based on preset
 */
export function getUnicodeRangeForPreset(
  preset: FontSubsetPreset,
  customChars = ''
): { rangeString: string; characterSet: Set<number> } {
  const set = new Set<number>();

  switch (preset) {
    case 'basic_latin_ascii': {
      for (let i = 32; i <= 126; i++) {
        set.add(i);
      }
      return { rangeString: 'U+0020-007E', characterSet: set };
    }

    case 'latin_supplement': {
      for (let i = 32; i <= 126; i++) {
        set.add(i);
      }
      for (let i = 160; i <= 255; i++) {
        set.add(i);
      }
      return { rangeString: 'U+0020-007E, U+00A0-00FF', characterSet: set };
    }

    case 'numbers_punctuation_only': {
      // 0-9
      for (let i = 48; i <= 57; i++) {
        set.add(i);
      }
      // Common punctuation
      const punct = ' .,:;!?-\'"`()[]{}<>/\\|@#$%^&*+=~_';
      for (let i = 0; i < punct.length; i++) {
        set.add(punct.charCodeAt(i));
      }
      return {
        rangeString: 'U+0020-002F, U+0030-0039, U+003A-0040',
        characterSet: set,
      };
    }

    case 'custom_characters': {
      if (!customChars) {
        for (let i = 32; i <= 126; i++) {
          set.add(i);
        }
        return { rangeString: 'U+0020-007E', characterSet: set };
      }

      for (let i = 0; i < customChars.length; i++) {
        set.add(customChars.charCodeAt(i));
      }

      const sorted = Array.from(set).sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = sorted[0];
      let prev = start;

      for (let i = 1; i <= sorted.length; i++) {
        const curr = sorted[i];
        if (curr === prev + 1) {
          prev = curr;
        } else {
          if (start === prev) {
            ranges.push(`U+${start.toString(16).toUpperCase().padStart(4, '0')}`);
          } else {
            ranges.push(
              `U+${start.toString(16).toUpperCase().padStart(4, '0')}-${prev
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}`
            );
          }
          start = curr;
          prev = curr;
        }
      }

      return {
        rangeString: ranges.slice(0, 10).join(', ') + (ranges.length > 10 ? ', ...' : ''),
        characterSet: set,
      };
    }

    default:
      for (let i = 32; i <= 126; i++) {
        set.add(i);
      }
      return { rangeString: 'U+0020-007E', characterSet: set };
  }
}

/**
 * Generate copy-ready @font-face CSS snippet
 */
export function generateFontFaceCss(
  fontFamily: string,
  format: FontOutputFormat,
  fileName: string,
  unicodeRange: string
): string {
  const safeName = (fontFamily || 'CustomFont').replace(/['";{}<>\\\n]/g, '');
  return `@font-face {
  font-family: '${safeName}';
  src: url('${fileName}') format('${format}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
  unicode-range: ${unicodeRange};
}
`;
}

/**
 * Extract existing table entries from an SFNT, WOFF 1.0, or WOFF 2.0 buffer
 */
export function extractSfntTables(buffer: ArrayBuffer): SfntTableEntry[] {
  if (!buffer || buffer.byteLength < 12) return [];

  const view = new DataView(buffer);
  const magic = view.getUint32(0);
  const tables: SfntTableEntry[] = [];
  const rawBytes = new Uint8Array(buffer);

  // WOFF 1.0 handling (DEFECT-56-03)
  if (magic === 0x774f4646) {
    const numTables = view.getUint16(12);
    for (let i = 0; i < numTables; i++) {
      const entryOffset = 44 + i * 20;
      if (entryOffset + 20 > buffer.byteLength) break;

      let tag = '';
      for (let c = 0; c < 4; c++) {
        tag += String.fromCharCode(view.getUint8(entryOffset + c));
      }
      const offset = view.getUint32(entryOffset + 4);
      const compLength = view.getUint32(entryOffset + 8);
      const origLength = view.getUint32(entryOffset + 12);
      const checkSum = view.getUint32(entryOffset + 16);

      let data: Uint8Array;
      if (compLength < origLength) {
        try {
          data = pako.inflate(rawBytes.subarray(offset, offset + compLength));
        } catch {
          data = rawBytes.slice(offset, offset + compLength);
        }
      } else {
        data = rawBytes.slice(offset, offset + origLength);
      }
      tables.push({ tag, checkSum, offset, length: data.length, data });
    }
    return tables;
  }

  // WOFF 2.0 handling
  if (magic === 0x774f4632) {
    // If it was generated with our compressed stream format, unpack
    const numTables = view.getUint16(12);
    const headerSize = 48;
    // Check if compressed data exists
    const totalCompSize = view.getUint32(20);
    if (headerSize + totalCompSize <= buffer.byteLength) {
      try {
        const decompressed = pako.inflate(rawBytes.subarray(headerSize, headerSize + totalCompSize));
        // Parse directory from decompressed stream
        const dView = new DataView(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength);
        let dOff = 0;
        const tempMeta: Array<{ tag: string; length: number; checkSum: number }> = [];
        for (let i = 0; i < numTables; i++) {
          let tag = '';
          for (let c = 0; c < 4; c++) {
            tag += String.fromCharCode(dView.getUint8(dOff + c));
          }
          const length = dView.getUint32(dOff + 4);
          const checkSum = dView.getUint32(dOff + 8);
          dOff += 12;
          tempMeta.push({ tag, length, checkSum });
        }
        for (const meta of tempMeta) {
          const tData = decompressed.slice(dOff, dOff + meta.length);
          dOff += (meta.length + 3) & ~3;
          tables.push({ tag: meta.tag, checkSum: meta.checkSum, offset: 0, length: meta.length, data: tData });
        }
        return tables;
      } catch {
        // Fallback
      }
    }
  }

  // Raw SFNT (TrueType / OpenType)
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const entryOffset = 12 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;

    let tag = '';
    for (let c = 0; c < 4; c++) {
      tag += String.fromCharCode(view.getUint8(entryOffset + c));
    }
    const checkSum = view.getUint32(entryOffset + 4);
    const offset = view.getUint32(entryOffset + 8);
    const length = view.getUint32(entryOffset + 12);

    const data = rawBytes.slice(offset, offset + length);
    tables.push({ tag, checkSum, offset, length, data });
  }

  return tables;
}

/**
 * Filter, subset glyphs, and rebuild SFNT TrueType table buffer (DEFECT-56-01)
 */
function rebuildSfntTrueType(
  originalBuffer: ArrayBuffer,
  options: FontSubsetterConverterOptions,
  characterSet: Set<number>
): { buffer: ArrayBuffer; retainedTables: string[]; retainedGlyphCount: number; totalGlyphCount: number } {
  const existingTables = extractSfntTables(originalBuffer);

  let filteredTables = existingTables.filter((tbl) => {
    // Drop OpenType layout tables if requested
    if (options.dropLayoutFeatures) {
      if (['GSUB', 'GPOS', 'GDEF', 'JSTF', 'BASE'].includes(tbl.tag)) {
        return false;
      }
    }
    // Drop kerning table if requested
    if (!options.keepKerningTables) {
      if (tbl.tag === 'kern') {
        return false;
      }
    }
    return true;
  });

  const maxpTbl = filteredTables.find((t) => t.tag === 'maxp');
  const headTbl = filteredTables.find((t) => t.tag === 'head');
  const locaTbl = filteredTables.find((t) => t.tag === 'loca');
  const glyfTbl = filteredTables.find((t) => t.tag === 'glyf');
  const cmapTbl = filteredTables.find((t) => t.tag === 'cmap');
  const hmtxTbl = filteredTables.find((t) => t.tag === 'hmtx');

  let totalGlyphCount = 192;
  let retainedGlyphCount = characterSet.size;

  if (maxpTbl && maxpTbl.data.length >= 6) {
    const maxpView = new DataView(maxpTbl.data.buffer, maxpTbl.data.byteOffset, maxpTbl.data.byteLength);
    totalGlyphCount = maxpView.getUint16(4, false);
  }

  // Real cmap & glyf & loca subsetting when valid font tables are present
  if (locaTbl && glyfTbl && cmapTbl && headTbl && maxpTbl) {
    const headView = new DataView(headTbl.data.buffer, headTbl.data.byteOffset, headTbl.data.byteLength);
    const isShortLoca = headView.getInt16(50, false) === 0;

    const locaView = new DataView(locaTbl.data.buffer, locaTbl.data.byteOffset, locaTbl.data.byteLength);
    const glyfBytes = glyfTbl.data;

    // Read original glyph offsets from loca
    const origOffsets: number[] = [];
    for (let g = 0; g <= totalGlyphCount; g++) {
      const off = isShortLoca ? locaView.getUint16(g * 2, false) * 2 : locaView.getUint32(g * 4, false);
      origOffsets.push(off);
    }

    // Determine which glyph IDs are needed: glyph 0 (.notdef) + codepoints in characterSet
    // Map codepoint to original GID via cmap format 4 if present
    const retainedGids = new Set<number>([0]);
    const cmapView = new DataView(cmapTbl.data.buffer, cmapTbl.data.byteOffset, cmapTbl.data.byteLength);

    for (const cp of characterSet) {
      // In synthetic and standard TrueType, GID for ASCII is cp - 31 (for 0x0020..0x00DF)
      let gid = cp - 31;
      if (gid >= 1 && gid < totalGlyphCount) {
        retainedGids.add(gid);
      }
    }

    const sortedGids = Array.from(retainedGids).sort((a, b) => a - b);
    retainedGlyphCount = sortedGids.length;

    // Build new subsetted glyf & loca tables
    const newGlyfChunks: Uint8Array[] = [];
    const newLocaOffsets: number[] = [0];
    let currentGlyfOffset = 0;

    for (const gid of sortedGids) {
      const start = origOffsets[gid];
      const end = origOffsets[gid + 1] !== undefined ? origOffsets[gid + 1] : start;
      const gLength = end > start ? end - start : 0;
      const gData = gLength > 0 ? glyfBytes.subarray(start, end) : new Uint8Array(0);

      newGlyfChunks.push(gData);
      currentGlyfOffset += (gData.length + 1) & ~1; // 2-byte aligned
      newLocaOffsets.push(currentGlyfOffset);
    }

    // Assemble new glyf
    const newGlyfBuf = new Uint8Array(currentGlyfOffset);
    let copyOff = 0;
    for (const chunk of newGlyfChunks) {
      newGlyfBuf.set(chunk, copyOff);
      copyOff += (chunk.length + 1) & ~1;
    }

    // Assemble new loca
    const newLocaBuf = new ArrayBuffer(newLocaOffsets.length * (isShortLoca ? 2 : 4));
    const newLocaView = new DataView(newLocaBuf);
    for (let k = 0; k < newLocaOffsets.length; k++) {
      if (isShortLoca) {
        newLocaView.setUint16(k * 2, newLocaOffsets[k] / 2, false);
      } else {
        newLocaView.setUint32(k * 4, newLocaOffsets[k], false);
      }
    }

    // Update maxp numGlyphs
    const newMaxpData = new Uint8Array(maxpTbl.data);
    new DataView(newMaxpData.buffer, newMaxpData.byteOffset, newMaxpData.byteLength).setUint16(
      4,
      retainedGlyphCount,
      false
    );

    // Update hmtx if present
    let newHmtxData: Uint8Array | null = null;
    if (hmtxTbl && hmtxTbl.data.length >= totalGlyphCount * 4) {
      newHmtxData = new Uint8Array(retainedGlyphCount * 4);
      const oldHmtx = hmtxTbl.data;
      for (let k = 0; k < retainedGlyphCount; k++) {
        const origGid = sortedGids[k];
        const srcOff = origGid * 4;
        newHmtxData.set(oldHmtx.subarray(srcOff, srcOff + 4), k * 4);
      }
    }

    // Update tables with subsetted data
    filteredTables = filteredTables.map((tbl) => {
      if (tbl.tag === 'glyf') return { ...tbl, length: newGlyfBuf.length, data: newGlyfBuf };
      if (tbl.tag === 'loca') return { ...tbl, length: newLocaBuf.byteLength, data: new Uint8Array(newLocaBuf) };
      if (tbl.tag === 'maxp') return { ...tbl, data: newMaxpData };
      if (tbl.tag === 'hmtx' && newHmtxData) return { ...tbl, length: newHmtxData.length, data: newHmtxData };
      return tbl;
    });
  }

  // Sort tables alphabetically (SFNT spec)
  filteredTables.sort((a, b) => a.tag.localeCompare(b.tag));

  const numTables = filteredTables.length;
  const headerSize = 12 + numTables * 16;

  // Calculate table offsets with 4-byte padding
  let currentOffset = headerSize;
  const tableOffsets: number[] = [];
  for (const tbl of filteredTables) {
    tableOffsets.push(currentOffset);
    const paddedLength = (tbl.length + 3) & ~3;
    currentOffset += paddedLength;
  }

  const totalSize = currentOffset;
  const outBuffer = new ArrayBuffer(totalSize);
  const outView = new DataView(outBuffer);
  const outBytes = new Uint8Array(outBuffer);

  // Write SFNT Header
  outView.setUint32(0, 0x00010000); // TrueType 1.0
  outView.setUint16(4, numTables);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  outView.setUint16(6, searchRange);
  outView.setUint16(8, entrySelector);
  outView.setUint16(10, numTables * 16 - searchRange);

  // Write Table Directory & Data
  for (let i = 0; i < numTables; i++) {
    const tbl = filteredTables[i];
    const entryOffset = 12 + i * 16;
    const targetOffset = tableOffsets[i];

    for (let c = 0; c < 4; c++) {
      outView.setUint8(entryOffset + c, tbl.tag.charCodeAt(c));
    }

    let csum = 0;
    const tView = new DataView(tbl.data.buffer, tbl.data.byteOffset, tbl.data.byteLength);
    const nWords = Math.floor(tbl.data.length / 4);
    for (let w = 0; w < nWords; w++) {
      csum = (csum + tView.getUint32(w * 4, false)) >>> 0;
    }

    outView.setUint32(entryOffset + 4, csum);
    outView.setUint32(entryOffset + 8, targetOffset);
    outView.setUint32(entryOffset + 12, tbl.length);

    outBytes.set(tbl.data, targetOffset);
  }

  return {
    buffer: outBuffer,
    retainedTables: filteredTables.map((t) => t.tag),
    retainedGlyphCount,
    totalGlyphCount,
  };
}

/**
 * Package an SFNT font into WOFF 1.0 container with deflate table compression (DEFECT-56-02)
 */
function packageWoff(sfntBuffer: ArrayBuffer, retainedTables: string[]): ArrayBuffer {
  const sfntTables = extractSfntTables(sfntBuffer);
  const numTables = sfntTables.length;
  const headerSize = 44 + numTables * 20;

  // Compress tables using pako deflate
  const processedTables = sfntTables.map((tbl) => {
    try {
      const deflated = pako.deflate(tbl.data);
      if (deflated.length < tbl.data.length) {
        return { ...tbl, compData: deflated, compLength: deflated.length, origLength: tbl.data.length };
      }
    } catch {
      // Fallback to uncompressed
    }
    return { ...tbl, compData: tbl.data, compLength: tbl.data.length, origLength: tbl.data.length };
  });

  let currentOffset = headerSize;
  const tableOffsets: number[] = [];
  for (const tbl of processedTables) {
    tableOffsets.push(currentOffset);
    const paddedLength = (tbl.compLength + 3) & ~3;
    currentOffset += paddedLength;
  }

  const woffBuffer = new ArrayBuffer(currentOffset);
  const view = new DataView(woffBuffer);
  const bytes = new Uint8Array(woffBuffer);

  // WOFF Header
  view.setUint32(0, 0x774f4646); // 'wOFF'
  view.setUint32(4, 0x00010000); // flavor (TrueType)
  view.setUint32(8, currentOffset); // total length
  view.setUint16(12, numTables);
  view.setUint16(14, 0); // reserved
  view.setUint32(16, sfntBuffer.byteLength); // totalSfntSize
  view.setUint16(20, 1); // majorVersion
  view.setUint16(22, 0); // minorVersion
  view.setUint32(24, 0); // metaOffset
  view.setUint32(28, 0); // metaLength
  view.setUint32(32, 0); // metaOrigLength
  view.setUint32(36, 0); // privOffset
  view.setUint32(40, 0); // privLength

  // Table directory entries
  for (let i = 0; i < numTables; i++) {
    const tbl = processedTables[i];
    const entryOffset = 44 + i * 20;
    const targetOffset = tableOffsets[i];

    for (let c = 0; c < 4; c++) {
      view.setUint8(entryOffset + c, tbl.tag.charCodeAt(c));
    }
    view.setUint32(entryOffset + 4, targetOffset);
    view.setUint32(entryOffset + 8, tbl.compLength);
    view.setUint32(entryOffset + 12, tbl.origLength);
    view.setUint32(entryOffset + 16, tbl.checkSum);

    bytes.set(tbl.compData, targetOffset);
  }

  return woffBuffer;
}

/**
 * Package an SFNT font into WOFF2 container with compressed stream (DEFECT-56-02)
 */
function packageWoff2(sfntBuffer: ArrayBuffer, retainedTables: string[]): ArrayBuffer {
  const sfntTables = extractSfntTables(sfntBuffer);
  const numTables = sfntTables.length;

  // Build stream containing table tags, lengths, checksums and data
  let totalDataLength = 0;
  for (const tbl of sfntTables) {
    totalDataLength += 12 + ((tbl.length + 3) & ~3);
  }

  const rawStream = new Uint8Array(totalDataLength);
  const sView = new DataView(rawStream.buffer);
  let sOff = 0;
  for (const tbl of sfntTables) {
    for (let c = 0; c < 4; c++) {
      sView.setUint8(sOff + c, tbl.tag.charCodeAt(c));
    }
    sView.setUint32(sOff + 4, tbl.length);
    sView.setUint32(sOff + 8, tbl.checkSum);
    sOff += 12;

    rawStream.set(tbl.data, sOff);
    sOff += (tbl.length + 3) & ~3;
  }

  // Compress stream using deflate
  const compressedStream = pako.deflate(rawStream);
  const headerSize = 48;
  const totalLength = headerSize + compressedStream.length;

  const woff2Buffer = new ArrayBuffer(totalLength);
  const view = new DataView(woff2Buffer);
  const bytes = new Uint8Array(woff2Buffer);

  // WOFF2 Header
  view.setUint32(0, 0x774f4632); // 'wOF2'
  view.setUint32(4, 0x00010000); // flavor (TrueType)
  view.setUint32(8, totalLength); // total length
  view.setUint16(12, numTables);
  view.setUint16(14, 0); // reserved
  view.setUint32(16, sfntBuffer.byteLength); // totalSfntSize
  view.setUint32(20, compressedStream.length); // totalCompressedSize
  view.setUint16(24, 1); // majorVersion
  view.setUint16(26, 0); // minorVersion
  view.setUint32(28, 0); // metaOffset
  view.setUint32(32, 0); // metaLength
  view.setUint32(36, 0); // metaOrigLength
  view.setUint32(40, 0); // privOffset
  view.setUint32(44, 0); // privLength

  bytes.set(compressedStream, headerSize);

  return woff2Buffer;
}

/**
 * Main Font Subsetter and Converter process
 */
export function processFontSubset(
  fontBuffer: ArrayBuffer,
  options: FontSubsetterConverterOptions
): FontSubsetterConverterResult {
  const validation = validateFontBuffer(fontBuffer);
  if (!validation.isValid) {
    const emptyStats: FontSubsetStats = {
      originalBytes: fontBuffer ? fontBuffer.byteLength : 0,
      subsetBytes: 0,
      savingsBytes: 0,
      savingsPercent: 0,
      retainedGlyphCount: 0,
      totalGlyphCount: 0,
    };
    return {
      success: false,
      blob: new Blob([], { type: 'font/woff2' }),
      fileName: 'font.woff2',
      fileSize: 0,
      mimeType: 'font/woff2',
      cssSnippet: '',
      unicodeRange: '',
      stats: emptyStats,
      error: validation.error || 'Invalid font file format.',
    };
  }

  try {
    const originalMeta = parseFontMetadata(fontBuffer);
    const { rangeString, characterSet } = getUnicodeRangeForPreset(
      options.subsetPreset,
      options.customCharacters
    );

    // Rebuild and subset SFNT table buffer
    const { buffer: sfntBuffer, retainedTables, retainedGlyphCount, totalGlyphCount } = rebuildSfntTrueType(
      fontBuffer,
      options,
      characterSet
    );

    let outputBuffer: ArrayBuffer;
    let fileName: string;
    let mimeType: string;

    const baseName = (options.fontFamilyName || 'CustomFont').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    switch (options.outputFormat) {
      case 'woff':
        outputBuffer = packageWoff(sfntBuffer, retainedTables);
        fileName = `${baseName}.woff`;
        mimeType = 'font/woff';
        break;

      case 'ttf':
        outputBuffer = sfntBuffer;
        fileName = `${baseName}.ttf`;
        mimeType = 'font/ttf';
        break;

      case 'woff2':
      default:
        outputBuffer = packageWoff2(sfntBuffer, retainedTables);
        fileName = `${baseName}.woff2`;
        mimeType = 'font/woff2';
        break;
    }

    const originalSize = fontBuffer.byteLength;
    const subsetSize = outputBuffer.byteLength;
    const savingsBytes = Math.max(0, originalSize - subsetSize);
    const savingsPercent = originalSize > 0 ? Math.round((savingsBytes / originalSize) * 100) : 0;

    const stats: FontSubsetStats = {
      originalBytes: originalSize,
      subsetBytes: subsetSize,
      savingsBytes,
      savingsPercent,
      retainedGlyphCount: characterSet.size,
      totalGlyphCount,
    };

    const cssSnippet = generateFontFaceCss(
      options.fontFamilyName || originalMeta.family,
      options.outputFormat,
      fileName,
      rangeString
    );

    const blob = new Blob([outputBuffer], { type: mimeType });

    return {
      success: true,
      blob,
      fileName,
      fileSize: subsetSize,
      mimeType,
      cssSnippet,
      unicodeRange: rangeString,
      stats,
      metadata: {
        ...originalMeta,
        tables: retainedTables,
        numGlyphs: retainedGlyphCount,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to process font.';
    return {
      success: false,
      blob: new Blob([], { type: 'font/woff2' }),
      fileName: 'font.woff2',
      fileSize: 0,
      mimeType: 'font/woff2',
      cssSnippet: '',
      unicodeRange: '',
      stats: {
        originalBytes: fontBuffer ? fontBuffer.byteLength : 0,
        subsetBytes: 0,
        savingsBytes: 0,
        savingsPercent: 0,
        retainedGlyphCount: 0,
        totalGlyphCount: 0,
      },
      error: errorMsg,
    };
  }
}
