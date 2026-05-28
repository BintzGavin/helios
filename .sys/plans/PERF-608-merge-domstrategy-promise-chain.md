---
id: PERF-608
slug: merge-domstrategy-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-05-28
completed: ""
result: ""
---

# PERF-608: Merge Promise Catch Handlers in DomStrategy

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/strategies/DomStrategy.ts` hot loop.

## Background Research
In V8, chaining `.then().catch()` creates two intermediate Promises because `.catch()` allocates a new Promise and schedules a new microtask. In `DomStrategy.ts`, the `capture` loop does exactly this:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
      .then(result => {
        if (result.screenshotData) {
          this.lastFrameData = result.screenshotData;
        }
        return this.lastFrameData!;
      })
      .catch(e => {
        return this.lastFrameData!;
      });
```
By merging the `catch` block as the second parameter (the `onRejected` handler) into the previous `.then()`, we save allocating the trailing Promise while preserving exact semantics since the `onFulfilled` logic cannot throw. Note: `PERF-591` previously tried to do this for both `CaptureLoop.ts` and `DomStrategy.ts` and was discarded. However, `PERF-606` later successfully applied this exact optimization to just `CaptureLoop.ts` and yielded an improvement. We will now apply this same isolated optimization to `DomStrategy.ts`.

## Baseline
- **Current estimated render time**: ~1.466s
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the `capture` hot loop.

## Implementation Spec

### Step 1: Merge Catch in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, rewrite the `.then().catch()` chain to merge the `.catch()` block into the preceding `.then()` as its second argument (`.then(onFulfilled, onRejected)`).
Do this for the `targetElementHandle` branch. Explore the rest of the `capture` method using `cat` or `sed` to find if there are other `.then().catch()` branches and merge them as well.

**Why**: Eliminates the allocation of the final `.catch()` Promise on every frame capture.

## Correctness Check
Run `npx tsx packages/renderer/tests/run-all.ts` to verify correctness and ensure no unhandled promise rejections occur.
