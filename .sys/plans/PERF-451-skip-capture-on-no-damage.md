---
id: PERF-451
slug: skip-capture-on-no-damage
status: complete
claimed_by: "jules"
created: 2024-05-30
completed: ""
result: ""
---

# PERF-451: Skip Capture on No Damage

## Focus Area
Frame Capture Loop in `DomStrategy.ts`.

## Background Research
Currently, the renderer captures a screenshot via `HeadlessExperimental.beginFrame` for every single frame, regardless of whether the DOM has actually changed (e.g. static scenes, paused animations). The `screenshotData` returned by the compositor is either identical to the previous frame or skipped internally by Playwright but we still pay the IPC and pipeline overhead.

Chromium's `HeadlessExperimental.beginFrame` has a boolean `hasDamage` property in its result object. If the compositor determines no visual changes occurred during the frame interval, `hasDamage` is false. By checking this property, we can avoid piping duplicate data to FFmpeg or re-allocating buffers, and instead just pass the `lastFrameData` buffer. This prevents unnecessary string decoding and memory allocation in Node.js when scenes are static.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/dom-benchmark/composition.html` (or a more static composition if one exists)
- **Render Settings**: 1280x720, 30 FPS, 3 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.7s
- **Bottleneck analysis**: IPC string transfer and Buffer allocation for identical frames during static or slow-moving scenes.

## Implementation Spec

### Step 1: Utilize `hasDamage` in `DomStrategy`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Modify `handleBeginFrameSuccess` (or the `.then` closure in `capture()`) to check for `hasDamage`.
If `result.hasDamage === false` AND `this.lastFrameData` exists, return `this.lastFrameData` immediately without processing `result.screenshotData`.
If `result.hasDamage !== false` (or true), process `result.screenshotData` as usual and update `this.lastFrameData`.
**Why**: Avoids base64-to-buffer conversion and redundant IPC handling when the compositor knows nothing changed.
**Risk**: If `hasDamage` is incorrectly reported by the compositor (e.g., due to `--run-all-compositor-stages-before-draw`), the video might freeze or skip frames.

## Variations

### Variation A: Rely on `screenshotData` absence
If `hasDamage` is not reliable or not present in the specific Playwright CDP version used, we can also optimize the check: if `result.screenshotData` is missing but the command succeeded, it inherently means no damage. Return `this.lastFrameData`.

## Canvas Smoke Test
Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-concurrent.ts` (or equivalent canvas tests).

## Correctness Check
Render `output/example-build/examples/dom-benchmark/composition.html` and visually inspect the output MP4. Ensure animations do not freeze.

## Results Summary
- Status: discarded
- Reason: Chromium's `HeadlessExperimental.beginFrame` always returns `hasDamage: true` if the `screenshot` parameter is included in the request, even for static scenes. It is impossible to both request a screenshot and accurately detect lack of damage in the same CDP call.
