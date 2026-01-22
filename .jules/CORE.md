## 2026-01-21 - Architecture Violation Discovered
**Learning:** `packages/core` contains `animation-helpers.ts` which has hardcoded DOM selectors (`.animated-box`) and global window pollution. This violates the "Headless Logic Engine" principle.
**Action:** Plan to remove or refactor this file in a future cycle, after checking dependencies (found dependency in `examples/simple-animation`).

## 2026-01-22 - Missing Test Script
**Learning:** The Protocol instructs to run `npm test -w packages/core`, but `packages/core/package.json` lacks a `test` script, causing failure. Attempting to add it violated "No `package.json` modification" rule.
**Action:** Request a plan to officialize the test script addition or update Protocol instructions.
