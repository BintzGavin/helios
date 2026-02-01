# Plan: Implement Audio Looping in DomDriver

## 1. Context & Goal
- **Objective**: Update `DomDriver` to respect the `loop` attribute on HTMLMediaElements, enabling seamless looped playback in the preview.
- **Trigger**: Vision Gap - "Preview/Render Parity". The Renderer supports (or is adding support for) `loop` via FFmpeg, so the DOM Preview must match this behavior to ensure "What You See Is What You Get".
- **Impact**: Users can create infinite background loops simply by adding the `loop` attribute to their media tags. The preview will correctly wrap playback around the media duration instead of stopping or clamping at the end.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement looping logic in `syncMediaElements`)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Add test cases for looping)

## 3. Implementation Spec

### Architecture
- **Logic**: Modify the time calculation in `DomDriver.syncMediaElements`.
- **Current Logic**: `targetTime = Math.max(0, timeRelToStart + seek)` (Clamped by browser to duration).
- **New Logic**:
  - If `el.loop` is true AND `el.duration` is valid (> 0):
    - `targetTime = (timeRelToStart + seek) % el.duration`.
  - Else:
    - `targetTime = Math.max(0, timeRelToStart + seek)`.

- **Details**:
  - `timeRelToStart` is `currentTime - data-helios-offset`.
  - `seek` is `data-helios-seek`.
  - The behavior matches FFmpeg's `-stream_loop -1 -ss [seek] -i [file]`, which skips the first `seek` seconds of the infinite loop (effectively starting at `seek`, playing to end, then wrapping to 0).

### Public API Changes
- None. This is an internal behavior update respecting standard HTML attributes.

### Dependencies
- None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  1.  New test "should loop audio when loop attribute is present" passes.
  2.  Existing tests pass (regression check).
  3.  Verify that `currentTime` wraps around `duration`.
- **Edge Cases**:
  - `duration` is NaN or Infinity (should fallback to non-looping behavior).
  - `duration` is 0 (should avoid division by zero/NaN).
  - `loop` with `seek` > `duration` (should wrap: `(0 + 15) % 10 = 5`).
