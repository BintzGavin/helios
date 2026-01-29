---
title: "Core Changelog"
description: "Changelog for the Core package"
---

# Core Changelog

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
