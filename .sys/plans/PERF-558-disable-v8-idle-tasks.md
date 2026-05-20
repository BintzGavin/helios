---
id: PERF-558
slug: disable-v8-idle-tasks
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-558: Disable V8 Idle Tasks in Headless Chromium

## Focus Area
Browser Initialization (`BrowserPool.ts`) - Chromium Architecture Flags

## Background Research
Chromium runs various idle tasks (like V8 garbage collection) when it thinks the browser is idle. In a tight, frame-by-frame rendering loop driven by `HeadlessExperimental.beginFrame`, the concept of "idle" is skewed. The browser might attempt to run garbage collection or other background tasks between frames, introducing micro-stutters that delay the next frame capture.

Adding the flag `--disable-v8-idle-tasks` instructs V8 to not perform background garbage collection during idle time. This can make frame times more consistent and potentially reduce the overall render time by keeping the main thread focused purely on execution and layout.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~10.002s
- **Bottleneck analysis**: CPU contention from V8 background tasks during frame rendering loop.

## Implementation Spec

### Step 1: Add `--disable-v8-idle-tasks` to `BrowserPool.ts`
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
Append the string `'--disable-v8-idle-tasks'` to the `DEFAULT_BROWSER_ARGS` array.

**Why**: To prevent V8 from attempting background garbage collection and other idle tasks that could interfere with the tight frame rendering loop.
**Risk**: Memory usage might increase slightly, but given short-lived rendering sessions, it should be manageable.

## Variations
None.

## Canvas Smoke Test
Run `npm run test -w packages/renderer -- --run` to ensure Canvas mode still functions.

## Correctness Check
Run the full test suite (`npm run test -w packages/renderer -- --run`) to verify the time driver still functions correctly and stability checks are respected.

## Prior Art
- PERF-305 attempted this, but was on an older baseline, re-testing on the highly-optimized single-process baseline is warranted.
