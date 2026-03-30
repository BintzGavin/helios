---
id: PERF-112
slug: eliminate-array-map
status: unclaimed
claimed_by: ""
created: 2024-05-30
completed: ""
result: ""
---

# PERF-112: Eliminate Array.map in PRELOAD_SCRIPT Execution

## Focus Area
The `prepare()` method in `packages/renderer/src/strategies/DomStrategy.ts` during Strategy Preparation.

## Background Research
Currently, during the initialization of the `DomStrategy`, the `PRELOAD_SCRIPT` is injected into all iframes on the page using:
```typescript
    await Promise.all(page.frames().map(frame =>
      frame.evaluate(script)
    ));
```
While this array map allocation and `.evaluate` closure allocation only happen once per worker process during setup, optimizing array `.map` calls into localized `for` loops in performance-critical code paths reduces V8 heap allocations and garbage collection overhead. Applying the localized `for` loop optimization here ensures consistency and marginally reduces setup latency. This also avoids creating unnecessary array elements if there are multiple frames.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.394s
- **Bottleneck analysis**: Array allocation (`.map`) and closure creation during page setup phase.

## Implementation Spec

### Step 1: Replace .map with a for loop
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `prepare(page: Page)` method, locate the execution of `PRELOAD_SCRIPT`:

```typescript
    // Execute preloading script in all frames
    await Promise.all(page.frames().map(frame =>
      frame.evaluate(script)
    ));
```

Change it to:

```typescript
    // Execute preloading script in all frames
    const frames = page.frames();
    const framePromises = new Array(frames.length);
    for (let i = 0; i < frames.length; i++) {
        framePromises[i] = frames[i].evaluate(script);
    }
    await Promise.all(framePromises);
```

**Why**: Replaces dynamic array allocation and the inline anonymous function passed to `.map` with a statically sized array and a standard `for` loop. This avoids the V8 overhead of the array iterator and closure context allocation.
**Risk**: Very low. It's a straight-forward transformation that maintains identical functionality while optimizing array operations.

## Correctness Check
Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` multiple times to verify benchmark times and ensure the output video is generated smoothly without artifacts.
