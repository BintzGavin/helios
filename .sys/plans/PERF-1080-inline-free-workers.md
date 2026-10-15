---
id: PERF-1080
slug: inline-free-workers
status: unclaimed
claimed_by: ""
created: 2024-10-15
completed: ""
result: ""
---

# PERF-1080: Inline freeWorkers array lookups in multi-worker dispatcher loops

## Focus Area
Multi-worker dispatcher loops in `packages/renderer/src/core/CaptureLoop.ts`.

## Background Research
In the multi-worker fast paths (`isDomStrategyWriter` and `!isDomStrategyWriter`), the chunk loops use a temporary local variable assignment for `w`:
```typescript
const w = freeWorkers[h];
frameBufferRing[n & ringMask] = null;
workerThenables[w].resolve(n);
```
By inlining the `freeWorkers` array lookup directly into the `workerThenables` access, we can eliminate the intermediate variable assignment (`const w = ...`), slightly reducing AST complexity and lowering closure memory footprint in tight loop execution. V8 handles chained array indexing efficiently.

## Benchmark Configuration
- **Composition URL**: Any standard composition
- **Render Settings**: Standard multi-worker settings
- **Mode**: `dom` and `canvas`
- **Metric**: Execution speed in microbenchmarks / Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary intermediate variable assignment in the most frequently executed chunk loop.

## Implementation Spec

### Step 1: Inline the lookup in initial chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the initial frame dispatch loop (around line 454), locate:
```typescript
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
```
Change to:
```typescript
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[freeWorkers[h]].resolve(n);
```

### Step 2: Inline the lookup in DOM strategy chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` chunk loop (around line 581), locate:
```typescript
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
```
Change to:
```typescript
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[freeWorkers[h]].resolve(n);
```

### Step 3: Inline the lookup in non-DOM strategy chunk loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!isDomStrategyWriter` chunk loop (around line 651), locate:
```typescript
                      const w = freeWorkers[h];
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[w].resolve(n);
```
Change to:
```typescript
                      frameBufferRing[n & ringMask] = null;
                      workerThenables[freeWorkers[h]].resolve(n);
```

**Why**: Removes intermediate variable assignment overhead from hot loops, optimizing AST and closure scope access patterns for V8's TurboFan compiler.
**Risk**: Minimal, functionality remains completely identical.

## Variations
None.

## Canvas Smoke Test
Run `node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure changes don't break canvas processing limits.

## Correctness Check
Run renderer to ensure frame limits aren't violated and dispatch works correctly.
