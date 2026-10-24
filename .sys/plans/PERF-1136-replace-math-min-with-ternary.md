---
id: PERF-1136
slug: replace-math-min-with-ternary
status: unclaimed
claimed_by: ""
created: 2024-10-24
completed: ""
result: ""
---

# PERF-1136: Replace Math.min with Ternary in Single and Multi-Worker Loops

## Focus Area
`CaptureLoop.ts` single-worker and multi-worker chunk loops.
Specifically, where `const chunkEnd = Math.min(nextProgress, loopEnd);` and `const chunkEnd = Math.min(nextProgress, totalFrames);` are used.

## Background Research
The `Math.min` function introduces a function call overhead inside the primary rendering chunk loops. Replacing this standard math method with an equivalent native ternary conditional statement (e.g., `const chunkEnd = nextProgress < limit ? nextProgress : limit;`) avoids the function boundary entirely. V8 handles ternary operations directly as simple branch instructions which can further reduce AST footprint and improve inline JIT execution. Previous plans (like PERF-921) have successfully applied this optimization in other parts of the codebase.

## Benchmark Configuration
- **Composition URL**: Benchmark composition
- **Render Settings**: 1080p, 60fps
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Micro-optimization of tight chunk evaluation loops.

## Implementation Spec

### Step 1: Replace Math.min in Single-Worker Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker fast path, locate the two instances (inside `if (isDomStrategy)` and `else`) where `chunkEnd` is calculated:
```typescript
const chunkEnd = Math.min(nextProgress, loopEnd);
```
Replace them with:
```typescript
const chunkEnd = nextProgress < loopEnd ? nextProgress : loopEnd;
```

### Step 2: Replace Math.min in Multi-Worker Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker loop, locate the instance where `chunkEnd` is calculated (around line 508):
```typescript
const chunkEnd = Math.min(nextProgress, totalFrames);
```
Replace it with:
```typescript
const chunkEnd = nextProgress < totalFrames ? nextProgress : totalFrames;
```

**Why**: Removes function call overhead of `Math.min` in favor of a fast native branch instruction.
**Risk**: Negligible. Functional equivalence is guaranteed.

## Canvas Smoke Test
Run a canvas mode render to verify correctness in the non-DOM path.

## Correctness Check
Run the DOM render to verify that frame counts match exactly and progress reporting is unaffected.
