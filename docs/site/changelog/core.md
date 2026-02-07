---
title: "Core Changelog"
description: "Changelog for the Core package"
---

# Core Changelog

## v5.13.0
- **Generic Input Props**: Refactored Helios class to accept generic `TInputProps` for strict property typing.

## v5.12.0
- **Implement Active Clips**: Added `timeline` to `HeliosOptions` and `activeClips` signal to `Helios` state, enabling declarative timeline management. Fixed critical bug in chained cold computed signals.

## v5.11.0
- **Implement Composition Schema**: Implemented HeliosConfig, HeliosComposition, and related interfaces to support serializable composition definitions.

## v5.10.0
- **Shared Virtual Time Binding**: Implemented static registry in Helios to allow multiple instances to synchronize with `window.__HELIOS_VIRTUAL_TIME__` simultaneously.

## v5.9.0
- **Reactive Virtual Time Getter**: Exposed `isVirtualTimeBound` getter in `Helios` to allow consumers to verify synchronous virtual time binding, facilitating better integration with external renderers.

## v5.8.0
- **Expose Fade Easing Metadata**: Added `fadeEasing` to `AudioTrackMetadata` and updated `DomDriver` to parse `data-helios-fade-easing` attribute, exposing non-linear fade configurations to consumers.

## v5.7.0
- **Enable Audio State Persistence**: Added `audioTracks` to `HeliosOptions` and updated constructor to initialize mixer state (volume/muted per track) from configuration, enabling full session save/load.

## v5.6.0
- **Audio Fade Easing**: Implemented `data-helios-fade-easing` support in `DomDriver`, enabling non-linear audio fades (e.g., "quad.in") using the Easing library.

## v5.5.0
- **Audio Visualization Hooks**: Added `getAudioContext()` and `getAudioSourceNode(trackId)` methods to `Helios` and `DomDriver`, allowing consumers to hook into the audio graph for visualization.

## v5.4.0
- **Headless Audio Tracks**: Added `availableAudioTracks` option to `HeliosOptions` and `setAvailableAudioTracks` method, enabling manual injection of audio metadata for headless environments.

## v5.3.0
- **Expose Audio Source**: Updated `AudioTrackMetadata` to include `src` property, populated by `DomDriver` from `currentSrc` or `src` attribute, enabling access to audio source URLs in metadata.

## v5.2.1
- **Fix Subscription Timing**: Forced notification in `bindToDocumentTimeline` when virtual time is set to the same frame, ensuring external drivers (e.g. GSAP) remain synchronized during precise seeking.

## v5.2.0
- **Expose Audio Fades**: Updated `AudioTrackMetadata` to include `fadeInDuration` and `fadeOutDuration`, and updated `DomDriver` to automatically discover these values from `data-helios-fade-in` and `data-helios-fade-out` attributes.

## v5.1.2
- **Fix GSAP Synchronization**: Forced subscriber notification in `bindToDocumentTimeline` when virtual time is present to ensure initial state synchronization with external libraries like GSAP, resolving black frames in render output.

## v5.1.1
- **Fix Virtual Time Synchronization**: Enhanced `bindToDocumentTimeline` to robustly handle reactive binding failures (falling back to manual polling) and updated `waitUntilStable` to block until virtual time is fully synchronized, fixing race conditions in frame-by-frame rendering.

## v5.1.0
- **Implement WebVTT Support**: Implemented `parseWebVTT` and auto-detecting `parseCaptions` in `captions.ts`, enabling native .vtt file support.

## v5.0.1
- **Decouple TimeDriver from DOM**: Updated `TimeDriver` and `Helios` to accept `unknown` scope, enabling Web Worker support, and synchronized version.

## v5.0.0
- **Implement Audio Track Metadata**: Updated `availableAudioTracks` signal to return `AudioTrackMetadata[]` instead of `string[]` (Breaking Change), including `startTime` and `duration` discovery.

## v4.1.0
- **Implement Marker Metadata**: Updated `Marker` interface to include optional `metadata` and make `label` optional.

## v4.0.0
- **Remove WaapiDriver**: Removed deprecated `WaapiDriver` and bumped version to 4.0.0 (Breaking Change).

## v3.9.2
- **Verify Subscription Timing**: Verified that `helios.subscribe` fires synchronously after `seek()` and virtual time updates.

## v3.9.1
- **Expose Version and Verify Init Sync**: Exported `VERSION` constant and verified robust `bindToDocumentTimeline` initialization with pre-existing virtual time.

## v3.9.0
- **Fix Signal Glitches and Runtime Safety**: Optimized `EffectImpl` to avoid redundant executions and guarded `Helios.bindToDocumentTimeline` for Node.js compatibility.

## v3.8.0
- **Implement Audio Track Discovery**: Implemented `availableAudioTracks` signal in `Helios` and updated `DomDriver` to discover elements with `data-helios-track-id`.

## v3.7.0
- **Implement DomDriver Audio Looping**: Updated `DomDriver` to respect the `loop` attribute on media elements, wrapping time calculations to support infinite loops.

## v3.6.0
- **Refactor Helios**: Extracted Helios class to dedicated Helios.ts file.
- **Implement Audio Fading**: Added support for `data-helios-fade-in` and `data-helios-fade-out` in `DomDriver` to enable linear audio fading.

## v3.5.1
- **Implement Reactive Virtual Time**: Replaced polling with reactive setter for `__HELIOS_VIRTUAL_TIME__` in `bindToDocumentTimeline`.

## v3.5.0
- **Implement Timeline Sync**: Added `Helios.bindTo(master)` and `Helios.unbind()` for synchronizing multiple Helios instances.

## v3.4.0
- **Implement Audio Tracks**: Added support for audio tracks allowing independent volume/mute control for groups of elements using `data-helios-track-id`.

## v3.2.0
- **Implement AI System Prompt Generator**: Added `createSystemPrompt` and `HELIOS_BASE_PROMPT` to programmatically generate context-aware system prompts for AI agents.

## v3.1.0
- **Synchronize Version**: Synced package.json version to 3.1.0 to match documentation and updated player/renderer dependencies.
- **Enhance Schema UI Constraints**: Added `pattern`, `accept`, and `group` to `PropDefinition` and implemented validation logic for regex and file extensions.

## v3.0.0
- **Expose Duration/FPS Signals**: Changed `duration` and `fps` to return `ReadonlySignal<number>` for reactive updates (Breaking Change).

## v2.20.0
- **Audio Diagnostics**: Added audioCodecs (aac, opus) detection to Helios.diagnose() and DiagnosticReport.

## v2.19.1
- **Update Documentation**: Added usage examples for `stagger` and `shift` to README.

## v2.19.0
- **Implement Sequencing Helpers**: Added `stagger` and `shift` utilities to `packages/core` to simplify animation timing.

## v2.18.0
- **Schema Constraints**: Added `minItems`, `maxItems`, `minLength`, `maxLength` constraints to `PropDefinition` and implemented validation logic.

## v2.17.1
- **Fix Leaky Signal Subscriptions**: Implemented `untracked` and updated `subscribe` to prevent dependency tracking within callbacks.

## v2.17.0
- **Implement Typed Arrays**: Added support for Typed Arrays (Float32Array, etc.) in HeliosSchema and validateProps.

## v2.16.0
- **Time-Based Control**: Added `currentTime` signal and `seekToTime()` method to `Helios` class for direct time manipulation.

## v2.15.0
- **Enhance Diagnose**: Expanded `Helios.diagnose()` to include WebGL, WebAudio, Color Gamut, and Video Codec support.

## v2.14.0
- **Implement Missing Asset Types**: Added `model`, `json`, and `shader` to supported `PropType` values and validation logic.

## v2.13.0
- **Validate Schema Defaults**: Implemented `validateSchema` to ensure schema defaults match their defined types, adding `INVALID_SCHEMA` error code.

## v2.12.0
- **Schema Enhancements**: Added `step` and `format` properties to `PropDefinition` to support UI generation hints.

## v2.11.0
- **Recursive Animation & Media Discovery**: Implemented robust recursive Shadow DOM discovery in `DomDriver` with dynamic `MutationObserver` support.

## v2.10.0
- **Version Sync**: Synced package.json version to 2.10.0 and updated context documentation.
- **Implement RenderSession**: Added RenderSession class for standardized frame iteration and stability orchestration.

## v2.9.0
- **Synchronize Version**: Updated `package.json` to 2.9.0 and fixed flaky stability test.
- **Implement Recursive Schema**: Updated `PropDefinition` to support `items` and `properties` for nested array/object validation, and refactored `validateProps`.

## v2.8.0
- **Bind Virtual Time**: Updated `bindToDocumentTimeline` to support `__HELIOS_VIRTUAL_TIME__` for precise synchronization in renderer environments.

## v2.7.2
- **Verify Stability Registry**: Verified implementation of `registerStabilityCheck` and `waitUntilStable`, updated JSDoc, and cleaned up stale plan.

## v2.7.1
- **Rename Audio Test**: Renamed `audio.test.ts` to `helios-audio.test.ts` to clarify structure.

## v2.7.0
- **Implement Stability Registry**: Implemented stability registry pattern in `Helios` allowing external consumers to register async checks for `waitUntilStable`.

## v2.6.1
- **Fix bindToDocumentTimeline Sync**: Updated `Helios.bindToDocumentTimeline` to propagate time updates to the active `TimeDriver`, ensuring media synchronization when driven externally.

## v2.6.0
- **Implement DomDriver Media Attributes**: Implemented `data-helios-offset` and `data-helios-seek` support in `DomDriver` for accurate in-browser preview timing.

## v2.5.0
- **Maintenance and Robustness**: Fixed memory leak in Helios constructor, enhanced color schema validation, and synced package version.

## v2.4.0
- **Implement Spring Duration**: Added `calculateSpringDuration` utility and exported `DEFAULT_SPRING_CONFIG` in `packages/core`.

## v2.3.0
- **Implement Transitions Library**: Implemented standard transition and crossfade functions, and corrected README installation instructions.

## v2.2.0
- **Implement Playback Range**: Added `playbackRange` to `HeliosState`, enabling loop and clamp behavior within a specific frame range.

## v2.1.0
- **ESM Compliance**: Converted package to native ESM with "type": "module", "moduleResolution": "node16", and explicit .js extensions.

## v2.0.0
- **WaitUntilStable Interface**: Made `waitUntilStable` required in `TimeDriver` interface and strict in `Helios` to ensure reliable rendering.

## v1.33.0
- **Implement WaitUntilStable**: Implemented `waitUntilStable` in `Helios` and `DomDriver` to ensure deterministic rendering by waiting for fonts, images, and media readiness.

## v1.32.1
- **Document Dynamic Timing**: Verified implementation, added JSDoc, and cleaned up plan artifacts.

## v1.27.0
- **Expose Captions**: Exposed full caption list in `HeliosState` and enabled array input for captions in constructor and `setCaptions`.

## v1.26.0
- **Implement Initial Frame**: Added `initialFrame` to `HeliosOptions` and updated constructor to initialize state and sync driver, enabling HMR state preservation.

## v1.25.0
- **Implement Color Interpolation**: Implemented `interpolateColors` and `parseColor` utilities supporting Hex, RGB, and HSL formats.

## v1.24.0
- **Implement Relative Audio Mixing**: Implemented relative volume and mute handling in `DomDriver`.

## v1.23.0
- **Implement Resolution Awareness**: Added `width`/`height` to state/options, `setSize` method, and `INVALID_RESOLUTION` error.

## v1.22.0
- **Expand Input Schema Validation**: Added `minimum`, `maximum`, and `enum` constraints to `HeliosSchema` and updated `validateProps`.

## v1.21.0
- **Implement Deterministic Randomness**: Added `random` utility with Mulberry32 PRNG and string seeding support.

## v1.20.0
- **Implement Active Captions**: Added `activeCaptions` signal, `setCaptions`, and `findActiveCues` with glitch-free updates.

## v1.19.0
- **Implement Audio Volume Control**: Added `volume` and `muted` state to `Helios` and updated `DomDriver` to sync with HTMLMediaElements.

## v1.18.0
- **Implement Input Schema Validation**: Added `HeliosSchema` definition, `validateProps` logic, and integrated validation into `Helios` constructor and `setInputProps`.

## v1.17.0
- **Implement SRT Parser**: Implemented `parseSrt` and `stringifySrt` utilities for caption support.

## v1.16.0
- **Implement Helios Disposal**: Added `dispose()` method to `Helios` for proper resource cleanup (tickers, polling loops, subscribers).

## v1.15.0
- **Implement Structured Errors**: Implemented `HeliosError` and `HeliosErrorCode` to provide machine-parseable errors.

## v1.14.0
- **Enable Node.js Runtime Support**: Implemented `TimeoutTicker` and environment detection for Node.js compatibility.

## v1.13.0
- **Export Types**: Exported `HeliosState` and `HeliosSubscriber` types from `packages/core` to improve DX.

## v1.12.0
- **Implement DomDriver**: Implemented `DomDriver` to sync WAAPI and HTMLMediaElements, updated `Helios` to use it by default, and deprecated `WaapiDriver`.

## v1.11.3
- **Add Documentation**: Created comprehensive `README.md` for `packages/core`.

## v1.11.2
- **Verify Signals and Cleanup Plans**: Verified signal integration and cleaned up completed plan files.

## v1.11.1
- **Refactor Helios Signals**: Added JSDoc documentation to public signal properties and verified signal implementation.

## v1.11.0
- **Implement Easing Functions**: Implemented standard easing functions (linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce) and cubic-bezier solver.

## v1.10.0
- **Refactor Helios to use Signals**: Replaced internal state with signals, exposed ReadonlySignal getters, and maintained backward compatibility.

## v1.9.0
- **Implement Signals**: Implemented `signal`, `computed`, and `effect` primitives with memory safety and consistency guarantees.

## v1.8.0
- **Implement Series Helper**: Implemented `series` function for sequential layout of composition elements.

## v1.7.0
- **Implement Sequencing Primitives**: Implemented `sequence` function and interfaces in `packages/core`.

## v1.6.0
- **Implement TimeDriver Abstraction**: Refactored `Helios` to use `TimeDriver` strategy, extracted `WaapiDriver`, and added support for custom drivers.

## v1.5.0
- **Implement Spring Animation Helper**: Implemented physics-based `spring` function with underdamped, critically damped, and overdamped support.

## v1.3.0
- **Implement Animation Helpers**: Implemented `interpolate` function with easing and extrapolation support.

## v1.2.0
- **Implement Variable Playback Rate**: Added `playbackRate` control, time-based ticking logic, and exported `HeliosOptions`.

## v1.1.0
- **Implement InputProps**: Added `inputProps` to state/options and `setInputProps` method to Helios class.
