**Version**: 1.13.0

# Renderer Agent Status

## Progress Log
- [2024-05-21] ✅ Completed: Refactor FFmpeg Arguments to Strategy - Moved FFmpeg input argument generation to RenderStrategy interface, allowing custom input formats (like WebCodecs streams) in the future.
- [2024-05-24] ✅ Completed: Enable Stateful Render Strategies - Added `prepare(page)` lifecycle method to `RenderStrategy` to support initialization (like WebCodecs) before rendering.
- [2026-02-18] ✅ Completed: Refactor FFmpeg Config - Fully decoupled FFmpeg argument generation by moving it to `RenderStrategy.getFFmpegArgs` and extracted `RendererOptions` to `types.ts` to prevent circular dependencies.
- [1.0.1] ✅ Completed: Implement DomStrategy Preloading - Implemented `DomStrategy.prepare()` to wait for fonts and images to load before rendering, preventing visual artifacts.
- [1.0.2] ✅ Completed: Fix DomStrategy Preloading Implementation - Added missing build config and render script, enabling proper verification of the preloading strategy.
- [1.1.0] ✅ Completed: Implement Progress and Cancellation - Added `RenderJobOptions` with `onProgress` callback and `AbortSignal` support to `Renderer.render`, enabling UIs to track progress and cancel long-running jobs.
- [1.1.1] ✅ Completed: Refactor TimeDriver - Decoupled time advancement logic from RenderStrategy into a dedicated TimeDriver interface, preparing for CDP integration.
- [1.2.0] ✅ Completed: Enable Playwright Trace Viewer - Added `tracePath` option to `RenderJobOptions`, enabling generation of Playwright trace files for debugging rendering sessions.
- [1.3.0] ✅ Completed: Implement CdpTimeDriver - Implemented `CdpTimeDriver` using Chrome DevTools Protocol to virtually advance time, ensuring deterministic rendering for complex animations.
- [1.4.0] ✅ Completed: Basic Audio Support - Added `audioFilePath` to `RendererOptions` and updated strategies to include audio in the FFmpeg output mix.
- [1.4.1] ✅ Completed: Fix DOM Time Driver - Implemented conditional usage of `SeekTimeDriver` for `dom` mode rendering, resolving compatibility issues with `CdpTimeDriver` and `page.screenshot`.
- [1.5.0] ✅ Completed: Implement Range Rendering - Added `startFrame` to `RendererOptions`, enabling rendering of partial animation ranges (distributed rendering support).

## 2026-02-19 - Planner vs Executor Boundary
**Learning:** I mistakenly executed code changes (modifying source, creating scripts) instead of just creating a plan file. The Planner role is strictly for architecture and spec generation.
**Action:** Never modify `packages/` source code. Only create `.md` files in `.sys/plans/` and update `docs/` or `.jules/` if needed.

## 2026-02-19 - Spec File Constraints
**Learning:** Plan files must use strict pseudo-code and architecture descriptions, avoiding actual syntax-highlighted code snippets.
**Action:** Use "CALCULATE", "SET", "CALL" style pseudo-code in Implementation Spec sections.

## 2026-02-19 - Test Discovery
**Learning:** `packages/renderer` lacks a `README.md` and explicit `test` script in `package.json`. Tests are located in `packages/renderer/tests/` and run via `ts-node`.
**Action:** When planning tests for Renderer, explicitly specify `npx ts-node packages/renderer/tests/[test-file].ts` instead of `npm test`.

## [1.5.2] - Vision Reality Gap (Diagnostics)
**Learning:** The README explicitly claims features ("includes `helios.diagnose()`") that are not implemented in the codebase.
**Action:** When identifying gaps, check "Current Status" claims in README against the code, not just "Planned Features".

## [1.5.3] - Incomplete Asset Preloading
**Learning:** `DomStrategy` implementation of "Asset Preloading" was incomplete (missed CSS background images), contradicting the Vision's promise of preventing artifacts.
**Action:** When auditing "Completed" features, verify they cover all standard web use cases (like CSS backgrounds), not just the happy path (`<img>` tags).

## [1.6.0] - Incomplete Media Preloading
**Learning:** `DomStrategy` preloading logic missed `<video>` and `<audio>` elements, which can cause blank frames.
**Action:** Always consider all media types (`img`, `video`, `audio`, `iframe`) when implementing asset preloading strategies.

## [2026-02-19] - DomStrategy Vision Deviation
**Learning:** `DomStrategy` uses `SeekTimeDriver` (WAAPI) instead of `CdpTimeDriver` (CDP) as strictly required by the Vision ("Production Rendering... Uses CDP"). This was a workaround for `page.screenshot` compatibility.
**Action:** Future plans must address this technical debt by fixing the underlying compatibility issue rather than accepting the deviation permanently.

## [1.13.0] - CdpTimeDriver and Playwright Screenshot Incompatibility
**Learning:** `Emulation.setVirtualTimePolicy` (CDP) with `policy: 'pause'` effectively freezes the browser's compositor loop, causing Playwright's `page.screenshot` to hang indefinitely as it waits for a frame. Attempts to use `CDP.Page.captureScreenshot` also failed (timed out), suggesting the pause is deep.
**Action:** Do not attempt to unify `TimeDriver` for `DomStrategy` until a solution for screenshotting under virtual time is found (e.g. unpausing briefly or using a different capture method). `SeekTimeDriver` remains the required fallback for DOM mode.

## [2026-03-03] - Plan Review Protocol
**Learning:** `request_plan_review` validates the *execution plan* (steps to take), not the *content* of the spec file being created.
**Action:** When calling `request_plan_review`, provide the steps (1. Create spec file, 2. Pre-commit), not the spec file content itself.

## [2026-03-05] - SeekTimeDriver Non-Determinism
**Learning:** `SeekTimeDriver` (used for DOM rendering) relies on WAAPI and does not mock `performance.now()` or `Date.now()`. This exposes wall-clock time drift to JavaScript-driven animations (e.g. `requestAnimationFrame` loops), violating the "Deterministic Rendering" vision.
**Action:** Prioritize polyfilling these globals in `SeekTimeDriver` to ensure consistent rendering for non-CSS animations.

## [2026-03-09] - CanvasStrategy WebCodecs Limitation
**Learning:** `CanvasStrategy` heavily relies on the IVF container format, which restricts WebCodecs usage to VP8/VP9/AV1. This prevents the usage of H.264 (AVC) which is the most common hardware-accelerated codec, potentially causing double-encoding (VP8 -> H.264) in the FFmpeg step.
**Action:** Future optimization should support raw H.264 (Annex B) output from `CanvasStrategy` to enable direct stream copy to FFmpeg for MP4 outputs.

## [2026-03-09] - FFmpeg Logic Duplication
**Learning:** `CanvasStrategy` and `DomStrategy` contain nearly identical logic for generating FFmpeg arguments (especially for audio inputs and output flags). This duplication violates DRY and increases the risk of inconsistent behavior (e.g. one strategy supporting a feature while the other doesn't).
**Action:** Centralize FFmpeg argument generation into a `FFmpegBuilder` or similar utility to ensure consistency and maintainability.

## [2026-03-10] - SeekTimeDriver Initialization Timing
**Learning:** `page.addInitScript` must be called *before* `page.goto` to affect the page load. `SeekTimeDriver.prepare` uses it, but `Renderer.ts` calls `prepare` after `goto`, rendering the polyfill ineffective for the initial state.
**Action:** Split `TimeDriver` initialization into `init` (pre-load) and `prepare` (post-load) to handle script injection correctly.
