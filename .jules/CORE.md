## 2026-01-21 - Architecture Violation Discovered
**Learning:** `packages/core` contains `animation-helpers.ts` which has hardcoded DOM selectors (`.animated-box`) and global window pollution. This violates the "Headless Logic Engine" principle.
**Action:** Plan to remove or refactor this file in a future cycle, after checking dependencies (found dependency in `examples/simple-animation`).
