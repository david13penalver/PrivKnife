# Task List (TDD Vertical Slices): Braille & ADA Tactile Door Sign Generator

> **Tool**: `38 - Braille & ADA Tactile Door Sign Generator`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Test Fixtures & Domain Contracts
- [ ] **Task 1.1: Create Domain Interfaces**
  - Path: `src/app/tools/3d/braille-ada-sign-generator/types.ts`
  - Define `BrailleAdaSignGeneratorOptions` and `BrailleAdaSignGeneratorResult`.
- [ ] **Task 1.2: Build Synthetic Test Fixtures**
  - Path: `src/app/tools/3d/braille-ada-sign-generator/test-fixtures.ts`
  - Provide valid default options and invalid/boundary test cases.

---

### 🟩 Phase 2: Engine Algorithmic Processing (Seam 1)
- [ ] **Task 2.1: Default Input Processing (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `process(defaultOptions)` produces a valid `BrailleAdaSignGeneratorResult` with non-empty blob and expected MIME type.
  - **Implementation (Green)**: Implement core processing in `engine.ts`.
- [ ] **Task 2.2: Parameter Validation & Edge Cases (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert invalid parameters throw a descriptive error or return `success: false`.
  - **Implementation (Green)**: Add validation guardrails in `engine.ts`.
- [ ] **Task 2.3: Deliverable Export Serialization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert export formatting conforms strictly to specifications for '.3mf', '.stl'.
  - **Implementation (Green)**: Implement client-side export serialization.

---

### 🟩 Phase 3: Angular Standalone Component UI (Seam 2)
- [ ] **Task 3.1: Controls & Reactive State Binding (Red → Green)**
  - **Test (Red)**: In `braille-ada-sign-generator.component.spec.ts`, assert changing controls updates signals and refreshes preview state.
  - **Implementation (Green)**: Build `BrailleAdaSignGeneratorComponent` with Angular Signals and BEM template.
- [ ] **Task 3.2: Export & Download Action (Red → Green)**
  - **Test (Red)**: In `braille-ada-sign-generator.component.spec.ts`, assert triggering download produces a blob URL and invokes client download anchor.
  - **Implementation (Green)**: Wire download action handler in component.
- [ ] **Task 3.3: Memory Hygiene & Disposal (Red → Green)**
  - **Test (Red)**: In `braille-ada-sign-generator.component.spec.ts`, assert `URL.revokeObjectURL()` is called upon reset and during component destruction.
  - **Implementation (Green)**: Implement cleanup logic via `DestroyRef` or `ngOnDestroy`.

---

### 🟩 Phase 4: Privacy & Zero-Exfiltration Guard (Seam 2)
- [ ] **Task 4.1: Zero Network Requests Verification (Red → Green)**
  - **Test (Red)**: In `braille-ada-sign-generator.component.spec.ts`, spy on `window.fetch` and `XMLHttpRequest.prototype.open`, run the full workflow, and assert 0 calls were dispatched.
  - **Implementation (Green)**: Ensure strictly local execution.

---

### 🟩 Phase 5: Tool Registry & Routing (Seam 3)
- [ ] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - **Test (Red)**: In `tool-registry.spec.ts`, assert tool `braille-ada-sign-generator` is defined, categorized as `'3d'`, and has `isFullyClientSide: true`.
  - **Implementation (Green)**: Create `index.ts` and register in `src/app/tools/tool-registry.ts`.
- [ ] **Task 5.2: Lazy Route in `app.routes.ts`**
  - Add route `{ path: 'tools/braille-ada-sign-generator', loadComponent: ... }` with keyword-rich SEO title and meta description.

---

### 🟩 Phase 6: Final Verification
- [ ] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [ ] Production build check: `npm run build` (0 errors, 0 warnings).
- [ ] Update `specs/README.md` catalog status to completed `[x]`.
