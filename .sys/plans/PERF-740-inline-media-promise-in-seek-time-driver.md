---
id: PERF-740
slug: inline-media-promise-in-seek-time-driver
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-740: Inline Media Promise Creation in SeekTimeDriver

## Focus Area
The `__helios_seek` function injected by `SeekTimeDriver.ts` which handles frame-by-frame seeking and synchronizing media.

## Background Research
Currently, `SeekTimeDriver.ts` uses a helper function `createMediaPromise` to create promises for media elements that are seeking or not ready. This function is called in the hot loop when synchronizing media elements. However, V8 optimization often prefers inline code to avoid function call overhead and closure allocations, especially when the function modifies external state or uses closures. By inlining the promise creation logic directly into the loop, we can eliminate the function call overhead and reduce the allocation of closures.

## Benchmark Configuration
- **Composition URL**: `http://localhost:3000/tests/benchmarks/dom-heavy`
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.46s
- **Bottleneck analysis**: The hot loop in `__helios_seek` executes every frame. The function call to `createMediaPromise` and the associated closure allocations for the promise executor and cleanup functions add overhead.

## Implementation Spec

### Step 1: Inline Media Promise Creation
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Remove the `createMediaPromise` function definition from the `initScript`.
2. Inline the promise creation logic directly into the loop where it was called:
   ```javascript
              if (el.seeking || el.readyState < 2) {
                if (!el.__helios_sync_promise) {
                  el.__helios_sync_promise = new Promise((resolve) => {
                    let resolved = false;
                    const finish = () => {
                      if (resolved) return;
                      resolved = true;
                      el.removeEventListener('seeked', finish);
                      el.removeEventListener('canplay', finish);
                      el.removeEventListener('error', finish);
                      el.__helios_sync_promise = null;
                      resolve();
                    };
                    el.addEventListener('seeked', finish);
                    el.addEventListener('canplay', finish);
                    el.addEventListener('error', finish);
                  });
                }
                cachedPromises[cachedPromises.length] = el.__helios_sync_promise;
              }
   ```
**Why**: Eliminating the function call and inline promise creation can reduce allocation and call overhead in the per-frame hot loop.
**Risk**: Negligible risk; the logic remains functionally identical, just structured differently for V8 optimization.

## Correctness Check
Run the canvas and dom smoke tests to ensure media synchronization still works correctly.
