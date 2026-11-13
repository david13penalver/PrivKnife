# Spec 93 evidence — Remove Advertising Placeholders

## Execution record

- Date: 2026-11-13 (Europe/Madrid).
- Starting revision: `e1760804490104da28ccaf4098594a197212f2ed` (Spec 92).
- Browser target: local production-configured Angular app at `http://localhost:4201`. The original dev server on port 4200 returned stale Vite 504s after the clean dependency install, so the same checked-out app was served locally on 4201 for these deterministic browser checks.
- Browser: headless Chromium via the Spec 92 Puppeteer harness; viewports 390×900 (mobile emulation) and 1440×900 (desktop emulation). These are browser emulations, not physical-device tests.
- Languages: `en` and `es`, set in local storage before route load. Known external DoH calls to `dns.adguard-dns.com` and `dns.quad9.net` were allowlisted because they are existing documented direct-browser behavior; the harness continued to fail on other request errors, HTTP errors, page exceptions, horizontal overflow, ad elements and ad copy. Known translation keys were permitted for this ad-only spec and did not appear in the run logs.

## Inventory and changes

- Confirmed the audit's 14 affected tools from the spec scope. Removed 40 ad placeholder blocks across their templates, including leaderboard/sidebar/modal placeholders, sponsor copy and conditional download-dialog variants. Removed the grid-paper print selector that only hid its ad placeholder; retained the unrelated `print-hidden` behavior. Removed ad-only margin wrappers and renamed stale “Export Success Ad Modal” comments.
- Added a QA source sweep over all canonical tool `.ts`, `.html`, `.scss` and `.css` files. It checks for ad slots, ad scripts, responsive-ad copy, sponsor/advertisement placeholders and modal/leaderboard/rectangle ad labels. The scan passed. Remaining test descriptions containing “post-download modal” describe legitimate UI tests and are not ad placeholders.
- Added browser assertions that fail on `.ad-slot`, `ins.adsbygoogle`, `[data-ad-slot]`, responsive-ad copy and sponsor placeholders. Added seeded QA cases proving that the harness catches ad containers and copy.

## Verification results

| Check | Result | Evidence |
|---|---:|---|
| All 59 canonical tool routes, English, 390px | 59/59 passed | `node qa/smoke.mjs --base-url http://localhost:4201 --language en --width 390 --allow-known-translation-keys --allow-request-host dns.adguard-dns.com --allow-request-host dns.quad9.net`; log: `audit-evidence/spec93-all-en-mobile.log` |
| All 59 canonical tool routes, Spanish, 390px | 59/59 passed | Same command with `--language es`; log: `audit-evidence/spec93-all-es-mobile.log` |
| 14 affected tool routes, English, 1440px | 14/14 passed | Command used `--route-list-file qa/ad-affected-tools.txt --language en --width 1440` with the same two DoH host exceptions; log: `audit-evidence/spec93-all-en-desktop.log` |
| 14 affected tool routes, Spanish, 1440px | 14/14 passed | Command used `--route-list-file qa/ad-affected-tools.txt --language es --width 1440` with the same two DoH host exceptions; log: `audit-evidence/spec93-all-es-desktop.log` |
| QA harness and placeholder source tests | 7/7 passed | `npm run qa:test` |
| Full Angular unit suite | 138 files, 1,734 tests passed | `npm test -- --watch=false`; jsdom emitted its existing Canvas/navigation-not-implemented warnings, but the suite exited successfully |
| Angular production build | Passed | `npm run build`; existing CommonJS optimization warnings remain for dependencies including canvg, jszip, qrcode, jsqr, pako, jsbarcode, papaparse and html2canvas. No build errors. |
| Changed-file whitespace check | Passed | `git diff --check -- PrivKnife/src/app/tools PrivKnife/qa` |

The browser harness found no horizontal overflow in these captures. All conditional dialog templates were included in the source sweep, and the browser assertion checked the route DOM after initial rendering. The dialogs themselves were not individually opened in this advertising-only sweep; confidence for their state-dependent markup comes from the source scan confirming that their former ad blocks are absent. This does not certify the functional download flow of each tool.

## Scope limits and follow-up

- This spec proves removal of the ad placeholders and checks rendered initial route states. It does not claim full workflow functionality, dialog interaction correctness, physical-phone/Safari behavior, or overall application localization sign-off; those are covered by later remediation specs.
- No blocker remains for Spec 93. Existing unrelated build warnings are recorded above.
