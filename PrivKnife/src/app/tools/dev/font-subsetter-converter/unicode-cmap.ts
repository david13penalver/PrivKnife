/** Read Unicode character mappings from the original SFNT cmap directory. */
export function selectUnicodeGlyphs(data: Uint8Array, characters: ReadonlySet<number>): Map<number, number> {
  const source = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tables: Array<{ offset: number; format: number }> = [];
  for (let i = 0; i < source.getUint16(2); i++) {
    const record = 4 + i * 8;
    const platform = source.getUint16(record);
    const encoding = source.getUint16(record + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const offset = source.getUint32(record + 4);
    const format = source.getUint16(offset);
    if (format === 4 || format === 12) tables.push({ offset, format });
  }
  tables.sort((a, b) => b.format - a.format);
  if (!tables.length) throw new Error('The font has no supported Unicode cmap.');
  const result = new Map<number, number>();
  for (const codePoint of [...characters].sort((a, b) => a - b)) {
    for (const { offset, format } of tables) {
      const glyph = format === 12
        ? lookupFormat12(source, offset, codePoint)
        : lookupFormat4(source, offset, codePoint);
      if (glyph) {
        result.set(codePoint, glyph);
        break;
      }
    }
  }
  return result;
}

function lookupFormat12(table: DataView, start: number, codePoint: number): number {
  let left = 0;
  let right = table.getUint32(start + 12) - 1;
  while (left <= right) {
    const middle = (left + right) >>> 1;
    const group = start + 16 + middle * 12;
    const first = table.getUint32(group);
    const last = table.getUint32(group + 4);
    if (codePoint < first) right = middle - 1;
    else if (codePoint > last) left = middle + 1;
    else return table.getUint32(group + 8) + codePoint - first;
  }
  return 0;
}

function lookupFormat4(table: DataView, start: number, codePoint: number): number {
  if (codePoint >= 0xffff) return 0;
  const count = table.getUint16(start + 6) / 2;
  for (let i = 0; i < count; i++) {
    if (codePoint > table.getUint16(start + 14 + i * 2)) continue;
    const first = table.getUint16(start + 16 + 2 * (count + i));
    if (codePoint < first) return 0;
    const delta = table.getInt16(start + 16 + 2 * (count * 2 + i));
    const rangeOffsetIndex = start + 16 + 2 * (count * 3 + i);
    const rangeOffset = table.getUint16(rangeOffsetIndex);
    if (!rangeOffset) return (codePoint + delta) & 0xffff;
    const glyphIndex = rangeOffsetIndex + rangeOffset + 2 * (codePoint - first);
    if (glyphIndex + 2 > start + table.getUint16(start + 2)) return 0;
    const glyph = table.getUint16(glyphIndex);
    return glyph ? (glyph + delta) & 0xffff : 0;
  }
  return 0;
}

/** Serialize a Windows Unicode UCS-4 cmap while retaining original glyph IDs. */
export function buildUnicodeCmap(mapping: ReadonlyMap<number, number>): Uint8Array {
  const groups: Array<{ start: number; end: number; glyph: number }> = [];
  for (const [codePoint, glyph] of mapping) {
    const previous = groups.at(-1);
    if (previous && codePoint === previous.end + 1 && glyph === previous.glyph + codePoint - previous.start) {
      previous.end = codePoint;
    } else {
      groups.push({ start: codePoint, end: codePoint, glyph });
    }
  }

  const header = 12;
  const length = 16 + groups.length * 12;
  const bytes = new Uint8Array(header + length);
  const view = new DataView(bytes.buffer);
  view.setUint16(2, 1);
  view.setUint16(4, 3);
  view.setUint16(6, 10);
  view.setUint32(8, header);
  view.setUint16(header, 12);
  view.setUint32(header + 4, length);
  view.setUint32(header + 12, groups.length);
  groups.forEach(({ start, end, glyph }, index) => {
    const offset = header + 16 + index * 12;
    view.setUint32(offset, start);
    view.setUint32(offset + 4, end);
    view.setUint32(offset + 8, glyph);
  });
  return bytes;
}

/** Include every original component of the selected TrueType composite glyphs. */
export function retainCompositeComponents(
  retained: Set<number>, offsets: readonly number[], glyphs: Uint8Array,
): void {
  const view = new DataView(glyphs.buffer, glyphs.byteOffset, glyphs.byteLength);
  for (const gid of retained) {
    const start = offsets[gid];
    const end = offsets[gid + 1];
    if (end - start < 10 || view.getInt16(start) >= 0) continue;
    let cursor = start + 10;
    let flags: number;
    do {
      if (cursor + 4 > end) throw new Error('A composite glyph is truncated.');
      flags = view.getUint16(cursor);
      const child = view.getUint16(cursor + 2);
      if (child >= offsets.length - 1) throw new Error('Invalid composite glyph reference.');
      retained.add(child);
      cursor += 4 + (flags & 0x0001 ? 4 : 2);
      if (flags & 0x0008) cursor += 2;
      else if (flags & 0x0040) cursor += 4;
      else if (flags & 0x0080) cursor += 8;
    } while (flags & 0x0020);
  }
}
