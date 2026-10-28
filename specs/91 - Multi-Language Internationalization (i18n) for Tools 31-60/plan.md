# Plan 91: TDD Implementation Plan — Multi-Language Internationalization (i18n) for Tools 31–60

- **Spec ID**: `91`
- **Feature Name**: `Multi-Language Internationalization (i18n) for Batch 2 (Tools 31–60)`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/
├── src/app/core/i18n/
│   ├── locales/
│   │   ├── en.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── es.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── fr.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── it.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── de.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── zh.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   ├── ja.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   │   └── ar.ts                # Add tools 31-60 + update ribbonTools/searchPlaceholder
│   ├── i18n.service.ts          # Core service managing locale resolution
│   └── i18n.service.spec.ts     # Add verification tests for all 30 Batch 2 tools in all 8 locales
└── src/app/pages/home/
    ├── home.ts                  # Assign i18nKey to items 31-60 in CATALOG_TOOLS
    └── home.spec.ts             # Test that all 59 CATALOG_TOOLS have valid i18nKey and resolve reactively
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Dictionary Integrity & Completeness Boundary (`src/app/core/i18n/locales/*.ts`)
- **Seam**: TypeScript compilation of `TranslationSchema` and dictionary objects.
- **Contract Under Test**:
  - `en.tools` contains all 30 keys from `parametricLampDesigner` to `csvVectorChartBuilder`.
  - Every language (`es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`) defines every one of those 30 keys with non-empty `name` and `description` strings.
  - `home.ribbonTools` and `home.searchPlaceholder` contain `"59+"` in every locale.

### Seam 2: Service Resolution & Multilingual Fallback Boundary (`i18n.service.ts` / `i18n.service.spec.ts`)
- **Seam**: `I18nService.t(key: string, params?: Record<string, string | number>)`
- **Contract Under Test**:
  - `i18n.t('tools.parametricLampDesigner.name')` resolves properly in all 8 languages.
  - Calling `i18n.setLanguage('es')` immediately updates computed translations for all Batch 2 tools.
  - RTL directionality for Arabic (`ar`) remains preserved.

### Seam 3: Home Catalog Presentation & Search Boundary (`home.ts` / `home.spec.ts`)
- **Seam**: `Home` Angular standalone component, `CATALOG_TOOLS` array, and `filteredTools()` computed signal.
- **Contract Under Test**:
  - Every element in `CATALOG_TOOLS` has a defined `i18nKey`.
  - Switching language reactively updates all 59 rendered tool card headings (`tools.<i18nKey>.name | translate`).
  - Search query `q = "lámpara"` or `q = "litofanía"` successfully filters to the corresponding Batch 2 tool cards when Spanish is active.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: English & Spanish Dictionary Schema Expansion & Tests
1. **Red**:
   - In `i18n.service.spec.ts`, add tests asserting that `i18n.t('tools.parametricLampDesigner.name')`, `i18n.t('tools.lithophaneMaker.name')`, through `i18n.t('tools.csvVectorChartBuilder.name')` resolve to non-empty strings in `'en'` and `'es'`.
   - Run tests &rarr; **Red** (keys do not exist yet in dictionaries).
2. **Green**:
   - Update `en.ts` with all 30 Batch 2 tool entries and update `ribbonTools` / `searchPlaceholder` to `59+`.
   - Update `es.ts` with all 30 Batch 2 tool entries and update `ribbonTools` / `searchPlaceholder` to `59+`.
   - Run tests &rarr; **Green**.
3. **Refactor**:
   - Validate key names match catalog kebab-case slugs mapped to camelCase.

### Slice 2: Full Multi-Language Dictionary Expansion (`fr`, `it`, `de`, `zh`, `ja`, `ar`)
1. **Red**:
   - In `i18n.service.spec.ts`, add a comprehensive test iterating through all 8 supported languages (`en`, `es`, `fr`, `it`, `de`, `zh`, `ja`, `ar`) and all 30 Batch 2 tools, asserting that `i18n.t('tools.' + toolKey + '.name')` returns a localized title distinct from key paths.
   - Run tests &rarr; **Red** for `fr`, `it`, `de`, `zh`, `ja`, `ar`.
2. **Green**:
   - Add all 30 tool translations and `59+` string updates to `fr.ts`, `it.ts`, `de.ts`, `zh.ts`, `ja.ts`, and `ar.ts`.
   - Run tests &rarr; **Green**.
3. **Refactor**:
   - Ensure clean alphabetical or numerical grouping in each dictionary file.

### Slice 3: Catalog Binding & Showcase Reactive Search in `home.ts`
1. **Red**:
   - In `home.spec.ts`, write tests asserting:
     1. Every tool in `CATALOG_TOOLS` has an `i18nKey` defined (`expect(tool.i18nKey).toBeDefined()`).
     2. Switching to Spanish updates the rendered card title for Tool 31 (`parametric-lamp-designer`) and Tool 32 (`lithophane-maker`).
     3. Filtering with a Spanish search query matches translated tool cards.
   - Run tests &rarr; **Red** (Tools 31–60 lack `i18nKey`).
2. **Green**:
   - Add `i18nKey: '...'` to all 30 items in `CATALOG_TOOLS` in `home.ts`.
   - Run tests &rarr; **Green**.
3. **Refactor**:
   - Verify consistent sorting and category taxonomy across catalog items.

### Slice 4: End-to-End Build & Verification
1. Run full test suite: `npx ng test --watch=false`.
2. Run production build: `npm run build`.
3. Verify zero bundle regression and clean dynamic chunk generation for all 8 locales.
