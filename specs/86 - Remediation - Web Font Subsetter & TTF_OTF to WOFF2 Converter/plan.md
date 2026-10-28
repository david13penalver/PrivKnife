# Remediation Implementation Plan: Web Font Subsetter & TTF/OTF to WOFF2 Converter (Tool 56)

- **Target Tool**: `56` — `font-subsetter-converter`
- **Spec Reference**: [`specs/86 - Remediation - Web Font Subsetter & TTF_OTF to WOFF2 Converter/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/86%20-%20Remediation%20-%20Web%20Font%20Subsetter%20&%20TTF_OTF%20to%20WOFF2%20Converter/spec.md)

---

## 1. Impacted Files

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/types.ts) | `MODIFY` | Add worker request/response types and waterfall preview sizes |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/test-fixtures.ts) | `MODIFY` | Build a valid minimal SFNT TrueType font with real `maxp`, `head`, `loca`, `glyf`, and `cmap` Format 4 tables (`DEFECT-56-04`) |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts) | `MODIFY` | Implement real `cmap`/`glyf`/`loca` glyph subsetting (`DEFECT-56-01`), WOFF/WOFF2 table compression & valid `UIntBase128` directory encoding (`DEFECT-56-02`), and WOFF input unpacking (`DEFECT-56-03`) |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/worker.ts) | `CREATE` | Dedicated Web Worker wrapper around `processFontSubset()` (`DEFECT-56-05`) |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts) | `MODIFY` | Register subsetted font via `FontFace` / `@font-face` Blob URL, render waterfall preview, integrate `worker.ts` with `ngOnDestroy` cleanup, and convert template/styles to strict BEM + CSS custom properties (`DEFECT-56-04`, `DEFECT-56-05`) |
| [`PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts) | `MODIFY` | Add unit tests across all 4 testing seams covering `DEFECT-56-01` through `DEFECT-56-05` |

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Pure Engine Unit Tests (`engine.ts`)
- Test `parseFontMetadata()` reads `numGlyphs` from the `maxp` table (`offset + 4`) rather than returning hardcoded `256`.
- Test `processFontSubset()` produces strictly different and smaller byte lengths when subsetting with `custom` (`"ABC"`, 3 chars) vs `numbers-punctuation` (43 chars) vs `basic-latin` (95 chars) vs `latin-supplement` (191 chars) (`DEFECT-56-01`).
- Test `packageWoff()` and `packageWoff2()` compress SFNT table payloads so output size is smaller than the raw SFNT input even when `stripOpenTypeLayout: false` and `stripKerning: false`, and verify WOFF2 table directory uses `UIntBase128` encoding (`DEFECT-56-02`).
- Test `extractSfntTables()` and `processFontSubset()` accept a packaged `.woff` buffer (`0x774F4646`) as input and losslessly unpack its SFNT tables without corrupting `numTables` (`DEFECT-56-03`).

### Seam 2: Web Worker Message Contract Tests (`worker.ts`)
- Test the worker message handler processes a `{ type: 'SUBSET_FONT', buffer, config }` payload and emits `{ type: 'PROGRESS', percent }` followed by `{ type: 'RESULT', result }` (`DEFECT-56-05`).

### Seam 3: Component State, Error Recovery & Resource Disposal (`font-subsetter-converter.component.ts`)
- Test that loading a font registers a live preview font family (`previewFontFamily` signal) and revokes any preview Blob URLs / terminates the worker on `ngOnDestroy()` (`DEFECT-56-04`, `DEFECT-56-05`).
- Test that uploading an invalid buffer (`INVALID_DATA`) populates `.c-alert--danger` and clears previous results.
- Test that changing `subsetPreset` in the component updates `subsetResult().subsetSizeBytes` dynamically (`DEFECT-56-01`).

### Seam 4: DOM, BEM, A11y & Security Verification
- Verify all custom classes follow `.c-font-subsetter__*`, `.l-*`, or `.g--*` BEM naming with zero hardcoded light-mode hex backgrounds (`#ffffff`, `#e2e8f0`) (`DEFECT-56-05`).
- Verify `.specimen-textarea` and `.c-font-subsetter__waterfall-line` bind `[style.font-family]="previewFontFamily()"` (`DEFECT-56-04`).
- Verify zero network calls (`fetch` / `XMLHttpRequest`) during font parsing, subsetting, and WOFF2 conversion.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Valid TrueType Fixture & Real `cmap`/`glyf`/`loca` Glyph Subsetting (`DEFECT-56-01`, `DEFECT-56-04`)
- **RED**: Write unit tests in `font-subsetter-converter.component.spec.ts` asserting that:
  1. `parseFontMetadata(createSyntheticTrueTypeFont())` reads the actual `numGlyphs` from `maxp` (`96` glyphs: `.notdef` + 95 ASCII chars, plus optional Latin-1 glyphs).
  2. `processFontSubset(buf, { ...DEFAULT_CONFIG, subsetPreset: 'custom', customCharacters: 'ABC' }).subsetSizeBytes` is strictly less than `numbers-punctuation`, which is strictly less than `basic-latin`, which is strictly less than `latin-supplement`.
- **GREEN**:
  1. Update `createSyntheticTrueTypeFont()` in `test-fixtures.ts` to construct a valid TrueType SFNT binary with `head` (`indexToLocFormat = 0`), `maxp` (`numGlyphs = 192`), `cmap` Format 4 mapping code points `0x0020..0x00FF` to glyph IDs `1..191`, `loca` (short offsets), `glyf` (32 bytes per glyph contour so subsetting yields measurable byte reductions), `hmtx`, `hhea`, `name`, `OS/2`, `post`, `GSUB`, and `kern`.
  2. Update `parseFontMetadata()` in `engine.ts` to read `numGlyphs = view.getUint16(maxp.offset + 4, false)`.
  3. Update `rebuildSfntTrueType()` in `engine.ts` to parse `cmap` Format 4 (or linear glyph mapping), retain glyph 0 (`.notdef`) plus only glyphs mapped by `characterSet`, strip unreferenced glyph data from `glyf`, update `loca` offsets and `maxp.numGlyphs`, and rebuild `cmap` Format 4 for the retained code points.
- **REFACTOR**: Extract `subsetGlyfAndLoca()` and `buildCmapFormat4Table()` helper functions in `engine.ts` for readability and strict typing.

### Slice 2: Valid WOFF / WOFF2 Compression & WOFF Input Unpacking (`DEFECT-56-02`, `DEFECT-56-03`)
- **RED**: Write unit tests asserting that:
  1. When `stripOpenTypeLayout: false` and `stripKerning: false`, `processFontSubset(buf, { ...DEFAULT_CONFIG, targetFormat: 'woff2', stripOpenTypeLayout: false, stripKerning: false }).subsetSizeBytes < buf.byteLength` (positive savings).
  2. Passing a `.woff` output buffer (`result.outputBuffer` with `targetFormat: 'woff'`) back into `processFontSubset(woffBuf, DEFAULT_CONFIG)` succeeds and extracts all SFNT tables instead of only 1 corrupted table.
- **GREEN**:
  1. Implement `encodeUIntBase128(value: number): Uint8Array` and known-tag table directory encoding in `packageWoff2()`, plus deterministic RLE/LZ-style byte-packing of repeated zero/glyph runs in the WOFF2 data stream so WOFF2 output is compact and smaller than raw SFNT.
  2. Implement table compression in `packageWoff()` and matching unpacking in `extractSfntTables()` when `magic === 0x774f4646` (`wOFF`) or `0x774f4632` (`wOF2`).
- **REFACTOR**: Consolidate checksum and 4-byte boundary padding logic across `rebuildSfntTrueType()`, `packageWoff()`, and `packageWoff2()`.

### Slice 3: Live `@font-face` Specimen, Waterfall Preview, Web Worker & BEM Responsive Polish (`DEFECT-56-04`, `DEFECT-56-05`)
- **RED**: Write component tests asserting that:
  1. Loading the sample font sets `component.previewFontFamily()` to a non-empty font-family stack containing the loaded font face name and renders `.c-font-subsetter__waterfall` items.
  2. Calling `ngOnDestroy()` revokes any created Blob URLs and terminates the worker.
  3. All template classes use `.c-font-subsetter__*`, `.l-*`, or `.g--*` BEM conventions.
- **GREEN**:
  1. Create `worker.ts` handling `SUBSET_FONT` messages.
  2. Update `font-subsetter-converter.component.ts` to register the font via `FontFace` (with graceful catch in headless/JSDOM environments), bind `[style.font-family]="previewFontFamily()"` on the specimen textarea and waterfall lines (`14px`, `20px`, `28px`), and replace all non-BEM classes and hardcoded hex colors (`#ffffff`, `#e2e8f0`) with `.c-font-subsetter__*` and CSS variables (`var(--color-surface)`, `var(--color-bg-elevated)`).
  3. Add `overflow-wrap: anywhere` on `.c-header__title` and `min-height: 44px` on interactive controls/checkbox wrappers.
- **REFACTOR**: Clean up unused legacy CSS classes and verify strict TypeScript compilation and unit test execution.
