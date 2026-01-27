# Plan: Document Social Media Story Example

## 1. Context
The "Social Media Story" example (`examples/social-media-story`) exists in the codebase and is included in the E2E verification script, but it is missing from the official status documentation (`docs/status/DEMO.md`) and the system context (`/.sys/llmdocs/context-demo.md`). This plan aims to rectify this discrepancy by formally documenting the example and verifying its functionality.

## 2. File Inventory
- `docs/status/DEMO.md`: Update to include "Social Media Story" in the Current State and Log.
- `/.sys/llmdocs/context-demo.md`: Update to include "Social Media Story" in the Examples list.

## 3. Dependencies
- No external dependencies.
- Relies on existing `examples/social-media-story` files.

## 4. Success Criteria
- `docs/status/DEMO.md` lists "Social Media Story" as a working example.
- `/.sys/llmdocs/context-demo.md` includes the example description.
- `npm run build:examples` passes.
- `tests/e2e/verify-render.ts` passes for all examples, including "Social Media Story".

## 5. Implementation Steps
1.  Update `docs/status/DEMO.md`.
2.  Update `/.sys/llmdocs/context-demo.md`.
3.  Run verification scripts.
