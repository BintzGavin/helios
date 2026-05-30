---
id: PERF-623
slug: optimize-dom-strategy-begin-frame
status: complete
claimed_by: "executor-session"
created: 2024-05-30
completed: "2026-05-30"
result: failed
---

# PERF-623: Optimize HeadlessExperimental.beginFrame calls in DomStrategy

## Focus Area
DOM Rendering Pipeline - Hot Loop in `packages/renderer/src/strategies/DomStrategy.ts`.

## Background Research
In the `capture()` method of `DomStrategy.ts`, we currently use `await this.cdpSession!.send('HeadlessExperimental.beginFrame', ...)` wrapped in an inline `try/catch`.

If we remove the `await` keyword and the `try/catch` block, and instead return the Promise chain directly, we can avoid the microtask overhead associated with the `async/await` state machine within the V8 engine for this hot path. We can use `.then(onFulfilled, onRejected)` to handle the result and any errors. This avoids creating a `.catch()` Promise allocation.

## Benchmark Configuration
- **Composition URL**: DOM benchmark (`examples/dom-benchmark/output/example-build/composition.html`)
- **Render Settings**: Standard microVM constraints.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.317s
- **Bottleneck analysis**: Microtask and branching overhead in the `DomStrategy.capture()` hot loop.

## Implementation Spec

### Step 1: Optimize target element `beginFrame`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture`, change the block for `targetElementHandle`:
```typescript
      this.targetBeginFrameParams.screenshot.clip.height = box.height;

      return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
        .then(
          result => {
            if (result.screenshotData) {
              this.lastFrameData = result.screenshotData;
            }
            return this.lastFrameData!;
          },
          () => this.lastFrameData!
        );
```

### Step 2: Optimize default `beginFrame`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture`, change the fallback block:
```typescript
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(
        result => {
          if (result.screenshotData) {
            this.lastFrameData = result.screenshotData;
          }
          return this.lastFrameData!;
        },
        () => this.lastFrameData!
      );
```

### Step 3: Remove `async` from `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Change the signature of `capture` to return `Promise<Buffer | string>` without the `async` keyword:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
```
Also change the return when `!box` to return a Promise:
```typescript
      if (!box) {
         return Promise.resolve(this.lastFrameData!);
      }
```
And since we use `await this.targetElementHandle.boundingBox()` we need to refactor it to a `.then`:
```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    if (this.targetElementHandle) {
      return this.targetElementHandle.boundingBox().then((box: any) => {
        if (!box) {
           return this.lastFrameData!;
        }

        this.targetBeginFrameParams.screenshot.clip.x = box.x;
        this.targetBeginFrameParams.screenshot.clip.y = box.y;
        this.targetBeginFrameParams.screenshot.clip.width = box.width;
        this.targetBeginFrameParams.screenshot.clip.height = box.height;

        return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.targetBeginFrameParams)
          .then(
            result => {
              if (result.screenshotData) {
                this.lastFrameData = result.screenshotData;
              }
              return this.lastFrameData!;
            },
            () => this.lastFrameData!
          );
      });
    }

    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(
        result => {
          if (result.screenshotData) {
            this.lastFrameData = result.screenshotData;
          }
          return this.lastFrameData!;
        },
        () => this.lastFrameData!
      );
  }
```

**Why**: By returning the Promise chain directly without `async`/`await`, we avoid the state machine overhead, reducing closure allocations and microtask ticks. Using a two-argument `.then()` avoids an extra `.catch()` allocation.
**Risk**: Very low, just a change in Promise mechanics.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-orchestrator-plan.ts` to ensure basic logic isn't broken.

## Correctness Check
Verify output via `npx tsx packages/renderer/scripts/benchmark-perf.ts`.

## Results Summary
- **Best render time**: 2.632s (vs baseline ~1.317s)
- **Improvement**: Regressed by ~100%
- **Kept experiments**: []
- **Discarded experiments**: [Step 1, Step 2, Step 3]
