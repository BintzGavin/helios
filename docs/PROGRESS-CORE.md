# CORE Progress Log

## CORE v1.26.1
- ✅ Completed: Verify Core Package Integrity - Verified build, tests, and artifacts for `packages/core`.

## CORE v1.26.0
- ✅ Completed: Implement Initial Frame - Added `initialFrame` to `HeliosOptions` and updated constructor to initialize state and sync driver, enabling HMR state preservation.

## CORE v1.25.0
- ✅ Completed: Implement Color Interpolation - Implemented `interpolateColors` and `parseColor` utilities supporting Hex, RGB, and HSL formats.

## CORE v1.24.0
- ✅ Completed: Implement Relative Audio Mixing - Implemented relative volume and mute handling in `DomDriver`.

## CORE v1.23.0
- ✅ Completed: Implement Resolution Awareness - Added `width`/`height` to state/options, `setSize` method, and `INVALID_RESOLUTION` error.

## CORE v1.22.0
- ✅ Completed: Expand Input Schema Validation - Added `minimum`, `maximum`, and `enum` constraints to `HeliosSchema` and updated `validateProps`.

## CORE v1.21.0
- ✅ Completed: Implement Deterministic Randomness - Added `random` utility with Mulberry32 PRNG and string seeding support.

## CORE v1.20.0
- ✅ Completed: Implement Active Captions - Added `activeCaptions` signal, `setCaptions`, and `findActiveCues` with glitch-free updates.

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
