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
  // 192 glyphs (glyph 0 is .notdef, glyphs 1..191 map to 0x0020..0x00DF)
  const numGlyphs = 192;
  const glyphSize = 28;

  // 1. head table (54 bytes)
  const headBuf = new ArrayBuffer(54);
  const headView = new DataView(headBuf);
  headView.setUint32(0, 0x00010000);
  headView.setUint32(4, 0x00010000);
  headView.setUint32(8, 0);
  headView.setUint32(12, 0x5F0F3CF5);
  headView.setUint16(16, 0x000B);
  headView.setUint16(18, 1000);
  headView.setInt16(36, 0);
  headView.setInt16(38, -200);
  headView.setInt16(40, 1000);
  headView.setInt16(42, 800);
  headView.setUint16(44, 0);
  headView.setUint16(46, 6);
  headView.setInt16(48, 2);
  headView.setInt16(50, 0); // indexToLocFormat: 0 (short)
  headView.setInt16(52, 0);

  // 2. hhea table (36 bytes)
  const hheaBuf = new ArrayBuffer(36);
  const hheaView = new DataView(hheaBuf);
  hheaView.setUint32(0, 0x00010000);
  hheaView.setInt16(4, 800);
  hheaView.setInt16(6, -200);
  hheaView.setInt16(8, 90);
  hheaView.setUint16(10, 1000);
  hheaView.setInt16(12, 0);
  hheaView.setInt16(14, 0);
  hheaView.setInt16(16, 1000);
  hheaView.setInt16(18, 1);
  hheaView.setInt16(20, 0);
  hheaView.setInt16(22, 0);
  hheaView.setInt16(32, 0);
  hheaView.setUint16(34, numGlyphs);

  // 3. maxp table (32 bytes)
  const maxpBuf = new ArrayBuffer(32);
  const maxpView = new DataView(maxpBuf);
  maxpView.setUint32(0, 0x00010000);
  maxpView.setUint16(4, numGlyphs);
  maxpView.setUint16(6, 4);
  maxpView.setUint16(8, 1);
  maxpView.setUint16(10, 0);
  maxpView.setUint16(12, 0);
  maxpView.setUint16(14, 2);

  // 4. glyf table (numGlyphs * glyphSize bytes)
  const glyfSize = numGlyphs * glyphSize;
  const glyfBuf = new ArrayBuffer(glyfSize);
  const glyfView = new DataView(glyfBuf);
  for (let g = 0; g < numGlyphs; g++) {
    const off = g * glyphSize;
    glyfView.setInt16(off, 1);
    glyfView.setInt16(off + 2, 50);
    glyfView.setInt16(off + 4, 0);
    glyfView.setInt16(off + 6, 450);
    glyfView.setInt16(off + 8, 700);
    glyfView.setUint16(off + 10, 3);
    glyfView.setUint16(off + 12, 0);
    for (let p = 0; p < 4; p++) {
      glyfView.setUint8(off + 14 + p, 0x01);
    }
    glyfView.setUint8(off + 18, 50);
    glyfView.setUint8(off + 19, 200);
    glyfView.setUint8(off + 20, 0);
    glyfView.setUint8(off + 21, 200);
    glyfView.setUint8(off + 22, 0);
    glyfView.setUint8(off + 23, 200);
    glyfView.setUint8(off + 24, 0);
    glyfView.setUint8(off + 25, 200);
    glyfView.setUint16(off + 26, 0);
  }

  // 5. loca table (short format: (numGlyphs + 1) * 2 bytes)
  const locaBuf = new ArrayBuffer((numGlyphs + 1) * 2);
  const locaView = new DataView(locaBuf);
  for (let g = 0; g <= numGlyphs; g++) {
    const byteOffset = g * glyphSize;
    locaView.setUint16(g * 2, byteOffset / 2);
  }

  // 6. hmtx table (numGlyphs * 4 bytes)
  const hmtxBuf = new ArrayBuffer(numGlyphs * 4);
  const hmtxView = new DataView(hmtxBuf);
  for (let g = 0; g < numGlyphs; g++) {
    hmtxView.setUint16(g * 4, 600);
    hmtxView.setInt16(g * 4 + 2, 50);
  }

  // 7. cmap table (Format 4 mapping 0x0020..0x00DF to gid 1..191, and 0xFFFF to 0)
  const cmapSubtableLen = 32;
  const cmapTotalLen = 12 + cmapSubtableLen;
  const cmapBuf = new ArrayBuffer(cmapTotalLen);
  const cmapView = new DataView(cmapBuf);
  cmapView.setUint16(0, 0);
  cmapView.setUint16(2, 1);
  cmapView.setUint16(4, 3);
  cmapView.setUint16(6, 1);
  cmapView.setUint32(8, 12);

  const subOff = 12;
  cmapView.setUint16(subOff, 4);
  cmapView.setUint16(subOff + 2, cmapSubtableLen);
  cmapView.setUint16(subOff + 4, 0);
  cmapView.setUint16(subOff + 6, 4);
  cmapView.setUint16(subOff + 8, 4);
  cmapView.setUint16(subOff + 10, 1);
  cmapView.setUint16(subOff + 12, 0);
  cmapView.setUint16(subOff + 14, 0x00DF);
  cmapView.setUint16(subOff + 16, 0xFFFF);
  cmapView.setUint16(subOff + 18, 0);
  cmapView.setUint16(subOff + 20, 0x0020);
  cmapView.setUint16(subOff + 22, 0xFFFF);
  cmapView.setUint16(subOff + 24, 0xFFE1);
  cmapView.setUint16(subOff + 26, 1);
  cmapView.setUint16(subOff + 28, 0);
  cmapView.setUint16(subOff + 30, 0);

  // 8. name table
  const nameStr = 'CustomFont';
  const nameBuf = new ArrayBuffer(18 + nameStr.length);
  const nameView = new DataView(nameBuf);
  nameView.setUint16(0, 0);
  nameView.setUint16(2, 1);
  nameView.setUint16(4, 18);
  nameView.setUint16(6, 3);
  nameView.setUint16(8, 1);
  nameView.setUint16(10, 0x0409);
  nameView.setUint16(12, 1);
  nameView.setUint16(14, nameStr.length);
  nameView.setUint16(16, 0);
  const nameBytes = new Uint8Array(nameBuf);
  for (let c = 0; c < nameStr.length; c++) {
    nameBytes[18 + c] = nameStr.charCodeAt(c);
  }

  // 9. post table (format 3.0)
  const postBuf = new ArrayBuffer(32);
  const postView = new DataView(postBuf);
  postView.setUint32(0, 0x00030000);

  // 10. OS/2 table
  const os2Buf = new ArrayBuffer(96);
  const os2View = new DataView(os2Buf);
  os2View.setUint16(0, 3);
  os2View.setInt16(2, 600);
  os2View.setUint16(4, 400);
  os2View.setUint16(6, 5);
  os2View.setUint16(8, 0);
  os2View.setInt16(68, 800);
  os2View.setInt16(70, -200);
  os2View.setInt16(72, 90);
  os2View.setUint16(74, 800);
  os2View.setUint16(76, 200);

  const tables: Array<{ tag: string; data: Uint8Array }> = [
    { tag: 'OS/2', data: new Uint8Array(os2Buf) },
    { tag: 'cmap', data: new Uint8Array(cmapBuf) },
    { tag: 'glyf', data: new Uint8Array(glyfBuf) },
    { tag: 'head', data: new Uint8Array(headBuf) },
    { tag: 'hhea', data: new Uint8Array(hheaBuf) },
    { tag: 'hmtx', data: new Uint8Array(hmtxBuf) },
    { tag: 'loca', data: new Uint8Array(locaBuf) },
    { tag: 'maxp', data: new Uint8Array(maxpBuf) },
    { tag: 'name', data: new Uint8Array(nameBuf) },
    { tag: 'post', data: new Uint8Array(postBuf) },
  ];

  if (includeKerning) {
    const kernBuf = new ArrayBuffer(16);
    new DataView(kernBuf).setUint16(0, 0);
    new DataView(kernBuf).setUint16(2, 1);
    tables.push({ tag: 'kern', data: new Uint8Array(kernBuf) });
  }

  if (includeLayout) {
    const gsubBuf = new ArrayBuffer(16);
    new DataView(gsubBuf).setUint32(0, 0x00010000);
    tables.push({ tag: 'GSUB', data: new Uint8Array(gsubBuf) });
  }

  // Sort tables by tag alphabetically (SFNT requirement)
  tables.sort((a, b) => a.tag.localeCompare(b.tag));

  const numTables = tables.length;
  const headerSize = 12 + numTables * 16;
  let currentOffset = headerSize;
  const tableOffsets: number[] = [];
  for (const tbl of tables) {
    tableOffsets.push(currentOffset);
    currentOffset += (tbl.data.length + 3) & ~3;
  }

  const totalSize = currentOffset;
  const fontBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(fontBuffer);
  const bytes = new Uint8Array(fontBuffer);

  view.setUint32(0, 0x00010000);
  view.setUint16(4, numTables);
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  view.setUint16(6, searchRange);
  view.setUint16(8, entrySelector);
  view.setUint16(10, numTables * 16 - searchRange);

  for (let i = 0; i < numTables; i++) {
    const tbl = tables[i];
    const entryOffset = 12 + i * 16;
    const targetOffset = tableOffsets[i];

    for (let c = 0; c < 4; c++) {
      view.setUint8(entryOffset + c, tbl.tag.charCodeAt(c));
    }

    let csum = 0;
    const tView = new DataView(tbl.data.buffer, tbl.data.byteOffset, tbl.data.byteLength);
    const nWords = Math.floor(tbl.data.length / 4);
    for (let w = 0; w < nWords; w++) {
      csum = (csum + tView.getUint32(w * 4)) >>> 0;
    }
    view.setUint32(entryOffset + 4, csum);
    view.setUint32(entryOffset + 8, targetOffset);
    view.setUint32(entryOffset + 12, tbl.data.length);

    bytes.set(tbl.data, targetOffset);
  }

  return fontBuffer;
}
