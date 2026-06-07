---
status: complete
claimed_by: "executor-session"
---

# PERF-703: Replace .then() chain with sequential awaits in CaptureLoop fast path

## 1. Description
Optimize the single-worker and multi-worker fast paths in `CaptureLoop.ts` by replacing the `setTimeResult ? await setTimeResult.then(() => strategy.capture(...)) : await strategy.capture(...)` ternary with sequential `if (setTimeResult) await setTimeResult; const buffer = await strategy.capture(...)`. This avoids allocating an anonymous closure and a chained Promise per frame, relying instead on V8's highly optimized async/await state machine.

## 2. Update `packages/renderer/src/core/CaptureLoop.ts`
Modify the frame capture sequence in both single-worker and multi-worker loops.

Replace:
```typescript
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                const buffer = setTimeResult
                    ? await setTimeResult.then(() => strategy.capture(page, time))
                    : await strategy.capture(page, time);
```

With:
```typescript
                const setTimeResult = timeDriver.setTime(page, compositionTimeInSeconds);
                if (setTimeResult) {
                    await setTimeResult;
                }
                const buffer = await strategy.capture(page, time);
```

Do this in both the `if (poolLen === 1)` block and the `runWorker` block.

## 3. Benchmark
Run the standard benchmark harness in `packages/renderer/`.
If render time improves, keep the changes. If not, revert.

## 4. Complete pre commit steps
Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

## 5. Submit
Once all tests pass, use the `submit` tool to submit the task.

## Results Summary
- **Best render time**: 2.566s (vs baseline 2.166s)
- **Improvement**: -18.4%
- **Kept experiments**: None
- **Discarded experiments**: Replace .then() chain with sequential awaits in CaptureLoop fast path
