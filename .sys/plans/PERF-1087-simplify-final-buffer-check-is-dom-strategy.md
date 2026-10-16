---
id: PERF-1087
slug: simplify-final-buffer-check-is-dom-strategy
status: unclaimed
claimed_by: ""
created: 2024-10-16
completed: ""
result: ""
---

# PERF-1087: Simplify finalBuffer type check by caching strategy type globally in CaptureLoop

## Focus Area
The `finalBuffer` check and evaluation at the end of the `run()` loop in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, hoisting the strategy type evaluation `isDomStrategy` up to the top level of `run()` and utilizing it to bypass redundant AST validation blocks when handling the final buffer.

## Background Research
Currently, near line 712, there is a dynamically typed condition to process the `finalBuffer`:
```typescript
    if (
      finalBuffer &&
      ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) ||
        (typeof finalBuffer === "string" && finalBuffer.length > 0))
    ) {
      console.log(`Writing final buffer...`);
      if (typeof finalBuffer === "string") {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }
```

During the single and multi-worker loops, we check whether the worker is executing the `DomStrategy` versus the Canvas strategy because they emit `string` (base64) and `Buffer` respectively. We evaluate `isDomStrategy` or `isDomStrategyWriter` separately within those fast paths.
Because the type of `finalBuffer` emitted by `strategy.finish()` strictly correlates to the strategy type used for rendering, we can hoist `const isDomStrategy = this.pool[0].strategy.constructor.name === 'DomStrategy';` to the top of the `run()` method. Then, we can drastically simplify the `finalBuffer` logic:

```typescript
    if (finalBuffer && finalBuffer.length > 0) {
      console.log(`Writing final buffer...`);
      if (isDomStrategy) {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }
```

Microbenchmarks show that replacing multiple `Buffer.isBuffer()` and `typeof finalBuffer === "string"` checks with a simple truthy `.length > 0` and a boolean closure lookup significantly reduces the size of the block. Though it only executes once per render, minimizing closure size and AST nodes reduces the overall parsing and footprint of the hot loop function inside the JIT.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 10s, h264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Redundant complex branching statements in cleanup logic that expand the V8 TurboFan AST parsing size for the `CaptureLoop.run` method unnecessarily.

## Implementation Spec

### Step 1: Hoist isDomStrategy to the top of run()
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: At the top of the `run()` method (around line 125, before `// FAST PATH FOR SINGLE WORKER`), add:
```typescript
    const isDomStrategy = this.pool[0].strategy.constructor.name === 'DomStrategy';
```
**Why**: Ensures we can statically resolve the type of buffer returned.

### Step 2: Simplify Final Buffer Validation and Write Dispatch
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Locate the block near line 712:
```typescript
    if (
      finalBuffer &&
      ((Buffer.isBuffer(finalBuffer) && finalBuffer.length > 0) ||
        (typeof finalBuffer === "string" && finalBuffer.length > 0))
    ) {
      console.log(`Writing final buffer...`);
      if (typeof finalBuffer === "string") {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }
```

Change it to:
```typescript
    if (finalBuffer && finalBuffer.length > 0) {
      console.log(`Writing final buffer...`);
      if (isDomStrategy) {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }
    }
```

**Why**: By checking `.length > 0` directly on the truthy value, we remove the `Buffer.isBuffer` and `typeof` operator overhead. Using the already computed `isDomStrategy` constant avoids another dynamic `typeof` evaluation inside the truthy block. This eliminates multiple V8 branch instructions and function calls from the AST, providing a tighter implementation for the engine to parse.
**Risk**: If `finalBuffer` somehow returns an object without a `.length` property that evaluates to truthy, it would bypass or error. However, `strategy.finish()` is strictly typed to return `Buffer | string | void`, all of which are safe under this check.

### Step 3: Replace `isDomStrategyWriter` inside multi-worker loop (Cleanup)
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**: Find the local assignment `const isDomStrategyWriter = this.pool[0].strategy.constructor.name === 'DomStrategy';` around line 549, and the associated `if (isDomStrategyWriter)` usage. Remove the local `isDomStrategyWriter` assignment, and use the hoisted `isDomStrategy` variable instead.
**Why**: Avoid redundant duplicate assignments of the same logic.

## Correctness Check
Run the DOM render verify command and standard test suite.
