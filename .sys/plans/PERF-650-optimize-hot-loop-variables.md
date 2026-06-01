---
id: PERF-650
slug: optimize-hot-loop-variables
status: complete
claimed_by: ""
created: 2024-06-01
completed: ""
result: "keep"
---

# PERF-650: Optimize Hot Loop Variable Access and Getter Invocations in CaptureLoop

## Focus Area
`packages/renderer/src/core/CaptureLoop.ts` - Frame Capture Loop and Writer Loop.

## Background Research
The `CaptureLoop.ts` executes its worker and writer logic 60+ times per second per worker. Within these loops, several inefficiencies compound:
1. **Getter Invocations**: `this.ffmpegManager.stdin` is invoked multiple times per frame. `stdin` is a getter function on the `FFmpegManager` class, which adds unnecessary function invocation overhead to the hottest path.
2. **Modulo Arithmetic**: The progress check `currentFrame > 0 && currentFrame % progressInterval === 0` uses a modulo operator (`%`). Modulo is computationally expensive compared to a simple equality check.
3. **Instance Property Lookups**: Properties like `this.totalFrames`, `this.startFrame`, and `this.capturedErrors` are repeatedly accessed inside the `while` loops. Extracting these to local closure variables allows V8 to store them in CPU registers rather than repeatedly fetching them from the object instance.

## Benchmark Configuration
- **Composition URL**: `examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30 FPS, 5s duration (150 frames), mp4 libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~2.561s
- **Bottleneck analysis**: Getter function calls, integer division (modulo) arithmetic, and instance property fetches in the tightest rendering loop.

## Implementation Spec

### Step 1: Cache `stdin` Getter
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, before the `try { while (nextFrameToWrite < totalFrames ...) }` block, add:
```typescript
    const stdin = this.ffmpegManager.stdin;
```
Then, inside the writer loop, replace all instances of `this.ffmpegManager.stdin` with `stdin`.

### Step 2: Eliminate Modulo Arithmetic
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `run()` method, initialize a `nextProgressFrame` variable:
```typescript
    const progressInterval = Math.floor(totalFrames / 10);
    let nextProgressFrame = progressInterval;
```
Inside the writer loop, replace the progress check:
```typescript
<<<<<<< SEARCH
            const currentFrame = nextFrameToWrite;

            if (currentFrame > 0 && currentFrame % progressInterval === 0) {
                console.log(`Progress: Rendered ${currentFrame} / ${this.totalFrames} frames`);
            }

            if (onProgress) {
                onProgress(currentFrame / this.totalFrames);
            }
=======
            const currentFrame = nextFrameToWrite;

            if (currentFrame === nextProgressFrame) {
                console.log(`Progress: Rendered ${currentFrame} / ${totalFrames} frames`);
                nextProgressFrame += progressInterval;
            }

            if (onProgress) {
                onProgress(currentFrame / totalFrames);
            }
>>>>>>> REPLACE
```

### Step 3: Localize Instance Properties
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
At the top of the `run()` method, extract `totalFrames`, `startFrame`, and `capturedErrors`:
```typescript
    const totalFrames = this.totalFrames;
    const startFrame = this.startFrame;
    const capturedErrors = this.capturedErrors;
```
Replace all references to `this.totalFrames`, `this.startFrame`, and `this.capturedErrors` inside `runWorker`, `checkState`, and the writer loop with these local variables.
For example, `nextFrameToSubmit >= this.totalFrames` becomes `nextFrameToSubmit >= totalFrames`.

## Variations
None. This is a purely reductive bytecode optimization.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure stability.

## Correctness Check
Run the DOM render benchmark `npx tsx packages/renderer/scripts/benchmark-perf.ts` and verify output integrity.

## Prior Art
- PERF-641 (removed redundant string reassignment)
- PERF-648 (removed redundant microtask allocations)
