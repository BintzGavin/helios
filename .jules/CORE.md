## 2026-01-21 - Architecture Violation Discovered
**Learning:** `packages/core` contains `animation-helpers.ts` which has hardcoded DOM selectors (`.animated-box`) and global window pollution. This violates the "Headless Logic Engine" principle.
**Action:** Plan to remove or refactor this file in a future cycle, after checking dependencies (found dependency in `examples/simple-animation`).

## 2026-01-22 - Missing Test Script
**Learning:** The Protocol instructs to run `npm test -w packages/core`, but `packages/core/package.json` lacks a `test` script, causing failure. Attempting to add it violated "No `package.json` modification" rule.
**Action:** Request a plan to officialize the test script addition or update Protocol instructions.

## 2026-01-22 - README Hallucination on Timeline Control
**Learning:** The README claims Helios controls time via `document.timeline.currentTime = (f / fps) * 1000`. This is technically impossible as `document.timeline` is read-only. The implementation correctly uses `element.animate()` and sets `animation.currentTime`.
**Action:** Do not attempt to implement the README's technical claim literally. The current `WAAPI` integration is the correct "Reality". Future documentation updates should correct this.

## 2026-01-22 - Missing Parametric State
**Learning:** The README explicitly states the "Headless Logic Engine" manages `inputProps`, but this property is completely absent from the `HeliosState` and `Helios` class in reality.
**Action:** Created plan `2026-01-22-CORE-InputProps.md` to implement this missing state management feature, unlocking parametric compositions.

## 2026-01-23 - Unexecuted Plans in Queue
**Learning:** Found `2026-01-22-CORE-InputProps.md` in `.sys/plans` but code was not implemented. This indicates the Execution Agent loop hasn't run or completed for that task.
**Action:** Always check `.sys/plans` and compare with `src` code to avoid creating duplicate plans. Assumed the previous plan is valid and planned the next dependent/independent task (`PlaybackRate`).

## 2026-01-23 - Private Interface Visibility
**Learning:** `HeliosOptions` is defined but not exported, preventing consumers from using the type. This is a common pattern in this codebase (internal types not exposed).
**Action:** Explicitly included "Export HeliosOptions" in the `PlaybackRate` plan to fix this DX issue.

## 2026-01-24 - Critical Timing Bug Discovered
**Learning:** The `tick` method was blindly incrementing `currentFrame + 1` on every `requestAnimationFrame` callback. This ties playback speed to the user's monitor refresh rate (e.g., 60Hz vs 144Hz) rather than the configured `fps`.
**Action:** Planned `2026-01-24-CORE-PlaybackRate.md` to switch to a Delta-Time based ticking system (`performance.now()`) to ensure consistent playback speed across devices.

## 2026-01-25 - TimeDriver Abstraction Needed
**Learning:** The `Helios` class hardcodes `requestAnimationFrame` and `performance.now()`. This couples the core logic to the browser environment and makes testing time-dependent logic brittle. The README Roadmap explicitly calls for a `TimeDriver` abstraction to decouple this.
**Action:** Prioritize "Architecture Hardening: TimeDriver" in future planning cycles to improve testability and portability (e.g., for Node.js rendering).
