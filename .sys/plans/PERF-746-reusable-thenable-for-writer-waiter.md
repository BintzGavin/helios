---
id: PERF-746
slug: reusable-thenable-for-writer-waiter
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-746: Eliminate Promise Allocation in Writer Waiter Loop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - The synchronous `writer` wait loop in the Actor Model fast-path.

## Background Research
In the multi-worker Actor Model logic of `CaptureLoop.ts`, when a writer cannot proceed because the frame it needs is not ready, it waits by doing `await new Promise<void>(writerWaiterExecutor);`.
This allocates a `new Promise` and creates a closure allocation on the heap for the `resolve` callback, assigning it to `writerWaiterResolve`.

Previously, `PERF-742` successfully eliminated `new Promise` allocations in the hot loop of `CdpTimeDriver.ts` by using a custom `ReusableThenable` that duck-types as a standard Promise to `await` without creating new Javascript Promise objects and closures. This yielded significant performance improvements by removing tracking overhead per frame in the core headless rendering loop.

We can apply this exact same technique to the `writerWaiterExecutor` in `CaptureLoop.ts`.

## Benchmark Configuration
- **Composition URL**: `tests/fixtures/standard-dom.html` (or whatever the standard fixture is)
- **Render Settings**: 1920x1080, 60fps, 5 seconds
- **Mode**: `dom` (with multiple workers)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: Established dynamically by Executor
- **Bottleneck analysis**: Allocating new Promises on every write stall in the multi-worker Actor model loop causes heap growth, garbage collection, and microtask overhead.

## Implementation Spec

### Step 1: Create `ReusableThenable` inside CaptureLoop.ts
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
At the top level of the file (or outside the main class), add the `ReusableThenable` implementation similar to what was used in `CdpTimeDriver.ts`:

```typescript
class ReusableThenable {
  public resolveCb: (() => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;

  then(resolve: () => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
  }

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
}
```

### Step 2: Replace `writerWaiterResolve` with `ReusableThenable`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `else` block (multi-worker branch):
1. Remove `let writerWaiterResolve: (() => void) | null = null;`
2. Remove `const writerWaiterExecutor = (resolve: () => void) => { writerWaiterResolve = resolve; };`
3. Add `const writerWaiterPromise = new ReusableThenable();`

Then, in all places where `writerWaiterResolve` is checked and invoked (e.g., in `checkState` and `runWorker`), replace:
```typescript
if (writerWaiterResolve) {
    const res = writerWaiterResolve;
    writerWaiterResolve = null;
    res();
}
```
with:
```typescript
writerWaiterPromise.resolve();
```
(The internal `resolve()` method of `ReusableThenable` already checks if a resolve callback exists and clears it).

Finally, in the writer loop, replace:
```typescript
await new Promise<void>(writerWaiterExecutor);
```
with:
```typescript
await writerWaiterPromise;
```

**Why**: By using a single `ReusableThenable` object across the entire render, we completely eliminate the allocation of `new Promise` objects and the closure allocations for the `executor` function every time the writer needs to wait. This reduces garbage collection pressure and speeds up microtask resolution.

**Risk**: If `await writerWaiterPromise` is called when it is *already* awaiting, the `resolveCb` will be overwritten. However, because the writer loop is a single sequential loop, it will only ever `await writerWaiterPromise` once at a time. The next iteration of the loop cannot begin until the current `await` resolves, guaranteeing safety.

## Correctness Check
- Run the standard test suite to ensure the multi-worker path correctly stalls and resumes without deadlocking or dropping frames.

## Prior Art
- PERF-742 successfully eliminated Promise allocation in CdpTimeDriver using this exact technique.
- Earlier experiments (e.g., PERF-680) attempted to inline the promise executor here, but failed because V8 prefers static references to closures. The `ReusableThenable` bypasses the executor entirely.
