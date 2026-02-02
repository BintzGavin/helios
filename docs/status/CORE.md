# Status: CORE

**Version**: 5.4.0

- **Status**: Active
- **Current Focus**: Maintenance, Optimization, and Stability
- **Last Updated**: 2026-08-01

[v5.4.0] ✅ Completed: Headless Audio Tracks - Added `availableAudioTracks` option to `HeliosOptions` and `setAvailableAudioTracks` method, enabling manual injection of audio metadata for headless environments.
[v5.3.0] ✅ Completed: Expose Audio Source - Updated `AudioTrackMetadata` to include `src` property, populated by `DomDriver` from `currentSrc` or `src` attribute, enabling access to audio source URLs in metadata.
[v5.2.1] ✅ Completed: Fix Subscription Timing - Forced notification in `bindToDocumentTimeline` when virtual time is set to the same frame, ensuring external drivers (e.g. GSAP) remain synchronized during precise seeking.
[v5.2.0] ✅ Completed: Expose Audio Fades - Updated `AudioTrackMetadata` to include `fadeInDuration` and `fadeOutDuration`, and updated `DomDriver` to automatically discover these values from `data-helios-fade-in` and `data-helios-fade-out` attributes.
[v5.1.2] ✅ Completed: Fix GSAP Synchronization - Forced subscriber notification in `bindToDocumentTimeline` when virtual time is present to ensure initial state synchronization with external libraries like GSAP, resolving black frames in render output.
[v5.1.1] ✅ Completed: Fix Virtual Time Synchronization - Enhanced `bindToDocumentTimeline` to robustly handle reactive binding failures (falling back to manual polling) and updated `waitUntilStable` to block until virtual time is fully synchronized, fixing race conditions in frame-by-frame rendering.
[v5.1.0] ✅ Completed: Implement WebVTT Support - Implemented `parseWebVTT` and auto-detecting `parseCaptions` in `captions.ts`, enabling native .vtt file support.
[v5.0.1] ✅ Completed: Decouple TimeDriver from DOM - Updated `TimeDriver` and `Helios` to accept `unknown` scope, enabling Web Worker support, and synchronized version.
[v5.0.0] ✅ Completed: Implement Audio Track Metadata - Updated `availableAudioTracks` signal to return `AudioTrackMetadata[]` instead of `string[]` (Breaking Change), including `startTime` and `duration` discovery.
[v4.1.0] ✅ Completed: Implement Marker Metadata - Updated `Marker` interface to include optional `metadata` and make `label` optional.
[v4.0.0] ✅ Completed: Remove WaapiDriver - Removed deprecated `WaapiDriver` and bumped version to 4.0.0 (Breaking Change). Also fixed TypeScript build errors in tests ensuring compatibility with `Helios<T>` generics.
[v3.9.2] ✅ Completed: Verify Subscription Timing - Added `packages/core/src/subscription-timing.test.ts` to verify that `helios.subscribe` fires synchronously after `seek()` and virtual time updates, confirming CORE behavior is correct for RENDERER synchronization.
[v3.9.2] ✅ Completed: Synchronize Version - Updated `package.json` and `index.ts` to 3.9.2 to match status file and fix workspace version mismatch.
[v3.9.1] ✅ Completed: Expose Version and Verify Init Sync - Exported `VERSION` constant and verified robust `bindToDocumentTimeline` initialization with pre-existing virtual time.
[v3.9.0] ✅ Completed: Fix Signal Glitches and Runtime Safety - Optimized `EffectImpl` to avoid redundant executions (diamond problem) and guarded `Helios.bindToDocumentTimeline` for Node.js compatibility.
[v3.8.0] ✅ Completed: Implement Audio Track Discovery - Implemented `availableAudioTracks` signal in `Helios` and updated `DomDriver` to discover elements with `data-helios-track-id`.
[v3.7.0] ✅ Completed: Implement DomDriver Audio Looping - Updated `DomDriver` to respect the `loop` attribute on media elements, wrapping time calculations to support infinite loops.
[v3.6.0] ✅ Completed: Refactor Helios - Extracted Helios class to dedicated Helios.ts file and cleaned up index.ts exports.
[v3.6.0] ✅ Completed: Implement Audio Fading - Added support for `data-helios-fade-in` and `data-helios-fade-out` in `DomDriver` to enable linear audio fading.
[v3.5.1] ✅ Completed: Implement Reactive Virtual Time - Replaced polling with reactive setter for `__HELIOS_VIRTUAL_TIME__` in `bindToDocumentTimeline` to ensure reliable headless rendering sync.
[v3.5.0] ✅ Completed: Implement Timeline Sync - Added `Helios.bindTo(master)` and `Helios.unbind()` for synchronizing multiple Helios instances.
[v3.4.0] ✅ Completed: Implement Audio Tracks - Added track-based volume/mute control via data-helios-track-id and helios.setAudioTrackVolume/Muted.
[v3.3.1] ✅ Completed: Update Skill Docs - Updated .agents/skills/helios/core/SKILL.md to match v3.3.0 API (DiagnosticReport, Sequencing Helpers).
[v3.3.0] ✅ Completed: Enable Testing & Sync Version - Added vitest to devDependencies, verified tests pass, and updated dependent packages (renderer, player) to use core version 3.3.0.
[v3.3.0] ✅ Completed: Decoder Diagnostics - Added `videoDecoders` (h264, vp8, vp9, av1) and `audioDecoders` (aac, opus) checks to `Helios.diagnose()` and `DiagnosticReport` using WebCodecs API.
[v3.2.0] ✅ Completed: Implement AI System Prompt Generator - Added `createSystemPrompt` and `HELIOS_BASE_PROMPT` to programmatically generate context-aware system prompts for AI agents.
[v3.1.0] ✅ Completed: Synchronize Version - Synced package.json version to 3.1.0 to match documentation and updated player/renderer dependencies.
[v3.1.0] ✅ Completed: Enhance Schema UI Constraints - Added `pattern`, `accept`, and `group` to `PropDefinition` and implemented validation logic for regex and file extensions.
[v3.0.0] ✅ Completed: Expose Duration/FPS Signals - Changed `duration` and `fps` to return `ReadonlySignal<number>` for reactive updates (Breaking Change).
[v2.20.0] ✅ Completed: Audio Diagnostics - Added audioCodecs (aac, opus) detection to Helios.diagnose() and DiagnosticReport.
[v2.19.1] ✅ Completed: Update Documentation - Added usage examples for `stagger` and `shift` to README.
[v2.19.0] ✅ Completed: Implement Sequencing Helpers - Added `stagger` and `shift` utilities to `packages/core` to simplify animation timing.
[v2.18.0] ✅ Completed: Schema Constraints - Added `minItems`, `maxItems`, `minLength`, `maxLength` constraints to `PropDefinition` and implemented validation logic.
[v2.17.1] ✅ Completed: Fix Leaky Signal Subscriptions - Implemented `untracked` and updated `subscribe` to prevent dependency tracking within callbacks.
[v2.17.0] ✅ Completed: Implement Typed Arrays - Added support for Typed Arrays (Float32Array, etc.) in HeliosSchema and validateProps.
[v2.16.0] ✅ Completed: Time-Based Control - Added `currentTime` signal and `seekToTime()` method to `Helios` class for direct time manipulation.
[v2.15.0] ✅ Completed: Enhance Diagnose - Expanded `Helios.diagnose()` to include WebGL, WebAudio, Color Gamut, and Video Codec support.
[v2.14.0] ✅ Completed: Implement Missing Asset Types - Added `model`, `json`, and `shader` to supported `PropType` values and validation logic.
[v2.13.0] ✅ Completed: Validate Schema Defaults - Implemented `validateSchema` to ensure schema defaults match their defined types, adding `INVALID_SCHEMA` error code.
[v2.12.0] ✅ Completed: Schema Enhancements - Added `step` and `format` properties to `PropDefinition` to support UI generation hints.
[v2.11.0] ✅ Completed: Recursive Animation & Media Discovery - Implemented robust recursive Shadow DOM discovery in `DomDriver` with dynamic `MutationObserver` support.
[v2.10.0] ✅ Completed: Version Sync - Synced package.json version to 2.10.0 and updated context documentation.
[v2.9.0] ✅ Completed: Synchronize Version - Updated `package.json` to 2.9.0 and fixed flaky stability test.
[v2.9.0] ✅ Completed: Implement Recursive Schema - Updated `PropDefinition` to support `items` and `properties` for nested array/object validation, and refactored `validateProps`.
[v2.8.0] ✅ Completed: Bind Virtual Time - Updated `bindToDocumentTimeline` to support `__HELIOS_VIRTUAL_TIME__` for precise synchronization in renderer environments.
[v2.7.2] ✅ Completed: Synchronize Version - Updated version to 2.7.2 to match dependencies in player/renderer, verified tests pass.
[v2.7.2] ✅ Completed: Verify Stability Registry - Verified implementation of `registerStabilityCheck` and `waitUntilStable`, updated JSDoc, and cleaned up plan.
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
[v1.11.2] ✅ Completed: Verify Signals and Cleanup Plans - Verified signal integration and cleaned up plan files.
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
- **⚠️ COORDINATION**: RENDERER agent investigating GSAP timeline sync issue - may need `bindToDocumentTimeline()` subscription timing adjustments if `helios.subscribe()` callbacks aren't firing synchronously during fast frame-by-frame rendering. See `docs/status/RENDERER.md` "Next Steps" for details.

[v2.10.0] ✅ Completed: Implement RenderSession - Added RenderSession class for standardized frame iteration and stability orchestration.
