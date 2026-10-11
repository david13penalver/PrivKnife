# Task List (TDD Vertical Slices): Universal Event & .ics Calendar Linker

> **Tool**: `16 - Universal Event & .ics Calendar Linker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/dev/calendar-linker/types.ts`
  - Define `CalendarEvent`, `RecurrenceFreq`, `CalendarUrls`, `EmbedSnippetType`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/dev/calendar-linker/test-fixtures.ts`
  - Define `DEFAULT_CALENDAR_EVENT`, sample recurring event, and expected RFC 5545 block.

---

### 🟩 Phase 2: Core Calendar Engine & URL Builders (Seam 1)
- [x] **Task 2.1: Implement RFC 5545 .ics String Builder (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateIcsFile()` produces valid VCALENDAR with VEVENT, escaped descriptions, and optional RRULE.
  - **Implementation (Green)**: Implement ICS builder in `engine.ts`.
- [x] **Task 2.2: Implement Calendar Provider Deep-Link Builders (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateCalendarUrls()` produces valid Google, Outlook Web, Office 365, and Yahoo URLs.
  - **Implementation (Green)**: Implement URL encoders in `engine.ts`.
- [x] **Task 2.3: Implement HTML & Markdown Email Embed Builders (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateHtmlEmbed()` and `generateMarkdownEmbed()` produce cross-client markup.
  - **Implementation (Green)**: Implement embed formatters in `engine.ts`.
- [x] **Task 2.4: Implement ICS Blob Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportIcsBlob()` outputs a valid `text/calendar` Blob.
  - **Implementation (Green)**: Implement Blob exporter in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `calendar-linker.component.spec.ts`, assert:
    - Component initializes with default event values and live URLs.
    - Updating title, dates, location, and description reactively updates generated links and ICS content.
    - Recurrence toggle updates RRULE in generated output.
    - Loading demo event populates all fields.
  - **Implementation (Green)**: Build `CalendarLinkerComponent` with event form, preview card, and provider buttons.
- [x] **Task 3.2: Export, Download & Clipboard Actions (Red → Green)**
  - **Test (Red)**: In `calendar-linker.component.spec.ts`, assert:
    - "Download .ics" triggers file download and immediately revokes object URL.
    - "Copy Google Link" / "Copy HTML Snippet" copies text to clipboard with feedback state.
  - **Implementation (Green)**: Wire export actions and clipboard handler.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 2)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `calendar-linker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run generation and download, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/calendar-linker/index.ts` and add `calendarLinkerTool` to `TOOL_REGISTRY`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/calendar-linker` (and aliases) with complete SEO metadata.
- [x] **Task 5.3: Update Home Catalog & Specs Roadmap**
  - Add `calendar-linker` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 16 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
