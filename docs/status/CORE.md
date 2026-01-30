# Status: CORE

**Version**: 2.12.0

- **Status**: Active
- **Current Focus**: Maintenance, Optimization, and Stability
- **Last Updated**: 2026-04-18

[v2.12.0] ✅ Completed: Schema Enhancements - Added `step` and `format` properties to `PropDefinition` to support UI generation hints.
[v2.11.0] ✅ Completed: Recursive Animation & Media Discovery - Implemented robust recursive Shadow DOM discovery in `DomDriver` with dynamic `MutationObserver` support.
[v2.10.0] ✅ Completed: Version Sync - Synced package.json version to 2.10.0 and updated context documentation.
[v2.9.0] ✅ Completed: Synchronize Version - Updated `package.json` to 2.9.0 and fixed flaky stability test.
[v2.9.0] ✅ Completed: Implement Recursive Schema - Updated `PropDefinition` to support `items` and `properties` for nested array/object validation, and refactored `validateProps`.
[v2.8.0] ✅ Completed: Bind Virtual Time - Updated `bindToDocumentTimeline` to support `__HELIOS_VIRTUAL_TIME__` for precise synchronization in renderer environments.
[v2.7.2] ✅ Completed: Synchronize Version - Updated version to 2.7.2 to match dependencies in player/renderer, verified tests pass.
[v2.7.2] ✅ Completed: Verify Stability Registry - Verified implementation of `registerStabilityCheck` and `waitUntilStable`, updated JSDoc, and cleaned up stale plan.
[v2.7.1] ✅ Completed: Rename Audio Test - Renamed `audio.test.ts` to `helios-audio.test.ts` to clarify structure.
[v2.7.0] ✅ Completed: Implement Stability Registry - Implemented stability registry pattern in `Helios` allowing external consumers to register async checks for `waitUntilStable`.
[v2.6.1] ✅ Completed: Fix bindToDocumentTimeline Sync - Updated `Helios.bindToDocumentTimeline` to propagate time updates to the active `TimeDriver`, ensuring media synchronization when driven externally.
[v2.6.0] ✅ Completed: Implement DomDriver Media Attributes - Implemented `data-helios-offset` and `data-helios-seek` support in `DomDriver` for accurate in-browser preview timing.
[v2.5.0] ✅ Completed: Maintenance and Robustness - Fixed memory leak in Helios constructor, enhanced color schema validation, and synced package version.
[v2.4.0] ✅ Completed: Implement Spring Duration - Added `calculateSpringDuration` utility and exported `DEFAULT_SPRING_CONFIG` in `packages/core`.
[v2.3.0] ✅ Completed: Implement Transitions Library - Implemented standard transition and crossfade functions, and corrected README installation instructions.
[v2.2.0] ✅ Completed: Implement Playback Range - Added `playbackRange` to `HeliosState`, enabling loop and clamp behavior within a specific frame range.
[v2.1.0] ✅ Completed: ESM Compliance - Converted package to native ESM with "type": "module", "moduleResolution": "node16", and explicit .js extensions.
[v2.0.0] ✅ Completed: WaitUntilStable Interface - Made `waitUntilStable` required in `TimeDriver` interface and strict in `Helios` to ensure reliable rendering.
[v1.33.0] ✅ Completed: Implement WaitUntilStable - Implemented `waitUntilStable` in `Helios` and `DomDriver` to ensure deterministic rendering by waiting for fonts, images, and media readiness.
[v1.32.1] ✅ Completed: Document Dynamic Timing - Verified implementation, added JSDoc, and cleaned up plan artifacts.
[v1.32.0] ✅ Completed: Implement Schema Asset Types - Added `image`, `video`, `audio`, `font` to `PropType` and validation, enabling asset selection in Studio.
[v1.31.0] ✅ Completed: Optimize DomDriver - Implemented MutationObserver caching and disposal in DomDriver, reducing DOM queries and improving performance.
[v1.30.0] ✅ Completed: Implement Loop Support - Implemented loop option, signal, and logic in Helios class, enabling seamless looping playback.
[v1.29.0] ✅ Completed: Implement Timecode Utilities - Implemented `framesToTimecode`, `timecodeToFrames`, and `framesToTimestamp` utilities.
[v1.28.0] ✅ Completed: Implement Dynamic Timing - Implemented `setDuration` and `setFps` methods in `Helios` class, allowing runtime updates to composition timing.
[v1.27.0] ✅ Completed: Expose Captions - Exposed full caption list in `HeliosState` and enabled array input for captions in constructor and `setCaptions`.
[v1.26.2] ✅ Completed: Restore Context File - Restored missing `/.sys/llmdocs/context-core.md` and verified package integrity.
[v1.26.1] ✅ Completed: Verify Core Package Integrity - Verified build, tests, and artifacts for `packages/core`.
[v1.26.0] ✅ Completed: Implement Initial Frame - Added `initialFrame` to `HeliosOptions` and updated constructor to initialize state and sync driver, enabling HMR state preservation.
[v1.25.0] ✅ Completed: Implement Color Interpolation - Implemented `interpolateColors` and `parseColor` utilities supporting Hex, RGB, and HSL formats.
[v1.24.0] ✅ Completed: Implement Relative Audio Mixing - Implemented relative volume and mute handling in `DomDriver`, allowing master volume/mute to mix with user-set values instead of overriding them.
[v1.23.0] ✅ Completed: Implement Resolution Awareness - Added `width`/`height` to state/options, `setSize` method, and `INVALID_RESOLUTION` error.
[v1.22.0] ✅ Completed: Expand Input Schema Validation - Added `minimum`, `maximum`, and `enum` constraints to `HeliosSchema` and updated `validateProps`.
[v1.21.0] ✅ Completed: Implement Deterministic Randomness - Added `random` utility with Mulberry32 PRNG and string seeding support.
[v1.20.0] ✅ Completed: Implement Active Captions - Added `activeCaptions` signal to `Helios`, `setCaptions` method, and `findActiveCues` utility.
[v1.19.0] ✅ Completed: Implement Audio Volume Control - Added `volume` and `muted` state to `Helios` and updated `DomDriver` to sync with HTMLMediaElements.
[2026-01-21] ✅ Completed: Implement Helios.diagnose() - Implemented static diagnose method and DiagnosticReport interface
[2026-01-22] 🔍 Discovery: Verified removal of `animation-helpers.ts` and identified missing `test` script in `packages/core`.
[2026-01-22] ✅ Completed: Enable Core Testing And Robustness - Added `test` script, constructor validation, and unit tests.
[v1.1.0] ✅ Completed: Implement InputProps - Added `inputProps` to state/options and `setInputProps` method to Helios class.
[v1.2.0] ✅ Completed: Implement Variable Playback Rate - Added `playbackRate` control, time-based ticking logic, and exported `HeliosOptions`.
[v1.3.0] ✅ Completed: Implement Animation Helpers - Implemented `interpolate` function with easing and extrapolation support.
[v1.5.0] ✅ Completed: Implement Spring Animation Helper - Implemented physics-based `spring` function with underdamped, critically damped, and overdamped support.
[v1.6.0] ✅ Completed: Implement TimeDriver Abstraction - Refactored `Helios` to use `TimeDriver` strategy, extracted `WaapiDriver`, and added support for custom drivers.
[v1.7.0] ✅ Completed: Implement Sequencing Primitives - Implemented `sequence` function and interfaces in `packages/core`.
[v1.8.0] ✅ Completed: Implement Series Helper - Implemented `series` function for sequential layout of composition elements.
[v1.9.0] ✅ Completed: Implement Signals - Implemented `signal`, `computed`, and `effect` primitives with memory safety and consistency guarantees.
[v10.0] ✅ Completed: Refactor Helios to use Signals - Replaced internal state with signals, exposed ReadonlySignal getters, and maintained backward compatibility.
[v1.11.0] ✅ Completed: Implement Easing Functions - Implemented standard easing functions (linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce) and cubic-bezier solver.
[v1.11.1] ✅ Completed: Refactor Helios Signals - Added JSDoc documentation to public signal properties and verified signal implementation.
[v1.11.2] ✅ Completed: Verify Signals and Cleanup Plans - Verified signal integration and cleaned up completed plan files.
[v1.11.3] ✅ Completed: Add Documentation - Created comprehensive `README.md` for `packages/core`.
[v1.12.0] ✅ Completed: Implement DomDriver - Implemented `DomDriver` to sync WAAPI and HTMLMediaElements, updated `Helios` to use it by default, and deprecated `WaapiDriver`.
[v1.13.0] ✅ Completed: Export Types - Exported `HeliosState` and `HeliosSubscriber` types from `packages/core` to improve DX.
[v1.14.0] ✅ Completed: Enable Node.js Runtime Support - Implemented `TimeoutTicker` and environment detection for Node.js compatibility.
[v1.15.0] ✅ Completed: Implement Structured Errors - Implemented `HeliosError` and `HeliosErrorCode` to provide machine-parseable errors.
[v1.16.0] ✅ Completed: Implement Helios Disposal - Added `dispose()` method to `Helios` for proper resource cleanup (tickers, polling loops, subscribers).
[v1.17.0] ✅ Completed: Implement SRT Parser - Implemented `parseSrt` and `stringifySrt` utilities for caption support.
[v1.18.0] ✅ Completed: Implement Input Schema Validation - Added `HeliosSchema` definition, `validateProps` logic, and integrated validation into `Helios` constructor and `setInputProps`.

**Next Steps**:
- Maintain version alignment with Player and Renderer.
- Note: Added plan `/.sys/plans/2026-01-29-CORE-Bind-Virtual-Time.md` to ensure `bindToDocumentTimeline` prefers `__HELIOS_VIRTUAL_TIME__` when present (DOM render sync).

[v2.10.0] ✅ Completed: Implement RenderSession - Added RenderSession class for standardized frame iteration and stability orchestration.
