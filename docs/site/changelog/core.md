---
title: "Core Changelog"
description: "Changelog for the Core package"
---

# Core Changelog

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
