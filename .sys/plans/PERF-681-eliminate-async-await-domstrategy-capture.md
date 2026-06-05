---
id: PERF-681
slug: eliminate-async-await-domstrategy-capture
status: complete
claimed_by: ""
created: 2024-11-20
completed: ""
result: "discard"
---

# PERF-681: Eliminate Async/Await Overhead in DomStrategy.capture()

## Focus Area
`packages/renderer/src/strategies/DomStrategy.ts`, specifically the `capture` method, which is the hot path for DOM rendering.

## Background Research
Currently, the `capture` method in `DomStrategy.ts` is an `async` function that `await`s the CDP `HeadlessExperimental.beginFrame` command. Inside the hot loop of `CaptureLoop.ts`, this generator and microtask scheduling overhead is incurred on every frame.
In `PERF-132`, an attempt was made to eliminate this overhead by manually returning the `Promise` chain, but the attempt was inconclusive (0% improvement), leaving the codebase with an `async` generator. Since V8 engines have heavily optimized direct Promise chaining versus async/await state machines in hot loops, we should implement a clean pre-bound direct promise return strategy, similar to the pre-bound property strategy explored in `PERF-172` (though not present in the current branch code).

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html` (or standard DOM benchmark)
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.447s (based on recent bests)
- **Bottleneck analysis**: IPC latency and promise generator allocation overhead in the `DomStrategy.capture` hot loop. By stripping `async`/`await` and returning the `.then()` chain directly, we reduce V8 context switching per frame.

## Implementation Spec

### Step 1: Pre-bind the Result Handler
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Add a pre-bound instance property to handle the CDP response, avoiding inline closure allocation on every frame:

```typescript
  private handleCaptureResult = (result: any): Buffer | string => {
    const data = result.screenshotData;
    if (data) {
      this.lastFrameData = data;
      return data;
    }
    return this.lastFrameData!;
  };

  private handleCaptureError = (e: any): Buffer | string => {
    return this.lastFrameData!;
  };
```

### Step 2: Refactor `capture` to return Promises directly
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Remove the `async` keyword and the `try/catch` block from the `capture` method. Return the promise chain directly:

```typescript
  capture(page: Page, frameTime: number): Promise<Buffer | string> {
    return this.cdpSession!.send('HeadlessExperimental.beginFrame', this.beginFrameParams)
      .then(this.handleCaptureResult)
      .catch(this.handleCaptureError);
  }
```

**Why**: By returning the promise directly and using pre-bound prototype/instance methods for `.then` and `.catch`, we eliminate the `async` generator state machine overhead and inline closure allocation per frame.
**Risk**: Very low. The behavior is logically identical, only the V8 execution mechanics change.

## Variations
None.

## Canvas Smoke Test
Not applicable (this only affects DOM Strategy).

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify DOM rendering succeeds and outputs valid frames.

## Prior Art
- PERF-132 (Inconclusive prior attempt to manually return promises)
- PERF-172 (Eliminate Closure Allocation via pre-bound handlers)


## Result
Discarded. The performance regression was substantial (~27.6s vs ~2.4s). Removing the async/await generator forced V8 to construct full closure continuation states, performing worse than standard await suspension in this loop.
