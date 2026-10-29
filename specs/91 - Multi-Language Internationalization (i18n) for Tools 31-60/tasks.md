# Tasks 91: Implementation Checklist — i18n for Tools 31–60

- **Spec ID**: `91`
- **Feature Name**: `Multi-Language Internationalization (i18n) for Batch 2 (Tools 31–60)`

---

## Phase 1: Test Foundations & English/Spanish Baseline (Slice 1)
- [x] **1.1 (Red)**: Add unit tests in `src/app/core/i18n/i18n.service.spec.ts` asserting all 30 Batch 2 tool keys (`tools.parametricLampDesigner.name` through `tools.csvVectorChartBuilder.name`) resolve in English (`en`) and Spanish (`es`).
- [x] **1.2 (Green)**: Add all 30 tool translations to `src/app/core/i18n/locales/en.ts` and update `home.ribbonTools` / `home.searchPlaceholder` to `59+`.
- [x] **1.3 (Green)**: Add all 30 tool translations to `src/app/core/i18n/locales/es.ts` and update `home.ribbonTools` / `home.searchPlaceholder` to `59+`.

## Phase 2: Multi-Language Locales Expansion (Slice 2)
- [x] **2.1 (Red)**: Add unit test in `src/app/core/i18n/i18n.service.spec.ts` verifying that switching to each of the 6 additional languages (`fr`, `it`, `de`, `zh`, `ja`, `ar`) properly resolves translated names and descriptions for all Batch 2 tools.
- [x] **2.2 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/fr.ts`.
- [x] **2.3 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/it.ts`.
- [x] **2.4 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/de.ts`.
- [x] **2.5 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/zh.ts`.
- [x] **2.6 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/ja.ts`.
- [x] **2.7 (Green)**: Add 30 tool translations and `59+` strings to `src/app/core/i18n/locales/ar.ts`.

## Phase 3: Catalog Binding & Showcase Reactive Search (Slice 3)
- [x] **3.1 (Red)**: Write unit tests in `src/app/pages/home/home.spec.ts` asserting:
  - Every item in `CATALOG_TOOLS` has a defined `i18nKey`.
  - Batch 2 tool cards dynamically update titles and descriptions when the active language changes.
  - Multilingual search queries match translated names and descriptions for Batch 2 tools.
- [x] **3.2 (Green)**: Bind `i18nKey` to tools 31–60 in `CATALOG_TOOLS` inside `src/app/pages/home/home.ts`.

## Phase 4: Verification & Regression Gate
- [x] **4.1**: Run unit tests: `npx ng test --watch=false --include="src/app/core/i18n/**/*.spec.ts"` and `src/app/pages/home/**/*.spec.ts`.
- [x] **4.2**: Run full application build: `npm run build` to verify clean lazy chunk compilation for all locale dictionaries.
- [x] **4.3**: Run headless Chrome audit to verify language dropdown switching updates the entire 59-tool catalog seamlessly with 0 console errors and 0 network requests.
