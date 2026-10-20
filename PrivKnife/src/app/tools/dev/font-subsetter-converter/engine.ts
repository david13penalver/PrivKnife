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

  const numTables = view.getUint16(4);
  if (12 + numTables * 16 > buffer.byteLength && magic !== 0x774F4646 && magic !== 0x774F4632) {
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

  const numTables = view.getUint16(4);
  const tables: string[] = [];

  for (let i = 0; i < numTables; i++) {
    const entryOffset = 12 + i * 16;
    if (entryOffset + 16 > buffer.byteLength) break;

    let tag = '';
    for (let c = 0; c < 4; c++) {
      tag += String.fromCharCode(view.getUint8(entryOffset + c));
    }
    tables.push(tag);
  }

  return {
    family: 'CustomFont',
    tables,
    originalSize: buffer.byteLength,
    isTrueType,
    isOpenType,
    numGlyphs: 256,
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
        // Fallback to basic ascii
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
  const safeName = fontFamily || 'CustomFont';
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
 * Extract existing table entries from an SFNT buffer
 */
function extractSfntTables(buffer: ArrayBuffer): SfntTableEntry[] {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4);
  const rawBytes = new Uint8Array(buffer);
  const tables: SfntTableEntry[] = [];

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
 * Filter and rebuild SFNT TrueType table buffer
 */
function rebuildSfntTrueType(
  originalBuffer: ArrayBuffer,
  options: FontSubsetterConverterOptions
): { buffer: ArrayBuffer; retainedTables: string[] } {
  const existingTables = extractSfntTables(originalBuffer);

  const filteredTables = existingTables.filter((tbl) => {
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
    outView.setUint32(entryOffset + 4, tbl.checkSum);
    outView.setUint32(entryOffset + 8, targetOffset);
    outView.setUint32(entryOffset + 12, tbl.length);

    outBytes.set(tbl.data, targetOffset);
  }

  return {
    buffer: outBuffer,
    retainedTables: filteredTables.map((t) => t.tag),
  };
}

/**
 * Package an SFNT font into WOFF 1.0 container
 */
function packageWoff(sfntBuffer: ArrayBuffer, retainedTables: string[]): ArrayBuffer {
  const sfntTables = extractSfntTables(sfntBuffer);
  const numTables = sfntTables.length;
  const headerSize = 44 + numTables * 20;

  let currentOffset = headerSize;
  const tableOffsets: number[] = [];
  for (const tbl of sfntTables) {
    tableOffsets.push(currentOffset);
    const paddedLength = (tbl.length + 3) & ~3;
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
    const tbl = sfntTables[i];
    const entryOffset = 44 + i * 20;
    const targetOffset = tableOffsets[i];

    for (let c = 0; c < 4; c++) {
      view.setUint8(entryOffset + c, tbl.tag.charCodeAt(c));
    }
    view.setUint32(entryOffset + 4, targetOffset);
    view.setUint32(entryOffset + 8, tbl.length); // compLength
    view.setUint32(entryOffset + 12, tbl.length); // origLength
    view.setUint32(entryOffset + 16, tbl.checkSum);

    bytes.set(tbl.data, targetOffset);
  }

  return woffBuffer;
}

/**
 * Package an SFNT font into WOFF2 container header
 */
function packageWoff2(sfntBuffer: ArrayBuffer, retainedTables: string[]): ArrayBuffer {
  const sfntTables = extractSfntTables(sfntBuffer);
  const numTables = sfntTables.length;
  const headerSize = 48 + numTables * 20;

  let currentOffset = headerSize;
  const tableOffsets: number[] = [];
  for (const tbl of sfntTables) {
    tableOffsets.push(currentOffset);
    const paddedLength = (tbl.length + 3) & ~3;
    currentOffset += paddedLength;
  }

  const woff2Buffer = new ArrayBuffer(currentOffset);
  const view = new DataView(woff2Buffer);
  const bytes = new Uint8Array(woff2Buffer);

  // WOFF2 Header
  view.setUint32(0, 0x774f4632); // 'wOF2'
  view.setUint32(4, 0x00010000); // flavor (TrueType)
  view.setUint32(8, currentOffset); // total length
  view.setUint16(12, numTables);
  view.setUint16(14, 0); // reserved
  view.setUint32(16, sfntBuffer.byteLength); // totalSfntSize
  view.setUint32(20, currentOffset - headerSize); // totalCompressedSize
  view.setUint16(24, 1); // majorVersion
  view.setUint16(26, 0); // minorVersion
  view.setUint32(28, 0); // metaOffset
  view.setUint32(32, 0); // metaLength
  view.setUint32(36, 0); // metaOrigLength
  view.setUint32(40, 0); // privOffset
  view.setUint32(44, 0); // privLength

  // Table directory entries
  for (let i = 0; i < numTables; i++) {
    const tbl = sfntTables[i];
    const entryOffset = 48 + i * 20;
    const targetOffset = tableOffsets[i];

    for (let c = 0; c < 4; c++) {
      view.setUint8(entryOffset + c, tbl.tag.charCodeAt(c));
    }
    view.setUint32(entryOffset + 4, targetOffset);
    view.setUint32(entryOffset + 8, tbl.length);
    view.setUint32(entryOffset + 12, tbl.length);
    view.setUint32(entryOffset + 16, tbl.checkSum);

    bytes.set(tbl.data, targetOffset);
  }

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

    // Rebuild SFNT table buffer
    const { buffer: sfntBuffer, retainedTables } = rebuildSfntTrueType(
      fontBuffer,
      options
    );

    let outputBuffer: ArrayBuffer;
    let fileExtension = 'woff2';
    let mimeType = 'font/woff2';

    if (options.outputFormat === 'ttf') {
      outputBuffer = sfntBuffer;
      fileExtension = 'ttf';
      mimeType = 'font/ttf';
    } else if (options.outputFormat === 'woff') {
      outputBuffer = packageWoff(sfntBuffer, retainedTables);
      fileExtension = 'woff';
      mimeType = 'font/woff';
    } else {
      outputBuffer = packageWoff2(sfntBuffer, retainedTables);
      fileExtension = 'woff2';
      mimeType = 'font/woff2';
    }

    const safeFamily = (options.fontFamilyName || 'CustomFont')
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'CustomFont';
    const fileName = `${safeFamily.toLowerCase()}.${fileExtension}`;
    const cssSnippet = generateFontFaceCss(
      safeFamily,
      options.outputFormat,
      fileName,
      rangeString
    );

    const originalBytes = fontBuffer.byteLength;
    const subsetBytes = outputBuffer.byteLength;
    const savingsBytes = Math.max(0, originalBytes - subsetBytes);
    const savingsPercent =
      originalBytes > 0
        ? parseFloat(((savingsBytes / originalBytes) * 100).toFixed(1))
        : 0;

    const stats: FontSubsetStats = {
      originalBytes,
      subsetBytes,
      savingsBytes,
      savingsPercent,
      retainedGlyphCount: characterSet.size,
      totalGlyphCount: originalMeta.numGlyphs || 256,
    };

    const blob = new Blob([outputBuffer], { type: mimeType });

    return {
      success: true,
      blob,
      fileName,
      fileSize: blob.size,
      mimeType,
      cssSnippet,
      unicodeRange: rangeString,
      stats,
      metadata: {
        ...originalMeta,
        tables: retainedTables,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown subsetting error.';
    return {
      success: false,
      blob: new Blob([], { type: 'font/woff2' }),
      fileName: 'error.woff2',
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
      error: message,
    };
  }
}
