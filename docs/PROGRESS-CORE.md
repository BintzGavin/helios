# CORE Progress Log

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
