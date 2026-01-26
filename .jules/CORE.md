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

## 2026-01-25 - Duplicate Concept Disambiguation
**Learning:** `packages/renderer` defines a `TimeDriver` interface for Playwright automation. The `packages/core` TimeDriver (for internal engine logic) must be distinct.
**Action:** Ensure naming or documentation clarifies the distinction. The Core driver drives the *internal* state/WAAPI, while the Renderer driver drives the *browser* time.

## 1.7.0 - Sandbox Environment Dependencies
**Learning:** The sandbox environment may start without `node_modules`. Running `npm test` immediately can fail with confusing errors like `sh: 1: vitest: not found`.
**Action:** Always check for `node_modules` and run `npm install` if missing before running tests or build scripts.

## 1.7.0 - Plan Ambiguity vs Spec
**Learning:** The plan title ("Sequencing Primitives") and context implied `series` logic, but the specification only defined `sequence`.
**Action:** Followed the explicit specification for `sequence`. Documented the omission of `series` to avoid scope creep or hallucination.

## 2026-02-22 - Audio Synchronization Gap
**Learning:** `WaapiDriver` only handles CSS/WAAPI, leaving `<audio>` elements unsynchronized.
**Action:** Created plan `2026-02-22-CORE-DomDriver.md` to implement a unified `DomDriver` that handles both visual animations and media elements.

## 2026-02-22 - Plan Review Confusion
**Learning:** `request_plan_review` should be used to review the *execution steps* of the agent, not the text content of the Spec File being generated.
**Action:** When using `request_plan_review`, focus on "What I will do" (e.g., create file X), rather than "What file X contains".

## 2026-02-24 - Core Type Visibility Gap
**Learning:** Key types `HeliosState` and `Subscriber` are defined but not exported in `packages/core/src/index.ts`. This forces consumers to rely on implicit types or `Parameters<...>` hacks, degrading the Developer Experience (DX) promised by "Pure TypeScript".
**Action:** Created plan `2026-02-24-CORE-ExportTypes.md` to explicitly export these types and rename `Subscriber` to `HeliosSubscriber` to avoid naming conflicts.

## 2026-02-24 - Package Name Mismatch
**Learning:** `README.md` instructs users to install `@helios-engine/core`, but `package.json` names the package `@helios-project/core`. This inconsistency will cause installation failures for users following the docs.
**Action:** Logged this as a documentation/configuration gap. Deferred fixing to avoid breaking cross-package dependencies in this cycle.

## 2026-02-25 - Node.js Runtime Crash
**Learning:** Despite the vision claiming "runs in Node.js", the default `RafTicker` relies on `requestAnimationFrame`, causing `Helios` to crash or be unusable in pure Node environments.
**Action:** Created plan `2026-02-25-CORE-NodeRuntime.md` to implement `TimeoutTicker` and auto-detect the environment to prevent crashes.

## 2026-02-25 - Structured Errors Gap
**Learning:** The README promises "Machine-readable, actionable errors", but the codebase uses generic `Error` objects. This hinders the "Agent Experience" by making diagnosis harder.
**Action:** Created plan `2026-02-25-CORE-StructuredErrors.md` to implement `HeliosError` and `HeliosErrorCode`.
