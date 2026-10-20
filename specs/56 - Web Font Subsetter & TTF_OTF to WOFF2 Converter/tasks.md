# Task List (TDD Vertical Slices): Web Font Subsetter & TTF_OTF to WOFF2 Converter

> **Tool**: `56 - Web Font Subsetter & TTF_OTF to WOFF2 Converter`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Test Fixtures & Domain Contracts
- [x] **Task 1.1: Create Domain Interfaces**
  - Path: `src/app/tools/dev/font-subsetter-converter/types.ts`
  - Define `FontSubsetterConverterOptions` and `FontSubsetterConverterResult`.
- [x] **Task 1.2: Build Synthetic Test Fixtures**
  - Path: `src/app/tools/dev/font-subsetter-converter/test-fixtures.ts`
  - Provide valid default options and invalid/boundary test cases.

---

### 🟩 Phase 2: Engine Algorithmic Processing (Seam 1)
- [x] **Task 2.1: Default Input Processing (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `process(defaultOptions)` produces a valid `FontSubsetterConverterResult` with non-empty blob and expected MIME type.
  - **Implementation (Green)**: Implement core processing in `engine.ts`.
- [x] **Task 2.2: Parameter Validation & Edge Cases (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert invalid parameters throw a descriptive error or return `success: false`.
  - **Implementation (Green)**: Add validation guardrails in `engine.ts`.
- [x] **Task 2.3: Deliverable Export Serialization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert export formatting conforms strictly to specifications for '.woff2', '.css'.
  - **Implementation (Green)**: Implement client-side export serialization.

---

### 🟩 Phase 3: Angular Standalone Component UI (Seam 2)
- [x] **Task 3.1: Controls & Reactive State Binding (Red → Green)**
  - **Test (Red)**: In `font-subsetter-converter.component.spec.ts`, assert changing controls updates signals and refreshes preview state.
  - **Implementation (Green)**: Build `FontSubsetterConverterComponent` with Angular Signals and BEM template.
- [x] **Task 3.2: Export & Download Action (Red → Green)**
  - **Test (Red)**: In `font-subsetter-converter.component.spec.ts`, assert triggering download produces a blob URL and invokes client download anchor.
  - **Implementation (Green)**: Wire download action handler in component.
- [x] **Task 3.3: Memory Hygiene & Disposal (Red → Green)**
  - **Test (Red)**: In `font-subsetter-converter.component.spec.ts`, assert `URL.revokeObjectURL()` is called upon reset and during component destruction.
  - **Implementation (Green)**: Implement cleanup logic via `DestroyRef` or `ngOnDestroy`.

---

### 🟩 Phase 4: Privacy & Zero-Exfiltration Guard (Seam 2)
- [x] **Task 4.1: Zero Network Requests Verification (Red → Green)**
  - **Test (Red)**: In `font-subsetter-converter.component.spec.ts`, spy on `window.fetch` and `XMLHttpRequest.prototype.open`, run the full workflow, and assert 0 calls were dispatched.
  - **Implementation (Green)**: Ensure strictly local execution.

---

### 🟩 Phase 5: Tool Registry & Routing (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - **Test (Red)**: In `tool-registry.spec.ts`, assert tool `font-subsetter-converter` is defined, categorized as `'dev'`, and has `isFullyClientSide: true`.
  - **Implementation (Green)**: Create `index.ts` and register in `src/app/tools/tool-registry.ts`.
- [x] **Task 5.2: Lazy Route in `app.routes.ts`**
  - Add route `{ path: 'tools/font-subsetter-converter', loadComponent: ... }` with keyword-rich SEO title and meta description.

---

### 🟩 Phase 6: Final Verification
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Production build check: `npm run build` (0 errors, 0 warnings).
- [x] Update `specs/README.md` catalog status to completed `[x]`.
