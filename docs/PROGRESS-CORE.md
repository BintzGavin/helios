# CORE Progress Log

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
