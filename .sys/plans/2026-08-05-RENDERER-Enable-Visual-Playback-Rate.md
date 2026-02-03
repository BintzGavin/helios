# Enable Visual Playback Rate Support

## 1. Context & Goal
- **Objective**: Ensure that `<video>` and `<audio>` elements respect the `playbackRate` attribute (or property) during rendering in both Canvas and DOM modes.
- **Trigger**: Discovery of A/V desync where `FFmpegBuilder` (audio) respects `playbackRate` but `TimeDriver` (video visuals) ignores it, causing audio to speed up/slow down while video plays at 1x speed.
- **Impact**: Corrects synchronization for creative effects (slow motion, fast forward) and ensures WYSIWYG behavior between the player and the renderer.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-visual-playback-rate.ts` (Verification script)
- **Modify**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts` (Update `setTime` injection logic)
  - `packages/renderer/src/drivers/CdpTimeDriver.ts` (Update `setTime` injection logic)
- **Read-Only**: `packages/renderer/src/utils/dom-scanner.ts` (Reference implementation)

## 3. Implementation Spec

### Architecture
- **Pattern**: Logic Injection. We inject JavaScript into the browser page via `page.evaluate` to manually calculate and set the `currentTime` of media elements.
- **Logic**: The formula for calculating the target media time will be updated from linear 1:1 mapping to a rate-scaled mapping: `targetTime = (globalTime - offset) * playbackRate + seek`.

### Pseudo-Code

#### `packages/renderer/src/drivers/SeekTimeDriver.ts` & `CdpTimeDriver.ts`

Inside the `mediaElements.forEach` loop in `setTime`:

```javascript
// GET playbackRate from element property OR attribute 'playbackRate' OR default to 1.0
SET rate = element.playbackRate
IF rate IS undefined OR null:
    SET rateAttr = element.getAttribute('playbackRate')
    SET rate = parseFloat(rateAttr) OR 1.0

// VALIDATE rate (ensure it is finite and > 0, else default 1.0)
IF isNaN(rate) OR rate <= 0:
    rate = 1.0

// CALCULATE targetTime
// Old: targetTime = Math.max(0, t - offset + seek)
// New: targetTime = Math.max(0, (t - offset) * rate + seek)

SET element.currentTime = targetTime
```

### Public API Changes
- None. This is an internal fix to the rendering logic.

### Dependencies
- None.

## 4. Test Plan

### Verification Script: `packages/renderer/tests/verify-visual-playback-rate.ts`
- **Setup**:
  - Create a composition with two `<video>` elements side-by-side.
  - Video 1: `playbackRate="1.0"` (Reference)
  - Video 2: `playbackRate="2.0"` (Test)
  - Both videos should display a time counter (or use a test pattern where frame N = N seconds).
  - Since we can't easily generate a video on the fly inside the test without FFmpeg, we can use a `canvas` animation that draws a counter, record it to a temp file, and then use that temp file as the source for the test.
  - *Simplification*: Use a simple `canvas` animation that acts as a "video" (via `captureStream` -> `<video srcObject>`)? No, Renderer handles `<video>` tags via `src`.
  - *Alternative*: Use `packages/renderer/tests/assets/test-pattern.mp4` if available, or generate one using `Renderer` first.

- **Test Flow**:
  1. Generate a 5-second "Source Video" (counter.mp4) where each frame clearly shows the timestamp (using `CanvasStrategy`).
  2. Create a test composition HTML that includes:
     - `<video src="counter.mp4" id="v1">` (Normal)
     - `<video src="counter.mp4" playbackRate="2.0" id="v2">` (Fast)
  3. Render this composition for 1 second (at T=1.0).
  4. In the output (or by inspecting the page during a debug render), V1 should be at T=1.0, V2 should be at T=2.0.

- **Automated Check (Unit/Integration approach)**:
  - Instead of parsing the output video (hard), we can verify the *internal state* during `diagnose` or by adding a specific `verify-driver` test that mocks the page and asserts the `currentTime` set by the driver.
  - **Selected Approach**: Create `packages/renderer/tests/verify-visual-playback-rate.ts` that:
    1. Launches `Renderer` with `mode: 'dom'` (SeekTimeDriver).
    2. Renders a page with `<video playbackRate="2">`.
    3. We can't easily assert inside the render loop without modifying Renderer to expose hooks.

  - **Refined Test Plan (Self-Contained Logic Test)**:
    - Create a unit-style test for `SeekTimeDriver` and `CdpTimeDriver` specifically.
    - Instantiate the driver.
    - Launch a browser page with a mock `<video>` element.
    - Call `driver.setTime(page, 10.0)`.
    - `page.evaluate(() => document.querySelector('video').currentTime)`
    - Assert that `currentTime` is `20.0` (for rate=2).

- **Verification Command**: `npx ts-node packages/renderer/tests/verify-visual-playback-rate.ts`

### Success Criteria
- `SeekTimeDriver`: At global time 10s, `<video playbackRate="2">` has `currentTime` 20s.
- `CdpTimeDriver`: At global time 10s, `<video playbackRate="0.5">` has `currentTime` 5s.
