# Skills for the spec 115 audit findings

All three skills are installed in this repository and pinned in [skills-lock.json](skills-lock.json). Start with behavior tests for PDF redaction, OCR and WOFF2 export. Apply the Angular and mobile skills when the fix crosses into job handling or the user interface.

| Skill | Where to apply it | Evidence to require before closing the change |
|---|---|---|
| [tdd](https://skills.sh/mattpocock/skills/tdd) | Cover a synthetic word and force PDF rendering to fail. Export a real TTF as WOFF2. Upload a blank raster and an image bearing a unique word through the OCR worker. | Redaction failure blocks download. The font opens in an independent decoder. The blank produces an empty result or an explicit recognition failure. The second output contains the unique word. Reopen the downloaded text and compare it to the preview. |
| [angular-developer](https://skills.sh/angular/angular/angular-developer) | Extract the OCR job state and cancellation into a component-scoped view model. Apply the same pattern when modifying the large invoice and 3D editors. | Unit tests cover replacing a pending job, stale messages, failure recovery and disposal on navigation. The production build still lazy-loads the tool. |
| [frontend-ui-engineering](https://skills.sh/addyosmani/agent-skills/frontend-ui-engineering) | Implement the upload, status, reset and download controls with the shared components. Check the longest translated labels on narrow screens. | Complete the workflow at 320 and 390 CSS pixels with touch, then keyboard only. Inspect focus after errors and reset, read the status with a screen reader, and verify controls remain reachable with the software keyboard open. |

Use the repository's Chromium/Puppeteer harness and Angular tests for verification. A skill guides implementation. A reopened output file, a measured coverage delta and a passing browser regression provide the release evidence.

## Verification of the priority fixes

- PDF redaction exports newly rasterized pages. Chromium verified that a forced render failure produces an error and no download. Poppler recovered no text from the successful export. The rendered export retains visible content outside the redaction, and the source annotation and marker are absent.
- OCR runs in a cancellable worker with local recognition assets. Chromium exercised keyboard input at 320 CSS pixels and touch input at 390 CSS pixels, including Spanish errors and reset. Blank and damaged images produced no downloadable text. An independent image and a scanned PDF yielded the expected text. The downloaded TXT matched the preview.
- The font tool exports the selected Unicode mappings in standard WOFF2. The reference `woff2_decompress` CLI reopened a browser-exported Liberation Sans subset, and Fontconfig reported the expected `U+0020–007E` character range.

Targeted isolated coverage was measured on the three tool directories against commit `7897302`.

| Metric | Before | After |
|---|---:|---:|
| Statements | 68.05% | 73.34% |
| Branches | 54.33% | 57.23% |
| Functions | 64.93% | 67.55% |
| Lines | 69.40% | 76.09% |

Run the [browser regression](PrivKnife/qa/audit-115-browser.mjs) from `PrivKnife/` with the secure production preview listening on port 4533. The script uses Chromium, Poppler, ImageMagick, Fontconfig, and `woff2_decompress`.

```sh
npm run build
npm run qa:secure-preview -- --port 4533
```

In a second terminal, run `node qa/audit-115-browser.mjs`. Accessibility verification covered the Chromium accessibility tree and keyboard focus. Manual verification with a mobile software keyboard and a screen reader remains open.
