import pako from 'pako';
import { buildUnicodeCmap, retainCompositeComponents, selectUnicodeGlyphs } from './unicode-cmap';
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

  if (magic === 0x774f4632) {
    throw new Error('Decode WOFF2 before reading its SFNT tables.');
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
  const maxp = maxpTbl && new DataView(maxpTbl.data.buffer, maxpTbl.data.byteOffset, maxpTbl.data.byteLength);
  const totalGlyphCount = maxp?.getUint16(4) ?? 0;
  if (!cmapTbl || !totalGlyphCount) throw new Error('The font is missing its glyph directory.');
  const mapping = selectUnicodeGlyphs(cmapTbl.data, characterSet);
  for (const [codePoint, glyph] of mapping) {
    if (glyph >= totalGlyphCount) mapping.delete(codePoint);
  }
  if (!mapping.size) throw new Error('The font has no characters in the requested subset.');
  const subsetCmap = buildUnicodeCmap(mapping);
  const replacements = new Map<string, Uint8Array>([['cmap', subsetCmap]]);
  const retained = new Set([0, ...mapping.values()]);

  // Keep original glyph IDs so metric, kerning, layout and composite references remain valid.
  const canPrune = !existingTables.some(({ tag }) =>
    ['fvar', 'COLR', 'SVG ', 'CBDT', 'sbix', 'MATH'].includes(tag) ||
    (!options.dropLayoutFeatures && ['GSUB', 'GPOS', 'GDEF', 'JSTF', 'BASE'].includes(tag)));
  if (locaTbl && glyfTbl && headTbl && canPrune) {
    const head = new DataView(headTbl.data.buffer, headTbl.data.byteOffset, headTbl.data.byteLength);
    const short = head.getInt16(50) === 0;
    const original = new DataView(locaTbl.data.buffer, locaTbl.data.byteOffset, locaTbl.data.byteLength);
    const offsets = Array.from({ length: totalGlyphCount + 1 }, (_, index) =>
      short ? original.getUint16(index * 2) * 2 : original.getUint32(index * 4));
    retainCompositeComponents(retained, offsets, glyfTbl.data);

    const newLoca = new Uint8Array(locaTbl.data.length);
    const loca = new DataView(newLoca.buffer);
    const newGlyf = new Uint8Array(glyfTbl.data.length);
    let position = 0;
    for (let gid = 0; gid <= totalGlyphCount; gid++) {
      if (short) loca.setUint16(gid * 2, position / 2);
      else loca.setUint32(gid * 4, position);
      if (gid < totalGlyphCount && retained.has(gid)) {
        const data = glyfTbl.data.subarray(offsets[gid], offsets[gid + 1]);
        newGlyf.set(data, position);
        position += data.length;
      }
    }
    replacements.set('glyf', newGlyf.subarray(0, position));
    replacements.set('loca', newLoca);
  }

  filteredTables = filteredTables.map((table) => {
    const data = replacements.get(table.tag);
    return data ? { ...table, length: data.length, data } : table;
  });

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
  outView.setUint32(0, filteredTables.some(({ tag }) => tag === 'CFF ' || tag === 'CFF2') ? 0x4f54544f : 0x00010000);
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
    retainedGlyphCount: new Set(mapping.values()).size,
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
  view.setUint32(4, new DataView(sfntBuffer).getUint32(0));
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
 * Main Font Subsetter and Converter process
 */
export async function processFontSubset(
  fontBuffer: ArrayBuffer,
  options: FontSubsetterConverterOptions,
  encodeWoff2?: (font: ArrayBuffer) => Promise<Uint8Array>,
): Promise<FontSubsetterConverterResult> {
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
    let input = fontBuffer;
    if (new DataView(input).getUint32(0) === 0x774f4632) {
      const { woff2Decode } = await import('woff-lib/woff2/decode');
      input = Uint8Array.from(await woff2Decode(input)).buffer;
    }
    const originalMeta = parseFontMetadata(input);
    const { rangeString, characterSet } = getUnicodeRangeForPreset(
      options.subsetPreset,
      options.customCharacters
    );

    // Rebuild and subset SFNT table buffer
    const { buffer: sfntBuffer, retainedTables, retainedGlyphCount, totalGlyphCount } = rebuildSfntTrueType(
      input,
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
      default: {
        if (!encodeWoff2) throw new Error('The WOFF2 encoder is unavailable.');
        outputBuffer = Uint8Array.from(await encodeWoff2(sfntBuffer)).buffer;
        fileName = `${baseName}.woff2`;
        mimeType = 'font/woff2';
        break;
      }
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
      retainedGlyphCount,
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
