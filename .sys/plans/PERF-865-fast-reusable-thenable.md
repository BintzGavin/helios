---
id: PERF-865
slug: fast-reusable-thenable
status: complete
claimed_by: "perf-865"
created: 2026-06-28
completed: ""
result: "failed"
---

# PERF-865: Fast ReusableThenable Implementation

## Focus Area
The `ReusableThenable` class in `packages/renderer/src/core/CaptureLoop.ts`. This utility is used extensively for synchronization between capture workers and the main writing thread in the actor model.

## Background Research
During execution, particularly in multi-worker scenarios, `ReusableThenable` instances are awaited and resolved millions of times. The current implementation of `resolve` and `reject` accesses `this.resolveCb` multiple times and assigns it back to `null` in a way that requires multiple property accesses:

```typescript
  resolve() {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb();
    }
  }
```

Microbenchmarks demonstrate that replacing this with a faster implementation that avoids redundant property lookups (by reading the property once into a local variable) provides a small but measurable speedup when executed in hot loops.

## Benchmark Configuration
- **Composition URL**: Any multi-worker rendering composition
- **Render Settings**: 30 FPS, dom mode
- **Metric**: Microbenchmark execution time / Wall-clock render time
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: N/A (micro-optimization)
- **Bottleneck analysis**: Redundant V8 object property accesses in a highly utilized utility class.

## Implementation Spec

### Step 1: Optimize `ReusableThenable` `resolve` and `reject`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Update the `resolve` and `reject` methods to read the callback into a local variable first, and only proceed if it exists.

```typescript
<<<<<<< SEARCH
  resolve() {
    if (this.resolveCb) {
      const cb = this.resolveCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb();
    }
  }

  reject(err: Error) {
    if (this.rejectCb) {
      const cb = this.rejectCb;
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
=======
  resolve() {
    const cb = this.resolveCb;
    if (cb) {
      this.resolveCb = null;
      this.rejectCb = null;
      cb();
    }
  }

  reject(err: Error) {
    const cb = this.rejectCb;
    if (cb) {
      this.resolveCb = null;
      this.rejectCb = null;
      cb(err);
    }
  }
>>>>>>> REPLACE
```

**Why**: This reduces the number of object property accesses, allowing V8 to optimize the method execution slightly better. Over millions of iterations, this shaves off a small amount of overhead.

**Risk**: Extremely low. The logic is functionally identical, just structured more efficiently.

## Correctness Check
Run the tests (`npm run test -w packages/renderer`) to ensure the changes are valid TypeScript and don't break functionality.
