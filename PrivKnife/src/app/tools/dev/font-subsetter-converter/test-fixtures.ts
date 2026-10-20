import { FontSubsetterConverterOptions } from './types';

export const DEFAULT_FONT_OPTIONS: FontSubsetterConverterOptions = {
  subsetPreset: 'basic_latin_ascii',
  customCharacters: '',
  keepKerningTables: false,
  dropLayoutFeatures: true,
  outputFormat: 'woff2',
  fontFamilyName: 'CustomFont',
};

/**
 * Creates a synthetic minimal SFNT TrueType font buffer for testing
 */
export function createSyntheticTrueTypeFont(includeKerning = true, includeLayout = true): ArrayBuffer {
  const tableTags = ['cmap', 'head', 'hhea', 'maxp', 'name'];
  if (includeKerning) tableTags.push('kern');
  if (includeLayout) tableTags.push('GSUB');

  const numTables = tableTags.length;
  const headerSize = 12 + numTables * 16;
  const tableDataSize = 64; // dummy 64 bytes per table
  const totalSize = headerSize + numTables * tableDataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // 1. Offset Table
  view.setUint32(0, 0x00010000); // TrueType 1.0 sfntVersion
  view.setUint16(4, numTables);
  view.setUint16(6, 16); // searchRange
  view.setUint16(8, 1);  // entrySelector
  view.setUint16(10, 0); // rangeShift

  // 2. Table Directory Entries
  let currentOffset = headerSize;
  for (let i = 0; i < numTables; i++) {
    const tag = tableTags[i];
    const entryOffset = 12 + i * 16;

    // 4-byte ASCII tag
    for (let c = 0; c < 4; c++) {
      view.setUint8(entryOffset + c, tag.charCodeAt(c));
    }
    view.setUint32(entryOffset + 4, 0x12345678); // checkSum
    view.setUint32(entryOffset + 8, currentOffset); // offset
    view.setUint32(entryOffset + 12, tableDataSize); // length

    // Fill table data
    for (let b = 0; b < tableDataSize; b++) {
      uint8[currentOffset + b] = (i + 1) * 11 + b;
    }
    currentOffset += tableDataSize;
  }

  return buffer;
}
