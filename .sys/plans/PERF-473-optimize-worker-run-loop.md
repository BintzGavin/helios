---
id: PERF-473
slug: optimize-worker-run-loop
status: complete
claimed_by: "executor-session"
created: 2026-05-11
completed: ""
result: failed
---

# PERF-473: Optimize runWorker Loop by Removing Async Await

## Focus Area
`CaptureLoop.ts` in `@helios-project/renderer` package. Specifically, the `runWorker` loop.

## Background Research
The `CaptureLoop` implements a multi-worker actor model to capture frames concurrently across `poolLen` workers. The `runWorker` function runs continuously, using `await new Promise<number>(workerBlockedExecutors[workerIndex])` to wait for a frame index `i` if `nextFrameToSubmit - nextFrameToWrite >= maxPipelineDepth`. It then executes `await timeDriver.setTime` and `await strategy.capture`.

Currently, `runWorker` is an `async` function containing a `while (!aborted)` loop. `async` functions are implemented via state machines in V8, and the continuous yielding and awaiting in the hot loop per frame can add micro-stalls to execution.

We can re-implement the worker execution flow to use direct Promise chaining (`.then()`) combined with recursion instead of an `async` while loop. This technique, eliminating async generators in hot paths, avoids allocating V8 promise state machines and can potentially reduce garbage collection overhead and execution stalls.

Converting this to a recursive `.then()` chain is a known pattern for optimizing hot asynchronous loops in Node.js.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 600x600, 30fps, mode: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.13s (from PERF-470)
- **Bottleneck analysis**: Micro-stalls from V8 async state machine overhead in the `runWorker` execution path.

## Implementation Spec

### Step 1: Replace async runWorker with recursive promise chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Rewrite `runWorker` as a function that returns a Promise, and define an inner recursive function `loop` that returns a Promise.
Use `.then()` instead of `await` for the blocking promise, the `timeDriver.setTime` call, and the `strategy.capture` call.

**Why**: Direct `.then()` chaining is often faster than the equivalent `async`/`await` state machine in highly intensive Node.js I/O loops.
**Risk**: If the promise chain grows too deep, it could cause call stack limits or memory accumulation. However, since Promises resolve asynchronously in the microtask queue, the call stack is reset on every `.then()` tick, preventing stack overflows.

## Variations
### Variation A: Sync Promise Bypass
Check if `timeDriver.setTime` or `strategy.capture` return non-promises (or instantly resolved values) and bypass `.then()` allocation by calling the next step synchronously.

## Verification
Run `npm test` in the `packages/renderer` directory to ensure test suites pass, verifying that the new implementation is logically equivalent and doesn't introduce bugs.
Run the benchmark script to compare performance. Ensure to use the current working format for FFmpeg (png or jpeg) if webp causes crashes during the benchmark as noted in `RENDERER-EXPERIMENTS.md`.

## Results Summary
- **Best render time**: 2.719s (vs baseline 2.689s)
- **Improvement**: -1%
- **Kept experiments**: None
- **Discarded experiments**: Replaced async runWorker with recursive promise chain
