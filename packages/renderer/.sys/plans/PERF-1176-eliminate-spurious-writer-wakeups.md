---
id: PERF-1176
slug: eliminate-spurious-writer-wakeups
status: complete
claimed_by: jules
---
# PERF-1176: Eliminate spurious writer wakeups in `CaptureLoop.ts` by conditionally resolving `writerWaiterPromise`

## Focus Area
The multi-worker loop in `CaptureLoop.ts` delegates tasks to workers and coordinates results via `frameBufferRing`. When a worker completes capturing a frame (at index `i`), it unconditionally calls `writerWaiterPromise.resolve()` to notify the synchronous writer loop that a frame is ready.

## Background Research
Currently, workers invoke `writerWaiterPromise.resolve()` on every completed frame, regardless of whether the writer loop is actually blocked waiting for that specific frame. If frames complete out of order (e.g., Worker 2 finishes frame 2 while Worker 1 is still working on frame 1), Worker 2 will trigger a wakeup. However, the writer is strictly ordered and is only waiting for frame 1 (`nextFrameToWrite = 1`).
1. If the writer is sleeping, waking it up for frame 2 is a "spurious wakeup" — the writer will check frame 1, see it is still null, and immediately go back to sleep, wasting CPU cycles and adding microtask overhead.
2. If the writer is not sleeping (e.g. processing backpressure), the `resolve()` call is unnecessary overhead.
3. The writer only ever sleeps when it explicitly awaits `writerWaiterPromise` because `frameBufferRing[nextFrameToWrite]` is null.

Therefore, a worker only needs to signal the writer if the frame it just completed is exactly the frame the writer is waiting for (i.e., `i === nextFrameToWrite`).

By changing the unconditional `writerWaiterPromise.resolve();` to `if (i === nextFrameToWrite) writerWaiterPromise.resolve();`, we eliminate spurious wakeups and avoid unnecessary function calls in the hot capture loop path.

## Implementation Spec

### Step 1: Optimize DOM worker path in `runWorker`
**File:** `packages/renderer/src/core/CaptureLoop.ts`
**Change:**
```typescript
<<<<<<< SEARCH
                const rawResult = await strategy.capture(page, i * timeStep);
                frameBufferRing[i & ringMask] = rawResult as string;
                writerWaiterPromise.resolve();
=======
                const rawResult = await strategy.capture(page, i * timeStep);
                frameBufferRing[i & ringMask] = rawResult as string;
                if (i === nextFrameToWrite) writerWaiterPromise.resolve();
>>>>>>> REPLACE
```

### Step 2: Optimize Canvas worker path in `runWorker`
**File:** `packages/renderer/src/core/CaptureLoop.ts`
**Change:**
```typescript
<<<<<<< SEARCH
                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                if (timePromise) await timePromise;

                frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
                writerWaiterPromise.resolve();
=======
                const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
                if (timePromise) await timePromise;

                frameBufferRing[i & ringMask] = await strategy.capture(page, i * timeStep);
                if (i === nextFrameToWrite) writerWaiterPromise.resolve();
>>>>>>> REPLACE
```

### Step 3: Visual Verification
Run `sed -n` on the modified lines to ensure they have been written correctly.

### Step 4: Testing & Verification
- Compile code (`npm run build -w packages/renderer`)
- Run tests (`npm run test -w packages/renderer`) to ensure frame composition still works correctly and no deadlocks are introduced.
- Run macro-benchmark to measure performance impact (`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom`).
- Repeat benchmark at least 3 times and select median.

### Step 5: Pre-commit Steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

### Step 6: Submit
Submit via the platform's native submission tool.
