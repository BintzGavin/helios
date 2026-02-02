# CORE Progress Log

## CORE v5.2.0
- ✅ Completed: Expose Audio Fades - Updated `AudioTrackMetadata` to include `fadeInDuration` and `fadeOutDuration`, and updated `DomDriver` to automatically discover these values from `data-helios-fade-in` and `data-helios-fade-out` attributes.

## CORE v5.1.1
- ✅ Completed: Fix Virtual Time Synchronization - Enhanced `bindToDocumentTimeline` to robustly handle reactive binding failures (falling back to manual polling) and updated `waitUntilStable` to block until virtual time is fully synchronized, fixing race conditions in frame-by-frame rendering.

## CORE v5.1.0
- ✅ Completed: Implement WebVTT Support - Implemented `parseWebVTT` and auto-detecting `parseCaptions` in `captions.ts`, enabling native .vtt file support.

## CORE v5.0.1
- ✅ Completed: Decouple TimeDriver from DOM - Updated `TimeDriver` and `Helios` to accept `unknown` scope, enabling Web Worker support, and synchronized version.

## CORE v5.0.0
- ✅ Completed: Implement Audio Track Metadata - Updated `availableAudioTracks` signal to return `AudioTrackMetadata[]` instead of `string[]` (Breaking Change), including `startTime` and `duration` discovery.

## CORE v4.1.0
- ✅ Completed: Implement Marker Metadata - Updated `Marker` interface to include optional `metadata` and make `label` optional.

## CORE v4.0.0
- ✅ Completed: Remove WaapiDriver - Removed deprecated `WaapiDriver` and bumped version to 4.0.0 (Breaking Change). Also fixed TypeScript build errors in tests ensuring compatibility with `Helios<T>` generics.

## CORE v3.9.2
- ✅ Completed: Verify Subscription Timing - Added `packages/core/src/subscription-timing.test.ts` to verify that `helios.subscribe` fires synchronously after `seek()` and virtual time updates, confirming CORE behavior is correct for RENDERER synchronization.
- ✅ Completed: Synchronize Version - Updated `package.json` and `index.ts` to 3.9.2 to match status file and fix workspace version mismatch.

## CORE v3.9.1
- ✅ Completed: Expose Version and Verify Init Sync - Exported `VERSION` constant and verified robust `bindToDocumentTimeline` initialization with pre-existing virtual time.

## CORE v3.9.0
- ✅ Completed: Fix Signal Glitches and Runtime Safety - Optimized `EffectImpl` to avoid redundant executions (diamond problem) and guarded `Helios.bindToDocumentTimeline` for Node.js compatibility.

## CORE v3.8.0
- ✅ Completed: Implement Audio Track Discovery - Implemented `availableAudioTracks` signal in `Helios` and updated `DomDriver` to discover elements with `data-helios-track-id`.

## CORE v3.7.0
- ✅ Completed: Implement DomDriver Audio Looping - Updated `DomDriver` to respect the `loop` attribute on media elements, wrapping time calculations to support infinite loops.

## CORE v3.6.0
- ✅ Completed: Refactor Helios - Extracted Helios class to dedicated Helios.ts file and cleaned up index.ts exports.
- ✅ Completed: Implement Audio Fading - Added support for `data-helios-fade-in` and `data-helios-fade-out` in `DomDriver` to enable linear audio fading.

## CORE v3.5.1
- ✅ Completed: Implement Reactive Virtual Time - Replaced polling with reactive setter for `__HELIOS_VIRTUAL_TIME__` in `bindToDocumentTimeline` to ensure reliable headless rendering sync.

## CORE v3.5.0
- ✅ Completed: Implement Timeline Sync - Added `Helios.bindTo(master)` and `Helios.unbind()` for synchronizing multiple Helios instances.

## CORE v3.4.0
- ✅ Completed: Implement Audio Tracks - Added support for audio tracks allowing independent volume/mute control for groups of elements using `data-helios-track-id`.
- ✅ Completed: Update Skills and Version - Synced package.json version to 3.4.0 and updated SKILL.md with Audio Track API and TypedArray schema types.

## CORE v3.3.1
- ✅ Completed: Update Skill Docs - Updated .agents/skills/helios/core/SKILL.md to match v3.3.0 API (DiagnosticReport, Sequencing Helpers).

## CORE v3.3.0
- ✅ Completed: Enable Testing & Sync Version - Added vitest to devDependencies, verified tests pass, and updated dependent packages (renderer, player) to use core version 3.3.0.
- ✅ Completed: Decoder Diagnostics - Added `videoDecoders` (h264, vp8, vp9, av1) and `audioDecoders` (aac, opus) checks to `Helios.diagnose()` and `DiagnosticReport` using WebCodecs API.

## CORE v3.2.0
- ✅ Completed: Implement AI System Prompt Generator - Added `createSystemPrompt` and `HELIOS_BASE_PROMPT` to programmatically generate context-aware system prompts for AI agents.

## CORE v3.1.0
- ✅ Completed: Synchronize Version - Synced package.json version to 3.1.0 to match documentation and updated player/renderer dependencies.
- ✅ Completed: Enhance Schema UI Constraints - Added `pattern`, `accept`, and `group` to `PropDefinition` and implemented validation logic for regex and file extensions.

## CORE v3.0.0
- ✅ Completed: Expose Duration/FPS Signals - Changed `duration` and `fps` to return `ReadonlySignal<number>` for reactive updates (Breaking Change).

## CORE v2.20.0
- ✅ Completed: Audio Diagnostics - Added audioCodecs (aac, opus) detection to Helios.diagnose() and DiagnosticReport.

## CORE v2.19.1
- ✅ Completed: Update Documentation - Added usage examples for `stagger` and `shift` to README.

## CORE v2.19.0
- ✅ Completed: Implement Sequencing Helpers - Added `stagger` and `shift` utilities to `packages/core` to simplify animation timing.

## CORE v2.18.0
- ✅ Completed: Schema Constraints - Added `minItems`, `maxItems`, `minLength`, `maxLength` constraints to `PropDefinition` and implemented validation logic.

## CORE v2.17.1
- ✅ Completed: Fix Leaky Signal Subscriptions - Implemented `untracked` and updated `subscribe` to prevent dependency tracking within callbacks.

## CORE v2.17.0
- ✅ Completed: Implement Typed Arrays - Added support for Typed Arrays (Float32Array, etc.) in HeliosSchema and validateProps.

## CORE v2.16.0
- ✅ Completed: Time-Based Control - Added `currentTime` signal and `seekToTime()` method to `Helios` class for direct time manipulation.

## CORE v2.15.0
- ✅ Completed: Enhance Diagnose - Expanded `Helios.diagnose()` to include WebGL, WebAudio, Color Gamut, and Video Codec support.

## CORE v2.14.0
- ✅ Completed: Implement Missing Asset Types - Added `model`, `json`, and `shader` to supported `PropType` values and validation logic.

## CORE v2.13.0
- ✅ Completed: Validate Schema Defaults - Implemented `validateSchema` to ensure schema defaults match their defined types, adding `INVALID_SCHEMA` error code.

## CORE v2.12.0
- ✅ Completed: Schema Enhancements - Added `step` and `format` properties to `PropDefinition` to support UI generation hints.

## CORE v2.11.0
- ✅ Completed: Recursive Animation & Media Discovery - Implemented robust recursive Shadow DOM discovery in `DomDriver` with dynamic `MutationObserver` support.

## CORE v2.10.0
- ✅ Completed: Version Sync - Synced package.json version to 2.10.0 and updated context documentation.
- ✅ Completed: Implement RenderSession - Added RenderSession class for standardized frame iteration and stability orchestration.
## CORE v2.9.0
- ✅ Completed: Synchronize Version - Updated `package.json` to 2.9.0 and fixed flaky stability test.
- ✅ Completed: Implement Recursive Schema - Updated `PropDefinition` to support `items` and `properties` for nested array/object validation, and refactored `validateProps`.

## CORE v2.8.0
- ✅ Completed: Bind Virtual Time - Updated `bindToDocumentTimeline` to support `__HELIOS_VIRTUAL_TIME__` for precise synchronization in renderer environments.

## CORE v2.7.2
- ✅ Completed: Synchronize Version - Updated version to 2.7.2 to match dependencies in player/renderer, verified tests pass.

## CORE v2.7.2
- ✅ Completed: Verify Stability Registry - Verified implementation of `registerStabilityCheck` and `waitUntilStable`, updated JSDoc, and cleaned up stale plan.

## CORE v2.7.1
- ⚠️ Reverted: Version Mismatch Fix - Reverted version to 2.7.1 to match strict dependencies in player/renderer and unblock build.

## CORE v2.7.1
- ✅ Completed: Rename Audio Test - Renamed `audio.test.ts` to `helios-audio.test.ts` to clarify structure.

## CORE v2.7.0
- ✅ Completed: Implement Stability Registry - Implemented stability registry pattern in `Helios` allowing external consumers to register async checks for `waitUntilStable`.

## CORE v2.6.1
- ✅ Completed: Fix bindToDocumentTimeline Sync - Updated `Helios.bindToDocumentTimeline` to propagate time updates to the active `TimeDriver`, ensuring media synchronization when driven externally.

## CORE v2.6.0
- ✅ Completed: Implement DomDriver Media Attributes - Implemented `data-helios-offset` and `data-helios-seek` support in `DomDriver` for accurate in-browser preview timing.

## CORE v2.5.0
- ✅ Completed: Maintenance and Robustness - Fixed memory leak in Helios constructor, enhanced color schema validation, and synced package version.

## CORE v2.4.0
- ✅ Completed: Implement Spring Duration - Added `calculateSpringDuration` utility and exported `DEFAULT_SPRING_CONFIG` in `packages/core`.

## CORE v2.3.0
- ✅ Completed: Implement Transitions Library - Implemented standard transition and crossfade functions, and corrected README installation instructions.

## CORE v2.2.0
- ✅ Completed: Implement Playback Range - Added `playbackRange` to `HeliosState`, enabling loop and clamp behavior within a specific frame range.

## CORE v2.1.0
- ✅ Completed: ESM Compliance - Converted package to native ESM with "type": "module", "moduleResolution": "node16", and explicit .js extensions.

## CORE v2.0.0
- ✅ Completed: WaitUntilStable Interface - Made `waitUntilStable` required in `TimeDriver` interface and strict in `Helios` to ensure reliable rendering.

## CORE v1.33.0
- ✅ Completed: Implement WaitUntilStable - Implemented `waitUntilStable` in `Helios` and `DomDriver` to ensure deterministic rendering by waiting for fonts, images, and media readiness.

## CORE v1.32.1
- ✅ Completed: Document Dynamic Timing - Verified implementation, added JSDoc, and cleaned up plan artifacts.

## CORE v1.32.0
- ✅ Completed: Implement Schema Asset Types - Added `image`, `video`, `audio`, `font` to `PropType` and validation, enabling asset selection in Studio.

## CORE v1.31.0
- ✅ Completed: Optimize DomDriver - Implemented MutationObserver caching and disposal in DomDriver, reducing DOM queries and improving performance.

## CORE v1.30.0
- ✅ Completed: Implement Loop Support - Implemented loop option, signal, and logic in Helios class, enabling seamless looping playback.

## CORE v1.29.0
- ✅ Completed: Implement Timecode Utilities - Implemented `framesToTimecode`, `timecodeToFrames`, and `framesToTimestamp` utilities.

## CORE v1.28.0
- ✅ Completed: Implement Dynamic Timing - Implemented `setDuration` and `setFps` methods in `Helios` class, allowing runtime updates to composition timing.

## CORE v1.27.0
- ✅ Completed: Expose Captions - Exposed full caption list in `HeliosState` and enabled array input for captions in constructor and `setCaptions`.

## CORE v1.26.2
- ✅ Completed: Restore Context File - Restored missing `/.sys/llmdocs/context-core.md` and verified package integrity.

## CORE v1.26.1
- ✅ Completed: Verify Core Package Integrity - Verified build, tests, and artifacts for `packages/core`.

## CORE v1.26.0
- ✅ Completed: Implement Initial Frame - Added `initialFrame` to `HeliosOptions` and updated constructor to initialize state and sync driver, enabling HMR state preservation.

## CORE v1.25.0
- ✅ Completed: Implement Color Interpolation - Implemented `interpolateColors` and `parseColor` utilities supporting Hex, RGB, and HSL formats.

## CORE v1.24.0
- ✅ Completed: Implement Relative Audio Mixing - Implemented relative volume and mute handling in `DomDriver`, allowing master volume/mute to mix with user-set values instead of overriding them.

## CORE v1.23.0
- ✅ Completed: Implement Resolution Awareness - Added `width`/`height` to state/options, `setSize` method, and `INVALID_RESOLUTION` error.

## CORE v1.22.0
- ✅ Completed: Expand Input Schema Validation - Added `minimum`, `maximum`, and `enum` constraints to `HeliosSchema` and updated `validateProps`.

## CORE v1.21.0
- ✅ Completed: Implement Deterministic Randomness - Added `random` utility with Mulberry32 PRNG and string seeding support.

## CORE v1.20.0
- ✅ Completed: Implement Active Captions - Added `activeCaptions` signal to `Helios`, `setCaptions` method, and `findActiveCues` utility.

## CORE v1.19.0
- ✅ Completed: Implement Audio Volume Control - Added `volume` and `muted` state to `Helios` and updated `DomDriver` to sync with HTMLMediaElements.

## CORE v1.18.0
- ✅ Completed: Implement Input Schema Validation - Added `HeliosSchema` definition, `validateProps` logic, and integrated validation into `Helios` constructor and `setInputProps`.

## CORE v1.17.0
- ✅ Completed: Implement SRT Parser - Implemented `parseSrt` and `stringifySrt` utilities for caption support.

## CORE v1.16.0
- ✅ Completed: Implement Helios Disposal - Added `dispose()` method to `Helios` for proper resource cleanup (tickers, polling loops, subscribers).

## CORE v1.15.0
- ✅ Completed: Implement Structured Errors - Implemented `HeliosError` and `HeliosErrorCode` to provide machine-parseable errors.

## CORE v1.14.0
- ✅ Completed: Enable Node.js Runtime Support - Implemented `TimeoutTicker` and environment detection for Node.js compatibility.

## CORE v1.13.0
- ✅ Completed: Export Types - Exported `HeliosState` and `HeliosSubscriber` types from `packages/core` to improve DX.

## CORE v1.12.0
- ✅ Completed: Implement DomDriver - Implemented `DomDriver` to sync WAAPI and HTMLMediaElements, updated `Helios` to use it by default, and deprecated `WaapiDriver`.

## CORE v1.11.3
- ✅ Completed: Add Documentation - Created comprehensive `README.md` for `packages/core`.

## CORE v1.11.2
- ✅ Completed: Verify Signals and Cleanup Plans - Verified signal integration and cleaned up completed plan files.

## CORE v1.11.1
- ✅ Completed: Refactor Helios Signals - Added JSDoc documentation to public signal properties and verified signal implementation.

## CORE v1.11.0
- ✅ Completed: Implement Easing Functions - Implemented standard easing functions (linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce) and cubic-bezier solver.

## CORE v1.10.0
- ✅ Completed: Refactor Helios to use Signals - Replaced internal state with signals, exposed ReadonlySignal getters, and maintained backward compatibility.

## CORE v1.9.0
- ✅ Completed: Implement Signals - Implemented `signal`, `computed`, and `effect` primitives with memory safety and consistency guarantees.

## CORE v1.8.0
- ✅ Completed: Implement Series Helper - Implemented `series` function for sequential layout of composition elements.

## CORE v1.7.0
- ✅ Completed: Implement Sequencing Primitives - Implemented `sequence` function and interfaces in `packages/core`.

## CORE v1.6.0
- ✅ Completed: Implement TimeDriver Abstraction - Refactored `Helios` to use `TimeDriver` strategy, extracted `WaapiDriver`, and added support for custom drivers.

## CORE v1.5.0
- ✅ Completed: Implement Spring Animation Helper - Implemented physics-based `spring` function with underdamped, critically damped, and overdamped support.

## CORE v1.3.0
- ✅ Completed: Implement Animation Helpers - Implemented `interpolate` function with easing and extrapolation support.

## CORE v1.2.0
- ✅ Completed: Implement Variable Playback Rate - Added `playbackRate` control, time-based ticking logic, and exported `HeliosOptions`.

## CORE v1.1.0
- ✅ Completed: Implement InputProps - Added `inputProps` to state/options and `setInputProps` method to Helios class.

## [2026-01-22] CORE
- ✅ Completed: Enable Core Testing And Robustness - Added `test` script, constructor validation, and unit tests.

## [2026-01-21] CORE
- ✅ Completed: Implement Helios.diagnose() - Implemented static diagnose method and DiagnosticReport interface

## [2026-01-15] CORE
- Updated `Helios` class in `packages/core` to support `bindToDocumentTimeline()`. Added unit tests.

### CORE v1.33.0
- ✅ Completed: Implement WaitUntilStable - Implemented `waitUntilStable` in `Helios` and `DomDriver` to ensure deterministic rendering by waiting for fonts, images, and media readiness.
