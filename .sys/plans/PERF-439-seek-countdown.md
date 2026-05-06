---
id: PERF-439
slug: seek-countdown
status: complete
claimed_by: "executor-session"
created: 2025-05-23
completed: "2026-05-06"
result: "failed"
---

# PERF-439: Eliminate `Promise.all` via Counter Loop in `SeekTimeDriver.ts`

## Focus Area
DOM Rendering phase 4: Frame Capture Loop (`SeekTimeDriver.ts` hot path).

## Background Research
The `window.__helios_seek` script injected by `SeekTimeDriver` creates an array of promises `cachedPromises` to track the state of font loading, multiple media elements syncing, and custom stability checks (`window.helios.waitUntilStable`). Currently, when `cachedPromises.length > 1`, it dynamically allocates a `Promise.all(cachedPromises)` to race against the timeout promise. This happens on every single frame, causing V8 garbage collection churn. Previous attempts to avoid `Promise.all` overhead by either preallocating promises (impossible because `Promise.all` takes an array of instances) or returning `void` (broke execution correctness) failed. However, we can track multiple async tasks manually by incrementing a simple counter, avoiding array operations entirely.

## Benchmark Configuration
- **Composition URL**: dom-benchmark
- **Render Settings**: 1280x720, 30fps, 3s duration, dom mode
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~32.40s
- **Bottleneck analysis**: The hot loop in `SeekTimeDriver` injects a script into Chromium that performs asynchronous waiting for assets using `Promise.all`.

## Implementation Spec

### Step 1: Replace `Promise.all` with a manual counter in `SeekTimeDriver.ts`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `window.__helios_seek` injected script.
Replace the `cachedPromises` array with an integer counter `let remainingPromises = 0;` and a single manual `Promise`. For each async task (fonts, media syncing, wait until stable), increment `remainingPromises`. Instead of pushing to an array, attach `.then(onTaskComplete, fail)` to each individual promise, where `onTaskComplete` decrements `remainingPromises` and calls `finish()` when it hits zero.

```javascript
// Before:
cachedPromises.length = 0;
if (t === 0 && document.fonts && document.fonts.ready) {
  cachedPromises[cachedPromises.length] = document.fonts.ready;
}
// ...
if (cachedPromises.length > 0) {
  return new Promise((resolve, reject) => {
    // ...
    Promise.all(cachedPromises).then(finish, fail);
  });
}

// After:
let remainingPromises = 0;
return new Promise((resolve, reject) => {
    let done = false;
    const finish = () => { /* ... */ resolve(); };
    const fail = (err) => { /* ... */ reject(err); };
    const timeoutId = setTimeout(finish, timeoutMs);
    const onTaskComplete = () => {
        if (done) return;
        remainingPromises--;
        if (remainingPromises === 0) finish();
    };

    if (t === 0 && document.fonts && document.fonts.ready) {
        remainingPromises++;
        document.fonts.ready.then(onTaskComplete, fail);
    }
    // ... (repeat pattern for media elements and stability)

    if (remainingPromises === 0) {
        finish();
    }
});
```

**Why**: This entirely eliminates the allocation of the `cachedPromises` array and the `Promise.all` constructor call on every single frame, substituting it with a fast numeric decrement counter.
**Risk**: If any task resolves synchronously before the initialization block finishes, it could decrement the counter prematurely. We should ensure the `remainingPromises === 0` check happens after all checks are queued.

## Prior Art
- PERF-312: Attempted to remove `Promise.all` but broke the pipeline by returning synchronously.
- PERF-406: Preallocated the promises array but kept `Promise.all`.

## Results Summary
- **Best render time**: 32.651s
- **Improvement**: -0.58% (worse)
- **Kept experiments**: []
- **Discarded experiments**: [Replace Promise.all with countdown in SeekTimeDriver]
