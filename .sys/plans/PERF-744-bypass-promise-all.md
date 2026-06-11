---
id: PERF-744
slug: bypass-promise-all
status: unclaimed
claimed_by: ""
created: 2024-06-12
completed: ""
result: ""
---

# PERF-744: Bypass Promise.all in SeekTimeDriver

## Focus Area
`SeekTimeDriver.setTime` multi-frame path where `Runtime.callFunctionOn` is called for multiple execution context IDs.

## Background Research
Currently, when there are multiple execution contexts (e.g., iframes), `SeekTimeDriver` creates an inline `async` loop that uses `await` sequentially for every CDP call:
```typescript
    const promisesLoop = async () => {
      for (let i = 0; i < this.executionContextIds.length; i++) {
        await this.cdpSession!.send('Runtime.callFunctionOn', this.multiFrameCallParams[i]);
      }
    };
    return promisesLoop();
```
While this removes `Promise.all` overhead, the sequential `await` means that the second frame waits for the first frame's CDP command to finish before *sending* the second frame's command. CDP allows pipelining. If we send them all synchronously and then await them, it would be much faster, but native `Promise.all` adds overhead.

Instead of `Promise.all` or sequential `await`, we can allocate a lightweight custom aggregator class (`ReusableAggregator`) which resolves only after N `.then()` callbacks fire. This allows us to dispatch all CDP commands synchronously (giving maximum pipeline concurrency) and then await a single custom `Thenable` without any array iteration overhead.

## Benchmark Configuration
- **Composition URL**: Standard `dom-heavy` benchmark
- **Render Settings**: 1920x1080, 60 FPS, 10 seconds (600 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Sequential await for multi-frame contexts stalls the Node.js event loop unnecessarily waiting for Chromium IPC.

## Implementation Spec

### Step 1: Create a ReusableAggregator class
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. At the top of the file, define:
```typescript
class ReusableAggregator {
  public resolveCb: (() => void) | null = null;
  public rejectCb: ((err: Error) => void) | null = null;
  public target: number = 0;
  public count: number = 0;

  then(resolve: () => void, reject: (err: Error) => void) {
    this.resolveCb = resolve;
    this.rejectCb = reject;
    this.check();
  }

  check() {
    if (this.count >= this.target && this.resolveCb) {
        const cb = this.resolveCb;
        this.resolveCb = null;
        this.rejectCb = null;
        cb();
    }
  }

  tick = () => {
      this.count++;
      this.check();
  };

  fail = (err: Error) => {
    if (this.rejectCb) {
        const cb = this.rejectCb;
        this.resolveCb = null;
        this.rejectCb = null;
        cb(err);
    }
  };
}
```

### Step 2: Use ReusableAggregator in `setTime`
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
1. Add `private aggregator = new ReusableAggregator();` to `SeekTimeDriver`.
2. In `setTime`, replace the sequential `promisesLoop` with parallel dispatched calls bound to the aggregator:
```typescript
    this.aggregator.count = 0;
    this.aggregator.target = this.executionContextIds.length;

    for (let i = 0; i < this.executionContextIds.length; i++) {
        this.cdpSession!.send('Runtime.callFunctionOn', this.multiFrameCallParams[i])
            .then(this.aggregator.tick)
            .catch(this.aggregator.fail);
    }
    return this.aggregator as any as Promise<void>;
```

**Why**: Provides the concurrent CDP pipeline benefits of `Promise.all` while avoiding native JS engine array iteration and internal sequence tracking overhead.

## Correctness Check
Run the DOM smoke tests to ensure multi-frame functionality still works.
