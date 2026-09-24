---
id: PERF-1051
slug: inline-chunk-bounds
status: complete
claimed_by: "PERF-1051"
created: 2026-07-19
completed: ""
result: "improved"
---

# PERF-1051: Inline loop bound evaluation for chunk end condition in CaptureLoop.ts

## Focus Area
The multi-worker DOM and Canvas chunking loops in `CaptureLoop.ts` (`isDomStrategyWriter` and `!isDomStrategyWriter` branches).

## Background Research
Currently, inside the multi-worker chunk dispatch logic (around line 613 and 678), the code dynamically evaluates `chunkEnd` via relational checks:
```typescript
              while (nextFrameToWrite < chunkEnd) {
                if (frameBufferRing[nextFrameToWrite & ringMask] === null) {
                  break;
                }
                // ...
                nextFrameToWrite++;
              }
              if (nextFrameToWrite < chunkEnd) {
```

Because `nextFrameToWrite` increments by exactly 1 in the inner loop and naturally stops exactly at `chunkEnd` (or breaks early if a buffer is missing), replacing the relational boundary checks (`<`) with strict equality (`!==`) provides mathematically identical logic while allowing the V8 TurboFan compiler to skip relational floating-point evaluation in favor of strict identity checks. Previous experiments (PERF-911, PERF-937, PERF-1050) successfully demonstrated that using strict equality for naturally bounded loop headers in V8 reduces parser branching complexity and yields measurable microbenchmark improvements.

Since `nextFrameToWrite` only increments and is explicitly bounded by `chunkEnd = Math.min(..., totalFrames)`, the relational check `<` is functionally equivalent to `!==`.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark composition.
- **Render Settings**: High FPS / high frame count to maximize loop iteration testing.
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time / loop execution speed.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Current estimated render time**: Baseline from previous runs.
- **Bottleneck analysis**: Micro-optimizing dynamic bounds evaluations in Node.js/V8 inside tight hot paths.

## Implementation Spec

### Step 1: Replace `<` with `!==` in `isDomStrategyWriter` writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `isDomStrategyWriter` path (around line 613 and 630):
```typescript
              while (nextFrameToWrite !== chunkEnd) {
```
(Changing `while (nextFrameToWrite < chunkEnd) {`)

```typescript
              if (nextFrameToWrite !== chunkEnd) {
```
(Changing `if (nextFrameToWrite < chunkEnd) {`)

### Step 2: Replace `<` with `!==` in `!isDomStrategyWriter` writer loop
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `!isDomStrategyWriter` path (around line 678 and 695):
```typescript
              while (nextFrameToWrite !== chunkEnd) {
```
(Changing `while (nextFrameToWrite < chunkEnd) {`)

```typescript
              if (nextFrameToWrite !== chunkEnd) {
```
(Changing `if (nextFrameToWrite < chunkEnd) {`)

**Why**: By replacing the relational check with strict identity, V8 can bypass relational numeric branching checks in the inner loop headers and conditional blocks, reducing dynamic parser instructions.
**Risk**: Negligible. `nextFrameToWrite` increments by exactly 1 and starts `<= chunkEnd`, meaning it will always hit exactly `chunkEnd` if it doesn't break early.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx tests/canvas-smoke.ts` (or similar) to verify Canvas path still works.

## Correctness Check
Verify DOM outputs using a standard render test.

## Prior Art
PERF-1050, PERF-911, and PERF-937 successfully replaced relational boundary checks with strict equality checks in `CaptureLoop.ts`.
