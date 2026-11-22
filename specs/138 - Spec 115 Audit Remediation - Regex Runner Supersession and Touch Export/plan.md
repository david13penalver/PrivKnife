# Spec 138 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Add component coverage for initial matches without a test-side manual run. Add a controllable worker test that holds an old job and observes replacement messages, watchdog timing and disposal.
2. Update initial dispatch and replacement ownership. Clear the previous timer, settle the previous operation, terminate the busy worker, and begin the replacement with its own watchdog. Exercise late callbacks and disposal.
3. Drive the production route at phone widths. Use keyboard and touch to switch to Matches, then reopen JSON and compare its dates with the fixture. Record physical device follow-up through Spec 139.

## Verification

Run the applicable commands from `PrivKnife/`. Focused Angular and worker tests, production browser touch and keyboard sessions, and a parsed JSON download.
