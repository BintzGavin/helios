# RENDERER: Enable Visual Playback Rate

#### 1. Context & Goal
- **Objective**: Implement `playbackRate` support for `<video>` elements in `SeekTimeDriver` and `CdpTimeDriver` to ensure visual media synchronizes correctly with the timeline when speed changes are applied.
- **Trigger**: `DomScanner` already discovers and exports `playbackRate` for audio processing (via FFmpeg `atempo`), but the visual rendering drivers (TimeDrivers) ignore this property, calculating video time as if it were always 1.0x. This causes Audio/Video desynchronization.
- **Impact**: Enables correct rendering of speed-ramped video clips (e.g., slow motion, fast forward) in both DOM and Canvas modes, fulfilling the "Dual-Path Architecture" and "Correctness" vision.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Update `mediaSyncScript` to respect playbackRate)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Update `mediaSyncScript` to respect playbackRate)
- **Create**: `packages/renderer/tests/verify-visual-playback-rate.ts` (Verification script)
- **Read-Only**: `packages/renderer/tests/verify-seek-driver-offsets.ts` (Reference implementation)

#### 3. Implementation Spec
- **Architecture**: The `TimeDriver` is responsible for forcing the state of the DOM to match the virtual timeline time `t`. Currently, it calculates media time as `t - offset + seek`. It must be updated to scale the time delta by the element's `playbackRate`.
- **Pseudo-Code**:
  ```javascript
  // Inside mediaSyncScript (injected into browser)
  FOREACH mediaElement in Document:
    GET offset = parseFloat(attr('data-helios-offset') || 0)
    GET seek = parseFloat(attr('data-helios-seek') || 0)
    GET rateAttr = attr('playbackRate')
    GET rate = element.playbackRate ?? (rateAttr ? parseFloat(rateAttr) : 1.0)

    // Validate rate (default to 1.0 if invalid/zero)
    IF rate <= 0 OR !isFinite(rate) SET rate = 1.0

    // Calculate target time
    // Formula: (GlobalTime - Offset) * Rate + Seek
    SET targetTime = (t - offset) * rate + seek
    MAX targetTime with 0

    // Handle Looping
    IF element.loop AND element.duration > 0:
      SET targetTime = targetTime % element.duration

    SET element.currentTime = targetTime
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-visual-playback-rate.ts`
- **Success Criteria**:
  - The test script initializes `SeekTimeDriver`.
  - It loads a page with `<video data-helios-offset="0" playbackRate="2.0">`.
  - It sets time to `1.0`.
  - It asserts that `video.currentTime` is `2.0` (±0.1s tolerance).
  - It repeats the test for `0.5x` speed.
  - It repeats the verification for `CdpTimeDriver` (if possible in headless env, otherwise relies on `SeekTimeDriver` test as logic is identical).
- **Edge Cases**:
  - `playbackRate` = 0 (Should fallback to 1.0 or pause? Spec says fallback to 1.0 for safety, or handle as static frame). Logic: `rate` should be sanitized.
  - `playbackRate` < 0 (Reverse playback not fully supported by FFmpeg/Helios yet, sanitizer should clamp or fallback).
