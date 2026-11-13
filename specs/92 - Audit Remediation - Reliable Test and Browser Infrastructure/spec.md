# Spec 92: Audit Remediation - Reliable Test and Browser Infrastructure

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** None; start here.
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

The baseline has one failing clipboard mock; instrumented runs show additional clipboard failures and 5-second timeouts. Coverage required an uncommitted provider installation that changed the local Vitest version. Canvas and WebGL mocks cannot validate actual rendering. The audit browser scripts capture initial pages only.

## Requirements

1. Pin compatible test runner and coverage-provider versions in package.json and the lockfile; document the supported Node/browser versions and clean-install procedure.
2. Fix navigator.clipboard stubs in favicon-generator and bank-statement-converter using restorable configurable mocks. Test success and permission denial without leaking global state.
3. Reproduce Braille engine and lamp 3MF timeouts under isolated and instrumented runs; profile work before selecting justified timeout budgets. Never hide failures through retries or arbitrary timeout inflation.
4. Provide a reproducible browser runner with local fixture loading, downloads, console/network capture, viewport/language selection, readiness checks and cleanup. Preserve failed attempts alongside retries.
5. Build a canonical manifest of all 59 tool IDs, routes, source directories and categories. Assert one entry per canonical tool and exclude redirects from the denominator.
6. Produce trustworthy coverage reports on failure, verify source-map attribution, and identify omitted source files including workers. This spec establishes measurement; spec 101 delivers full coverage.

## Acceptance criteria

- **AC-92-01:** A clean install followed by the documented unit command has no failed tests or unexplained flaky reruns.
- **AC-92-02:** Two consecutive runs in the same environment produce stable pass/fail results; coverage reports include executable engines, components and workers or explicitly fail for omissions.
- **AC-92-03:** A seeded browser error, failed export and omitted tool are detected by the harness; at least one Canvas/WebGL workflow and one worker export run in the real browser.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.
