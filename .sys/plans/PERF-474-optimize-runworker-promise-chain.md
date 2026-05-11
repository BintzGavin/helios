---
id: PERF-474
slug: optimize-runworker-promise-chain
status: unclaimed
claimed_by: ""
created: 2024-05-18
completed: ""
result: ""
---

# PERF-474: Optimize runWorker Loop by Removing Async Await

## Focus Area
`CaptureLoop.ts` in `@helios-project/renderer` package. Specifically, the `runWorker` loop inside the multi-worker actor model.

## Background Research
The `CaptureLoop` implements a multi-worker actor model to capture frames concurrently across `poolLen` workers. The `runWorker` function runs continuously per worker, acting as the main pump for advancing virtual time and capturing frames via `strategy.capture`.

Currently, `runWorker` is an `async` function containing a `while (!aborted)` loop. Inside this loop, it dynamically `await`s on a blocking queue (`workerBlockedExecutors`), `timeDriver.setTime`, and `strategy.capture`.

Because `async` functions are implemented via state machines in V8, continuous yielding and awaiting in a tight hot loop (per frame) introduces micro-stalls to execution flow and increases garbage collection overhead compared to standard callback-based code or `.then()` chaining. We can re-implement the worker execution flow to use direct Promise chaining (`.then()`) combined with recursion instead of an `async` while loop, completely bypassing the V8 promise state machine overhead for async generator suspension.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition (`examples/dom-benchmark/composition.html`)
- **Render Settings**: 600x600, 30fps, 5 duration, mode: dom
- **Metric**: Wall-clock render time in seconds reported by the `render-dom.ts` scratchpad
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.13s
- **Bottleneck analysis**: Micro-stalls from V8 async state machine allocation and microtask queue suspension within the `runWorker` execution path.

## Implementation Spec

### Step 1: Replace async runWorker with recursive promise chain
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Rewrite `runWorker` to omit the `async` keyword and instead declare an internal recursive function `loop = () => { ... }` that returns a Promise.
Use direct `.then()` branching to handle the resolution of `workerBlockedExecutors[workerIndex]`. Inside the `.then` block, synchronously invoke `timeDriver.setTime` and `strategy.capture`, falling back to standard promise chaining where necessary. Ensure `loop()` is returned recursively at the end of resolution handlers to continue execution until `aborted` or all frames are processed.

**Why**: Direct `.then()` chaining is demonstrably faster than the equivalent `async`/`await` state machine in highly intensive Node.js asynchronous loops. By eliminating `await`, V8 avoids capturing the local stack context.
**Risk**: Improperly structured `.then` handlers might miss exceptions or lead to memory accumulation, but as long as exceptions are piped to `frameErrorRing` and the loop breaks correctly via return, it will be safe. The recursion won't overflow the stack because every iteration resets the call stack via the microtask queue.

## Variations
### Variation A: Bypassing Promise.resolve
Check if `timeDriver.setTime` or `strategy.capture` actually return Promises at runtime using `typeof ...then === 'function'`. If they execute synchronously, skip the `.then` queue insertion entirely for maximum speed.

## Verification Check
Run `npm test -w @helios-project/renderer` to ensure test suites pass, validating logical equivalence. Run the benchmark script to compare performance. Ensure that the test suite runs correctly by checking for regressions in DOM rendering output.
