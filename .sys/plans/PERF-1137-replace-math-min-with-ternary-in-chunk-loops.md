---
id: PERF-1137
slug: replace-math-min-with-ternary-in-chunk-loops
status: complete
claimed_by: "executor"
created: 2024-10-25
completed: "2024-10-25"
result: "improved"
---

# PERF-1137: Replace Math.min with Ternary in Chunk Boundary Evaluations

## Focus Area
`CaptureLoop.ts` single-worker and multi-worker paths. Target: `const chunkEnd = Math.min(...)` built-in math execution overhead inside tight loops.

## Background Research
The V8 JavaScript engine incurs a small but measurable function call and built-in object overhead when using `Math.min()` inside extremely tight inner loops. In the renderer's `CaptureLoop.ts`, the boundaries of chunk loops are evaluated on every pass using `Math.min(nextProgress, loopEnd)` or `Math.min(nextProgress, totalFrames)`.
By explicitly unrolling this into a ternary operator (e.g. `const chunkEnd = nextProgress < loopEnd ? nextProgress : loopEnd;`), V8 handles it as a direct branch instruction, bypassing Math built-in execution entirely. In isolated node microbenchmarks, this approach yields nearly a 50% speedup for simple boundary evaluations in high-iteration loops. We are hypothesizing that replacing it across single and multi-worker loops will yield a marginally faster chunk generation.

## Benchmark Configuration
- **Composition URL**: Standard benchmark composition
- **Render Settings**: 1080p, 60fps
- **Mode**: dom
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.647s
- **Bottleneck analysis**: Micro-optimization of tight chunk evaluation loops during fast DOM and Canvas frame paths.

## Implementation Spec

### Step 1: Replace Math.min in Single-Worker DOM Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `isDomStrategy` chunk loop (around line 235), replace:
```typescript
const chunkEnd = Math.min(nextProgress, loopEnd);
```
With:
```typescript
const chunkEnd = nextProgress < loopEnd ? nextProgress : loopEnd;
```
**Why**: Avoids function boundary overhead.
**Risk**: No risk; structurally equivalent.

### Step 2: Replace Math.min in Single-Worker Canvas Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker `!isDomStrategy` chunk loop (around line 273), replace:
```typescript
const chunkEnd = Math.min(nextProgress, loopEnd);
```
With:
```typescript
const chunkEnd = nextProgress < loopEnd ? nextProgress : loopEnd;
```
**Why**: Same optimization for the Canvas path.

### Step 3: Replace Math.min in Multi-Worker Writer Chunk Loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the multi-worker writer chunk generation loop (around line 508), replace:
```typescript
const chunkEnd = Math.min(nextProgress, totalFrames);
```
With:
```typescript
const chunkEnd = nextProgress < totalFrames ? nextProgress : totalFrames;
```
**Why**: Same optimization for the concurrent writer logic.

## Canvas Smoke Test
Run canvas benchmark to verify it doesn't break basic non-DOM rendering execution.

## Correctness Check
Run the DOM render. The result should look identical and the progress interval ticks should remain precisely as they were, since logic equivalence is 100%.
