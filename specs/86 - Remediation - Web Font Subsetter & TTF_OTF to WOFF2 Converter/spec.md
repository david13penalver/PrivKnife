# Remediation Specification: Web Font Subsetter & TTF/OTF to WOFF2 Converter (Tool 56)

- **Target Tool**: `56` — `font-subsetter-converter` (Web Font Subsetter & TTF/OTF to WOFF2 Converter)
- **Category**: `dev`
- **Original Spec**: [`specs/56 - Web Font Subsetter & TTF_OTF to WOFF2 Converter/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/56%20-%20Web%20Font%20Subsetter%20&%20TTF_OTF%20to%20WOFF2%20Converter/spec.md)
- **Audit Report**: [`tools_31_60_audit.md` §56](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md)
- **Source Directory**: [`PrivKnife/src/app/tools/dev/font-subsetter-converter/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/)
- **Remediation Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

- **Audit Verdict**: Functional `⚠️ Partial` | Mobile `⚠️ Minor issues` | Overall `⚠️`
- **Desktop / Mobile / Small Screenshots**:
  - `desktop.png`, `mobile.png`, `mobile-small.png` (`$SCRATCH/shots/font-subsetter-converter/`)
  - `functional-subset-woff2.png`, `functional-woff-custom.png` (`$SCRATCH/shots/font-subsetter-converter/`)
- **Defect Summary Table**:

| Defect ID | Severity | Category | Summary |
| :--- | :--- | :--- | :--- |
| `DEFECT-56-01` | `High` | `Engine Logic` | `rebuildSfntTrueType()` ignores `characterSet` and only drops layout/kerning tables, producing identical `468 B` binaries across all Unicode presets and custom character strings; `parseFontMetadata()` hardcodes `numGlyphs: 256` |
| `DEFECT-56-02` | `High` | `Engine Logic` | `packageWoff2()` writes a `wOF2` (`0x774f4632`) header followed by uncompressed 20-byte WOFF 1.0 directory entries and raw SFNT bytes, and `packageWoff()` skips deflate compression—making exported WOFF/WOFF2 files larger than input TTF when layout tables are retained |
| `DEFECT-56-03` | `Medium` | `Engine Logic` | `validateFontBuffer()` and the dropzone accept `.woff` and `.woff2` inputs, but `extractSfntTables()` assumes a raw SFNT header at byte 0 (`numTables = view.getUint16(4)`), misreading WOFF headers as 1 table and corrupting output |
| `DEFECT-56-04` | `Medium` | `Spec Conformance` | Live Specimen `<textarea class="specimen-textarea">` uses `font-family: inherit` (system sans-serif) instead of loading the uploaded/subsetted font via `FontFace`; `createSyntheticTrueTypeFont()` in `test-fixtures.ts` generates a non-renderable stub binary |
| `DEFECT-56-05` | `Medium` | `Mobile & Responsive Layout` / `Theme Contrast` / `Web Worker & Performance` | Horizontal overflow at `390px` (`446px`) and `320px` (`447px`) from `.c-header__title`; 3 undersized touch targets; hardcoded light-mode colors (`.specimen-box { background: #ffffff }`, `.code-header { background: #e2e8f0 }`) and non-BEM classes; no `worker.ts` for off-main-thread binary font processing |

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-56-01` — Unicode Range Presets & Custom Character Subsetting Do Not Subset `cmap`/`glyf`/`loca` Tables
- **Severity**: `High`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L76-L81`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L76-L81) (`parseFontMetadata`)
  - [`engine.ts#L231-L299`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L231-L299) (`rebuildSfntTrueType`)
  - [`engine.ts#L444-L453`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L444-L453) (`processFontSubset`)
- **Audit Evidence & Reproduction Steps**:
  1. Navigate to `http://127.0.0.1:4300/tools/font-subsetter-converter` and click **Load Sample Font (572 B)**.
  2. Switch **Character Subset Preset** across `Basic Latin (0020–007F)` (`95 glyphs`), `Latin-1 Supplement` (`191 glyphs`), `Numbers & Punctuation` (`43 glyphs`), and `Custom Characters` with `"ABC"` (`3 glyphs`).
  3. Observe that while **Subset Glyphs** changes (`95` → `191` → `43` → `3`), **Output Size** remains locked at `468.0 B` (`Savings: 18%`) for every single preset and custom character string.
- **Root Cause Analysis**:
  - In [`processFontSubset()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L444-L453), `const characterSet = getUnicodeRangeForPreset(...)` is computed and passed to `rebuildSfntTrueType(fontBuffer, characterSet, config)`.
  - Inside [`rebuildSfntTrueType()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L231-L250), `_characterSet` is only inspected to check `const _keepAsciiOnly = _characterSet.size < 256` (`line 250`), which is never used. The function only filters out `GSUB`/`GPOS`/`GDEF`/`JSTF`/`BASE` (when `stripOpenTypeLayout` is true) and `kern` (when `stripKerning` is true), copying `cmap`, `glyf`, `loca`, `hmtx`, and `maxp` byte-for-byte unchanged.
  - Additionally, [`parseFontMetadata()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L80) hardcodes `numGlyphs: 256` instead of reading `numGlyphs` from the `maxp` table (`view.getUint16(maxpOffset + 4, false)`).

### `DEFECT-56-02` — Invalid Uncompressed WOFF2 Container & Uncompressed WOFF1 Tables Increase File Size
- **Severity**: `High`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L304-L354`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L304-L354) (`packageWoff`)
  - [`engine.ts#L359-L410`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L359-L410) (`packageWoff2`)
- **Audit Evidence & Reproduction Steps**:
  1. Load the sample font (`572 B`) and uncheck **Strip OpenType Layout (GSUB/GPOS)** and **Strip Legacy Kerning (kern)**.
  2. Observe that `WOFF2` output is `636.0 B` (`Savings: -0%`) and `WOFF` output is `632.0 B` (`Savings: -0%`)—both *larger* than the `572 B` uncompressed TTF input.
  3. Inspect the downloaded `.woff2` binary or attempt to load it via `new FontFace('Test', woff2Buffer)`: browsers reject it with `DOMException: Failed to decode downloaded font: OTS parsing error`.
- **Root Cause Analysis**:
  - [`packageWoff2()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L359-L410) writes the 48-byte `wOF2` (`0x774f4632`) header followed by fixed 20-byte WOFF 1.0-style table directory entries (`numTables * 20`) and raw uncompressed SFNT bytes. Per the W3C WOFF2 specification, WOFF2 uses variable-length `UIntBase128` table directory entries with known-tag indices (`bits 0..5`) and a compressed table data stream. Writing 20-byte uncompressed directory entries under a `wOF2` signature produces a corrupt container that fails OTS validation in every browser.
  - [`packageWoff()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L304-L354) sets `compLength = table.length` and never compresses individual SFNT tables with zlib/deflate (`CompressionStream('deflate')`), adding 44 bytes of WOFF header + `20 * numTables` directory overhead without any compression savings.

### `DEFECT-56-03` — `.woff` and `.woff2` Input Files Are Accepted by Validation Read as Raw SFNT at Offset 0
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L35-L46`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L35-L46) (`validateFontBuffer`)
  - [`engine.ts#L203-L226`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L203-L226) (`extractSfntTables`)
- **Audit Evidence & Reproduction Steps**:
  1. Upload a valid `.woff` file (`0x774F4646` magic) via `<app-dropzone accept=".ttf,.otf,.woff,.woff2">`.
  2. `validateFontBuffer()` returns `valid: true, format: 'WOFF'`, and `processFontSubset()` runs without throwing, but the exported font is corrupt (`112 B`).
- **Root Cause Analysis**:
  - [`extractSfntTables()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts#L203-L226) unconditionally reads `numTables = view.getUint16(4, false)` and parses 16-byte SFNT table directory records starting at offset `12`. In a WOFF 1.0 header, bytes `4..7` hold the `flavor` (`0x00010000`), so `view.getUint16(4, false)` reads `1` instead of `numTables` at byte `12`, and reads WOFF header fields as an SFNT table record.

### `DEFECT-56-04` — Live Specimen Preview Does Not Load or Render the Uploaded/Subsetted Font
- **Severity**: `Medium`
- **Category**: `Spec Conformance`
- **Location**:
  - [`font-subsetter-converter.component.ts#L285-L291`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L285-L291)
  - [`font-subsetter-converter.component.ts#L398-L407`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L398-L407)
  - [`test-fixtures.ts#L15-L58`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/test-fixtures.ts#L15-L58)
- **Audit Evidence & Reproduction Steps**:
  1. Load the sample font or upload a `.ttf` font and inspect `<textarea class="specimen-textarea">` inside the **Live Specimen & Waterfall** card.
  2. Computed `font-family` on `.specimen-textarea` is `inherit` (system UI sans-serif); `document.fonts` never receives a `FontFace` instance for the loaded or subsetted font, and there is no waterfall size preview (`12px`, `16px`, `24px`, `36px`).
- **Root Cause Analysis**:
  - `.specimen-textarea` (`line 403`) sets `font-family: inherit;` and no `FontFace` registration logic exists in [`font-subsetter-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts). Furthermore, [`createSyntheticTrueTypeFont()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/test-fixtures.ts#L15-L58) fills `cmap`/`glyf`/`head` with `(i * 7 + 13) & 0xff` dummy bytes rather than a valid minimal SFNT TrueType font structure.

### `DEFECT-56-05` — Mobile Horizontal Overflow, Undersized Touch Targets, Non-BEM Light-Only Styles, and Missing Web Worker
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast` / `Web Worker & Performance`
- **Location**:
  - [`font-subsetter-converter.component.ts#L20-L27`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L20-L27)
  - [`font-subsetter-converter.component.ts#L336-L450`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L336-L450)
  - [`font-subsetter-converter.component.ts#L471-L485`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts#L471-L485)
- **Audit Evidence & Reproduction Steps**:
  1. At `390×844` and `320×568`, `document.documentElement.scrollWidth` is `446px` / `447px` because `.c-header__title` overflows horizontally.
  2. Touch target audit flags 3 controls under `32px`: `#fontFamilyName` (`306×28px`), `#stripOpenTypeLayout` (`13×13px`), and `#stripKerning` (`13×13px`).
  3. `.specimen-box` (`background: #ffffff; border: 1px solid #cbd5e1`) and `.code-header` (`background: #e2e8f0; color: #334155`) use hardcoded light-theme hex colors and non-BEM class names (`.tool-page`, `.stats-bar`, `.specimen-box`, `.code-box`, `.privacy-banner`).
  4. `subsetResult = computed(() => processFontSubset(buf, this.config()))` runs binary font parsing and rebuilding synchronously on the Angular UI thread without a `worker.ts` (violating `AGENTS.md` Directive 3).
- **Root Cause Analysis**:
  - Missing `overflow-wrap: anywhere` on `.c-header__title`, unstyled checkboxes/text inputs lacking `min-height: 44px`, inline non-BEM CSS classes with hardcoded hex colors instead of CSS custom properties (`var(--color-surface)`), and absence of a dedicated Web Worker (`worker.ts`) for font subsetting/compression.

---

## 3. Target Acceptance Criteria

1. **Real Glyph & `cmap`/`glyf`/`loca` Subsetting (`DEFECT-56-01`)**:
   - `parseFontMetadata()` MUST read `numGlyphs` from the `maxp` table (`offset + 4`) and parse `cmap` Format 4 / Format 12 subtables to map Unicode code points to glyph IDs (`gid`).
   - `rebuildSfntTrueType()` MUST subset `cmap` to only the code points in `characterSet` (plus `.notdef` glyph 0) and zero/trim unused glyph entries in `glyf`/`loca` so that smaller character sets (`Custom Characters: "ABC"` < `Numbers & Punctuation` < `Basic Latin` < `Latin-1 Supplement`) produce strictly smaller output binaries.
2. **Valid WOFF / WOFF2 Packaging & Compression (`DEFECT-56-02`)**:
   - `packageWoff()` MUST compress eligible SFNT tables (via `CompressionStream('deflate')` or pure-TS deflate/zlib) when the compressed length is strictly smaller than `origLength`, writing a standards-compliant WOFF 1.0 header and table directory.
   - `packageWoff2()` MUST write valid WOFF2 `UIntBase128` table directory entries and compressed stream (or valid WOFF2 table blocks) so that exported binaries are smaller than the raw TTF input even when layout tables are kept.
3. **WOFF Input Unpacking (`DEFECT-56-03`)**:
   - `extractSfntTables()` MUST detect WOFF 1.0 (`0x774F4646`) headers at offset 0, read `numTables` at byte `12`, parse the 20-byte WOFF table directory starting at byte `44`, decompress any deflated tables, and extract clean SFNT tables before rebuilding.
4. **Live `@font-face` Specimen & Waterfall Preview (`DEFECT-56-04`)**:
   - `createSyntheticTrueTypeFont()` in `test-fixtures.ts` MUST build a valid, spec-compliant minimal TrueType font containing `cmap`, `glyf`, `head`, `hhea`, `hmtx`, `loca`, `maxp`, `name`, `OS/2`, and `post` tables with distinct glyph contours for ASCII characters (`0x20`–`0x7E`).
   - When a font is loaded or subsetted, the component MUST register it via the `FontFace` API (or an injected `@font-face` Blob URL with proper cleanup in `ngOnDestroy`) and apply that `font-family` to the Live Specimen textarea and a multi-size waterfall preview (`12px`, `18px`, `28px`).
5. **Responsive BEM Layout, Dark-Mode Contrast & Web Worker (`DEFECT-56-05`)**:
   - Zero horizontal overflow (`scrollWidth <= clientWidth`) at `1440px`, `390px`, and `320px`.
   - All interactive controls (`input`, `select`, `checkbox` labels, buttons) MUST have a minimum touch target of `44×44px` on mobile and `font-size >= 16px` on inputs/textareas.
   - Replace all non-BEM classes and hardcoded light hex colors (`#ffffff`, `#e2e8f0`) with `.c-font-subsetter__*` BEM classes and CSS theme tokens (`var(--color-surface)`, `var(--color-border)`, `var(--color-text)`).
   - Provide `worker.ts` to offload font subsetting and compression off the main thread when available, with automatic fallback to `engine.ts` in unit test / non-worker environments.
