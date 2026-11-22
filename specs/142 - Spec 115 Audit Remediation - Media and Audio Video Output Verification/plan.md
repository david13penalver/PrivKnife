# Spec 142 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Create a fixture catalog with known orientation, transparency, duration, audio channels and input ordering. Choose independent local media consumers for the advertised formats and document codec support.
2. Run the route checklist from import or sample through output, then decode the artifacts. Assert metadata and image pixels, cue and clip timing, audio structure, or archive contents according to the route.
3. Use controlled missing-codec and invalid inputs, replace an ongoing job and retry a supported file. Record actual worker use, progress, disposal and network observations in the secure browser run.

## Verification

Run the applicable commands from `PrivKnife/`. Focused media tests, the 14 browser cases and independent decode and recovery evidence.
