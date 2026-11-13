# Spec 92 verification evidence

Completed on 2026-11-13 against the current PrivKnife worktree. Tool inventory is generated from canonical lazy routes and cross-checked against `src/app/app.routes.ts`.

## Environment and clean install

- Node `v26.12.0`; npm `12.2.1`; Chromium `/usr/bin/chromium`; Vitest and `@vitest/coverage-v8` both `4.1.11`.
- `cd PrivKnife && npm ci` — exit 0 from the lockfile.
- `cd PrivKnife && npm run build` — exit 0. Existing bundler warnings identify CommonJS `jsbarcode` and `html2canvas`; no build errors.

## Unit and coverage runs

- `cd PrivKnife && npm test -- --watch=false` — 138 test files, 1,734 tests passed after the clipboard mock repairs.
- `cd PrivKnife && npm run test:ci` — run three times after the clean install; all three report 138/138 test files and 1,734/1,734 tests passing. Consecutive executions retained the same pass/fail result.
- `test:ci` enables V8 coverage and then runs `qa/coverage-manifest.mjs`. The manifest check confirms all **143** discovered executable tool components, engines, workers and registry files appear in `coverage/PrivKnife/coverage-summary.json`; its seeded test fails if an engine or worker is omitted.
- Latest aggregate coverage: statements **76.79%**, branches **59.92%**, functions **54.90%**, lines **79.45%**. These are the baseline for Spec 101, not a completed coverage target. Small run-to-run percentage variation is recorded in the raw logs at `audit-evidence/spec92-coverage-clean.log`, `spec92-coverage-repeat.log`, and `spec92-final-verification.log`.
- `cd PrivKnife && npm run qa:test` — 5/5 QA harness tests passed. Tests seed omitted/duplicate routes, browser exceptions, failed requests, missing/empty/malformed exports, NaN STL geometry, and omitted coverage files.

## Browser and export smoke

- `cd PrivKnife && node qa/smoke.mjs --route parametric-lamp-designer --language en --width 390 --require-canvas --click-text 'Download Print-Ready .STL' --artifact-extension stl --allow-known-translation-keys` — passed on installed Chromium.
- The capture found the expected Canvas/WebGL preview, logged 3 known untranslated preset keys, and used the actual worker export. The independent STL validator confirmed a 3,519,684-byte binary with a matching triangle count and finite normals/vertices.
- A repeated smoke attempt during a simultaneous production build timed out; rerunning without competing work passed. The harness records export timeouts as failures.
- Full 59-route EN/ES initial-page checks and responsive audit evidence remain in [the audit](../../APPLICATION_AUDIT_2026-11-13.md). This representative smoke supplements the route inventory and failure-injection tests; it does not certify every tool workflow.

## Repairs made

- Added a restorable clipboard test stub and migrated all ten read-only `Object.assign(navigator, { clipboard })` test patterns (eight additional suites plus the favicon and bank statement suites), including the initially failing favicon and bank statement suites.
- Added explicit 30-second limits only to the Braille all-presets NaN/3MF test and lamp 3MF export test. Both passed with instrumentation enabled; normal uninstrumented suite passes as well.
- Added the matching `@vitest/coverage-v8` 4.1.11 provider; its version matches the locked Vitest 4.1.11.
- Added `qa/tool-manifest.json`, a Puppeteer smoke harness, basic independent artifact validators, coverage-manifest verification and seeded Node tests.

The audit’s untranslated lamp presets remain a known failure outside this infrastructure spec and are assigned to Spec 95. Full 100% coverage remains assigned to Spec 101.
