---
id: PERF-168
slug: optimize-active-promise
status: unclaimed
claimed_by: ""
created: 2024-04-03
completed: ""
result: ""
---
# PERF-168: Optimize activePromise .catch allocation

#### 1. Context & Goal
Currently in packages/renderer/src/Renderer.ts, we push jobs onto the worker.activePromise pipeline. The explicit allocation of .catch(noopCatch) on every framePromise creates a secondary Promise solely to suppress UnhandledPromiseRejection warnings. Since framePromise is already stored in the framePromises array and will be explicitly awaited, any errors are correctly propagated to the outer captureLoop. The goal is to change the pipeline to use the two-argument .then(onFulfilled, onRejected), eliminating the secondary .catch Promise allocation per frame. This avoids V8 generator overhead and GC stalls.

#### 2. File Inventory
- packages/renderer/src/Renderer.ts

#### 3. Implementation Spec
**File**: packages/renderer/src/Renderer.ts
**What to change**:
Update the inner loop pipeline assignment:
Change:
```typescript
const framePromise = worker.activePromise.then(() => {
    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
});
worker.activePromise = framePromise.catch(noopCatch) as Promise<void>;
```
To:
```typescript
const framePromise = worker.activePromise.then(() => {
    worker.timeDriver.setTime(worker.page, compositionTimeInSeconds).catch(noopCatch);
    return worker.strategy.capture(worker.page, time);
});
worker.activePromise = framePromise.then(undefined, noopCatch) as Promise<void>;
```

#### 4. Test Plan
- Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts`
- Run `npx tsx packages/renderer/tests/fixtures/benchmark.ts`
