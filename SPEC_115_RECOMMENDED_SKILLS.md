# Skills for the spec 115 audit findings

All three skills are installed in this repository and pinned in [skills-lock.json](skills-lock.json). Start with behavior tests for PDF redaction, OCR and WOFF2 export. Apply the Angular and mobile skills when the fix crosses into job handling or the user interface.

| Skill | Where to apply it | Evidence to require before closing the change |
|---|---|---|
| [tdd](https://skills.sh/mattpocock/skills/tdd) | Cover a synthetic word and force PDF rendering to fail. Export a real TTF as WOFF2. Upload a blank raster and an image bearing a unique word through the OCR worker. | Redaction failure blocks download. The font opens in an independent decoder. The blank produces an empty result or an explicit recognition failure. The second output contains the unique word. Reopen the downloaded text and compare it to the preview. |
| [angular-developer](https://skills.sh/angular/angular/angular-developer) | Extract the OCR job state and cancellation into a component-scoped view model. Apply the same pattern when modifying the large invoice and 3D editors. | Unit tests cover replacing a pending job, stale messages, failure recovery and disposal on navigation. The production build still lazy-loads the tool. |
| [frontend-ui-engineering](https://skills.sh/addyosmani/agent-skills/frontend-ui-engineering) | Implement the upload, status, reset and download controls with the shared components. Check the longest translated labels on narrow screens. | Complete the workflow at 320 and 390 CSS pixels with touch, then keyboard only. Inspect focus after errors and reset, read the status with a screen reader, and verify controls remain reachable with the software keyboard open. |

Use the repository's Chromium/Puppeteer harness and Angular tests for verification. A skill guides implementation. A reopened output file, a measured coverage delta and a passing browser regression provide the release evidence.
