---
id: PERF-305
slug: disable-v8-idle-tasks
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-305: Disable V8 Idle Tasks in Headless Chromium

## Focus Area
Browser Initialization (`BrowserPool.ts`) - Chromium Architecture Flags

## Background Research
Chromium runs various idle tasks (like V8 garbage collection) when it thinks the browser is idle. In a tight, frame-by-frame rendering loop driven by `HeadlessExperimental.beginFrame`, the concept of "idle" is skewed. The browser might attempt to run garbage collection or other background tasks between frames, introducing micro-stutters that delay the next frame capture.

Adding the flag `--disable-v8-idle-tasks` instructs V8 to not perform background garbage collection during idle time. This can make frame times more consistent and potentially reduce the overall render time by keeping the main thread focused purely on execution and layout.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`tests/fixtures/benchmark.ts`)
- **Render Settings**: 1920x1080, 60fps, 10s duration, libx264 codec
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~48.2s
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
Run `npx tsx tests/verify-canvas-strategy.ts` to ensure Canvas mode still functions.

## Correctness Check
Run the DOM render tests to ensure multi-page worker pools still capture frames correctly.

## Prior Art
- N/A
