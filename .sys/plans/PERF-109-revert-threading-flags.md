---
id: PERF-109
slug: revert-threading-flags
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---
# PERF-109: Revert Threading Synchronicity Flags

## Focus Area
Chromium `DEFAULT_BROWSER_ARGS` in `packages/renderer/src/Renderer.ts`.

## Background Research
In `packages/renderer/src/Renderer.ts`, adding `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, and `--disable-image-animation-resync` regresses overall DOM rendering performance because forcing synchronicity on these sub-systems blocks the main thread too aggressively, neutralizing IPC concurrency benefits. Removing them will restore baseline performance.

## Baseline
- **Current best render time**: 33.394s (Last updated by: PERF-107)
- **Bottleneck analysis**: Main thread contention in Chromium caused by disabling threaded animations and scrolling.

## Implementation Spec

### Step 1: Remove Regressive Flags
**File**: `packages/renderer/src/Renderer.ts`
**What to change**: Remove the following flags from the `DEFAULT_BROWSER_ARGS` array:
- `--disable-threaded-animation`
- `--disable-threaded-scrolling`
- `--disable-checker-imaging`
- `--disable-image-animation-resync`

**Why**: These flags force operations onto the main thread, causing aggressive blocking during the CDP frame capture loop and negating concurrent execution benefits, leading to a performance regression.
**Risk**: Low. This restores a known-stable configuration.

## Correctness Check
Run `npm run test -w packages/renderer` to ensure DOM capture output and rendering remain functional.
