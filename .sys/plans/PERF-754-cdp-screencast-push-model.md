---
id: PERF-754
slug: cdp-screencast-push-model
status: unclaimed
claimed_by: ""
created: 2024-06-13
completed: ""
result: ""
---

# PERF-754: Test `Page.startScreencast` Push-Based Capture

## Focus Area
Frame Capture Loop (`packages/renderer/src/strategies/DomStrategy.ts` and `CaptureLoop.ts`).

## Background Research
Currently, `DomStrategy` uses Playwright's `HeadlessExperimental.beginFrame` to capture frames via CDP in a pull-based model. We want to test if a push-based model using `Page.startScreencast` can achieve faster render times by better pipelining capture and encode.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition (`examples/dom-benchmark`)
- **Render Settings**: 600x600, 30fps, 5s duration, ultrafast preset
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.380s (Local run with concurrency=2)

## Implementation Spec

### Step 1: Switch to `Page.startScreencast`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Remove `HeadlessExperimental.beginFrame` setup in `prepare`.
- Setup `Page.screencastFrame` listener in `prepare`.
- Send `Page.startScreencast` command in `prepare`.
- Buffer incoming frames and acknowledge them with `Page.screencastFrameAck`.
- Modify `capture(page: Page, frameTime: number)` to await frames from the buffer instead of sending `beginFrame`.
**Why**: To test if push-based capture is faster than pull-based.
**Risk**: Potential desynchronization or deadlocks.

## Variations
None.

## Canvas Smoke Test
Run `npm run build -w packages/renderer` to ensure no syntax errors.

## Correctness Check
Run the DOM render benchmark `cd packages/renderer && npx tsx scripts/benchmark-perf.ts --concurrency 1` and `--concurrency 2`.

## Prior Art
- PERF-381 previously attempted this but was discarded. The current setup might allow it to work or at least give us new insight.
