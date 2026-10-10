# Test-Driven Development (TDD) Implementation Plan: EXIF & Privacy Metadata Stripper

> **Tool**: `01 - EXIF & Privacy Metadata Stripper`  
> **Route**: `/tools/exif-stripper`  
> **Category**: `privacy`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor in review)

---

## 1. Architecture & Domain Overview

The **EXIF & Privacy Metadata Stripper** is a client-side utility designed to detect, display, and purge hidden metadata (GPS coordinates, camera models, exposure data, device serials, software tags, and timestamps) from JPEG and PNG photos.

In adherence with **Directive 1 & 2 of `AGENTS.md`**, 100% of the byte manipulation takes place inside the browser using native Web APIs (File API, ArrayBuffer, DataView, HTML5 Canvas) and client-side binary parsing. No file or hash is ever transmitted across the network.

### Directory Layout (`src/app/tools/privacy/exif-stripper/`)
```
src/app/tools/privacy/exif-stripper/
├── index.ts                      # Tool registry definition and metadata
├── types.ts                      # Domain models (ExifTag, ParsedMetadata, StrippedResult)
├── engine.ts                     # Pure client-side parsing & stripping engine (zero Angular, zero DOM)
├── engine.spec.ts                # Unit tests for binary engine (Seam 1)
├── exif-stripper.component.ts    # Angular Standalone Component with Signals & BEM
├── exif-stripper.component.html  # Accessible UI template
├── exif-stripper.component.scss  # Component-specific styles (if any)
└── exif-stripper.component.spec.ts # Component & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

Tests live exclusively at public seams to survive internal refactorings while exercising observable behavior:

### Seam 1: `ExifEngine` (Pure Processing Boundary)
- **Public Interface**:
  - `parseMetadata(buffer: Uint8Array, mimeType: string): ParsedMetadata`
  - `stripMetadata(buffer: Uint8Array, mimeType: string): StrippedResult`
- **What it catches**:
  - Correct detection of standard EXIF/TIFF tags (Make, Model, DateTime, GPS Latitude/Longitude, Software).
  - Complete removal of `APP1` EXIF/XMP markers and comment chunks from JPEGs without recompressing image data.
  - Removal of ancillary metadata chunks (`tEXt`, `zTXt`, `iTXt`, `eXIf`) from PNG byte streams.
  - Validation of file signatures (`FF D8` for JPEG, `89 50 4E 47` for PNG) and handling of corrupt/empty buffers.
- **What it misses**:
  - DOM events, Drag-and-drop file ingestion, Angular Signal reactivity, visual download prompts, and UI animations.

### Seam 2: `ExifStripperComponent` (Angular UI & Interaction Boundary)
- **Public Interface**:
  - User uploads/drops an image file &rarr; component displays image preview and detected metadata breakdown.
  - User triggers "Strip Metadata & Download" &rarr; component triggers sanitized file download and updates tag count to 0.
  - User triggers "Reset / Clear" &rarr; component disposes of memory and revokes all created `ObjectURL`s.
- **What it catches**:
  - Angular Signals reactivity (`selectedFile`, `metadata`, `isProcessing`, `cleanedBlob`, `downloadUrl`).
  - BEM styling contract compliance (`.c-card`, `.c-badge--privacy`, `.c-dropzone`, `.c-button`).
  - Zero Network Exfiltration: Asserts that 0 HTTP requests (`fetch` / `XMLHttpRequest`) are made during processing.
  - Memory Hygiene: Asserts that `URL.revokeObjectURL()` is called when resetting and on `ngOnDestroy`.
- **What it misses**:
  - Low-level byte-offset quirks of individual EXIF tag parsing (which Seam 1 covers).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - `toolRegistry` export in `src/app/tools/tool-registry.ts`.
  - Lazy route definition in `src/app/app.routes.ts`.
- **What it catches**:
  - Route reachability, SEO title & meta description tags, category registration.
- **What it misses**:
  - Interactive UI behavior and binary parsing.

---

## 3. Data Models (`types.ts`)

```typescript
export interface ExifTag {
  name: string;
  category: 'Device' | 'Location' | 'Timestamp' | 'Technical' | 'Other';
  value: string;
  isSensitive: boolean; // true for GPS, Serial Numbers, Timestamps
}

export interface ParsedMetadata {
  hasMetadata: boolean;
  format: 'jpeg' | 'png' | 'unknown';
  tagCount: number;
  tags: ExifTag[];
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  fileSize: number;
  fileName: string;
}

export interface StrippedResult {
  cleanedBuffer: Uint8Array;
  originalSize: number;
  cleanedSize: number;
  tagsRemovedCount: number;
  mimeType: string;
}
```

---

## 4. Binary Processing Strategy

1. **JPEG Processing**:
   - Parse JPEG marker segments (`SOI = 0xFFD8`).
   - Read marker bytes (`0xFFE1` for APP1/EXIF, `0xFFE2` for APP2, `0xFFED` for APP13/IPTC, `0xFFFE` for COM).
   - Extract TIFF header within `APP1` (`0x4949` Little Endian or `0x4D4D` Big Endian) to parse standard tags and GPS IFD pointers.
   - For stripping: Slice out all `APP1` through `APP15` metadata segments, preserving standard framing markers (`SOF0`, `DHT`, `DQT`, `SOS`, etc.) so the original compressed image payload is preserved bit-for-bit with **zero quality loss**.

2. **PNG Processing**:
   - Verify PNG 8-byte signature: `89 50 4E 47 0D 0A 1A 0A`.
   - Iterate chunks (`Length` [4 bytes], `Type` [4 bytes], `Data` [Length bytes], `CRC` [4 bytes]).
   - Extract metadata from text chunks: `tEXt`, `zTXt`, `iTXt`, and `eXIf`.
   - For stripping: Filter out any chunks matching metadata types (`eXIf`, `tEXt`, `zTXt`, `iTXt`), writing back only critical chunks (`IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`). This is 100% lossless and runs in < 2ms without Canvas re-compression artifacts.

---

## 5. UI/UX Workflow & Component Design

1. **Header & Privacy Badge**:
   - Title: "EXIF & Privacy Metadata Stripper"
   - Subtitle: "Strip GPS location, camera model, and device timestamps from your photos in one click."
   - Privacy Badge: `<app-badge variant="privacy">🛡️ 100% In-Browser • Never Leaves Your Device</app-badge>`
2. **Dropzone Area**:
   - `<app-dropzone>` accepting `.jpg, .jpeg, .png`.
   - File size warning for images > 100MB.
3. **Metadata Inspector & Comparison**:
   - Before & After tag counter: "Before: X Tags Detected" &rarr; "After: 0 Tags Remaining".
   - Breakdown Table categorized with badges: GPS Location (Red/Danger), Device/Camera, Timestamps.
   - If GPS coordinates exist, show human-readable latitude/longitude with warning.
4. **Action Bar**:
   - Primary: `<app-button variant="primary">` &rarr; "Strip Metadata & Download".
   - Secondary / Clear: `<app-button variant="outline">` &rarr; "Clear / Upload Another".
5. **Memory Management**:
   - Revoke created object URLs on file replacement, reset, and `ngOnDestroy`.

---

## 6. Anti-Patterns to Prevent

- **No Implementation-Coupled Tests**: Do not test private helper methods or internal offsets; assert on returned `ParsedMetadata` and `StrippedResult`.
- **No Tautological Assertions**: Use independent binary fixtures (handcrafted JPEG/PNG buffers with known headers) rather than re-running the stripping logic in the test.
- **No Horizontal Slicing**: Implement one vertical slice at a time (Test failing &rarr; minimal implementation passing &rarr; next slice).
