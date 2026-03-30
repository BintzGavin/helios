---
id: PERF-085
slug: eliminate-hot-loop-allocations
status: complete
claimed_by: "executor-session"
created: 2024-05-24
completed: "2026-03-30"
result: "discarded"
---
# PERF-085: Eliminate Hot Loop Allocations

## Focus Area
Hot rendering path (`packages/renderer/src/Renderer.ts`, `DomStrategy.ts`, `SeekTimeDriver.ts`). We want to eliminate all remaining redundant array length lookups, math calculations, and object allocations inside the frame capture loop.

## Background Research
Profiling V8 garbage collection (GC) and micro-stalls shows that continuously allocating small objects (like parameter objects for Playwright IPC calls) and performing redundant array length lookups (`pool.length`) inside tight loops adds up over thousands of frames. While V8 is fast, explicitly hoisting constants and preallocating IPC parameter objects prevents the garbage collector from churning on short-lived objects.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition
- **Render Settings**: Same as baseline
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.696s (from PERF-083)
- **Bottleneck analysis**: Micro-stalls in the V8 execution loop due to redundant property lookups, math operations, and object allocations for CDP commands on every iteration.

## Implementation Spec

### Step 1: Hoist invariant calculations in Renderer
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Locate the outer `while (nextFrameToWrite < totalFrames)` loop in `Renderer.ts`. Move the definitions for the active pipeline depth (e.g., `const poolLen = pool.length;` and the variable multiplying it by 8) completely above and outside this outer loop. Also, right before the outer `while` loop, define two new constants for time steps (e.g., `timeStep` as `1000 / fps` and `compTimeStep` as `1 / fps`). Inside the inner pipeline-refill loop, replace the division by `fps` when calculating `time` and `compositionTimeInSeconds` with multiplication using these new precalculated constants.
**Why**: Avoid redundant arithmetic and property lookups inside the hot loop.
**Risk**: Negligible.

### Step 2: Preallocate CDP beginFrame parameters
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
Locate where the `HeadlessExperimental.beginFrame` CDP command is sent in the `DomStrategy` capture loop. This command typically takes an object literal containing screenshot parameters (e.g., `{ screenshot: ... }`). Instead of allocating this object on every frame, add a private class property to cache it. Set this property once during the strategy's preparation phase and reuse it in the capture loop for the standard rendering path.
**Why**: Eliminates creating a new object literal for every frame sent over IPC.
**Risk**: Low.

### Step 3: Preallocate CDP evaluate parameters
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Locate where the `Runtime.evaluate` CDP command is sent in the `SeekTimeDriver` time-setting logic. This command typically takes an object literal containing evaluation parameters (e.g., `{ expression: ..., awaitPromise: true, returnByValue: false }`). Instead of allocating this object on every frame, add a private class property to cache it. In the hot loop, just update its `expression` string property and pass the cached object to the CDP session.
**Why**: Eliminates creating a new parameter object for every single frame evaluation.
**Risk**: Low.

## Canvas Smoke Test
Run basic canvas render to ensure it does not break (since `Renderer.ts` logic is shared).

## Correctness Check
Run `npx tsx tests/verify-dom-selector.ts` and ensure DOM output is still correct.

## Results Summary
- **Best render time**: 36.684s (vs baseline 36.684s)
- **Improvement**: 0%
- **Kept experiments**: []
- **Discarded experiments**: [Already implemented]
