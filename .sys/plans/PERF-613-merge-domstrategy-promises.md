---
id: PERF-613
slug: merge-domstrategy-promises
status: unclaimed
claimed_by: ""
created: 2024-05-29
completed: ""
result: ""
---

# PERF-613: Merge Promise Catch Handlers in DomStrategy

## Focus Area
DOM Rendering Pipeline - Promise allocations in `packages/renderer/src/strategies/DomStrategy.ts` hot loop.

## Background Research
In V8, chaining `.then().catch()` creates two intermediate Promises because `.catch()` allocates a new Promise and schedules a new microtask. In `DomStrategy.ts`, the `capture` loop previously did this:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(result => {
        // ...
      })
      .catch(e => {
        return this.lastFrameData!;
      });
```
By merging the `catch` block as the second parameter (the `onRejected` handler) into the previous `.then()`, we save allocating the trailing Promise while preserving exact semantics since the `onFulfilled` logic cannot throw.

Although PERF-608 previously explored this and was discarded due to inconclusive results (only a 0.4% improvement on the older baseline), the baseline has since improved significantly due to the integration of PERF-610 and PERF-612. At the new baseline of ~1.339s, eliminating this per-frame promise allocation may yield a more measurable and reliable performance improvement.

## Benchmark Configuration
- **Composition URL**: Extract exact standard settings from a previous successful `.sys/plans/PERF-*.md` file during execution.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.339s (from RENDERER-EXPERIMENTS.md current best)
- **Bottleneck analysis**: Microtask and Promise allocation overhead in the `capture` hot loop.

## Implementation Spec

### Step 1: Merge Catch in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture` method, rewrite the `.then().catch()` chains to merge the `.catch()` block into the preceding `.then()` as its second argument (`.then(onFulfilled, onRejected)`).

For example, replace:
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
with:
```typescript
        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
          .then(
            result => {
              if (result.screenshotData) {
                this.lastFrameData = result.screenshotData;
              }
              return this.lastFrameData!;
            },
            e => {
              return this.lastFrameData!;
            }
          );
```

Ensure this is done for both branches in the `capture` method (the `this.targetElementHandle` branch and the default branch).

**Why**: Eliminates the allocation of the final `.catch()` Promise on every frame capture, reducing V8 GC pressure.

## Correctness Check
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts` to verify the rendering still succeeds.
