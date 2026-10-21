---
id: PERF-1117
slug: merge-initial-frame-blocks
status: unclaimed
claimed_by: ""
created: 2024-10-21
completed: ""
result: ""
---

# PERF-1117: Merge Duplicate `totalFrames > 0` Checks

## Focus Area
The single-worker capture initialization in `packages/renderer/src/core/CaptureLoop.ts`. Specifically, merging the adjacent `if (totalFrames > 0)` blocks in both the `isDomStrategy` and Canvas paths.

## Background Research
In the single-worker capture loops of `CaptureLoop.ts`, the initial frame processing logic is split across two sequential `if (totalFrames > 0)` blocks for both the `isDomStrategy` path and the canvas path:

```typescript
        if (isDomStrategy) {
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
            if (timePromise) await timePromise;
            nextCapturePromise = domBeginFrame!(0);
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
              if (timePromise) await timePromise;
              nextCapturePromise = domBeginFrame!(timeStep);
            }
            // ... process rawResult and write to stream
          }
        } else {
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
            if (timePromise) await timePromise;
            nextCapturePromise = strategy.capture(page, 0);
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, timeStep);
            }
            // ... process rawResult and write to stream
          }
        }
```

Since both blocks share the exact same condition `if (totalFrames > 0)` and execute sequentially, they can be merged into a single block. This will reduce the V8 AST size, eliminate a redundant branch evaluation, and slightly improve the JIT parser's pipeline during the initialization phase, continuing the trend of removing dead AST nodes (as seen in PERF-1102 and PERF-1041).

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.68s
- **Bottleneck analysis**: Redundant branching instructions during initialization slightly affect the JIT compilation and V8 instruction pipeline.

## Implementation Spec

### Step 1: Merge `isDomStrategy` Initial Frame Blocks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
        if (isDomStrategy) {
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (timePromise) await timePromise;
            nextCapturePromise = domBeginFrame!(0);
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
              nextCapturePromise = domBeginFrame!(timeStep);
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
        }
```
To:
```typescript
        if (isDomStrategy) {
          if (totalFrames > 0) {
            let timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (timePromise) await timePromise;
            nextCapturePromise = domBeginFrame!(0);

            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
              nextCapturePromise = domBeginFrame!(timeStep);
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
        }
```
**Why**: Removes the redundant `if (totalFrames > 0)` branch and consolidates the logic into a single block. Notice we redeclare `timePromise` with `let` to allow reuse or avoid naming conflicts in the merged block.

### Step 2: Merge Canvas Strategy Initial Frame Blocks
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Change:
```typescript
        } else {
          if (totalFrames > 0) {
            const timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (timePromise) await timePromise;
            nextCapturePromise = strategy.capture(page, 0);
          }

          if (totalFrames > 0) {
            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              const timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, timeStep);
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            pendingBytes += rawResult.length;
            if (!stream.write(rawResult) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
        }
```
To:
```typescript
        } else {
          if (totalFrames > 0) {
            let timePromise = timeDriver.setTime(
              page,
              startFrame * compTimeStep,
            );
            if (timePromise) await timePromise;
            nextCapturePromise = strategy.capture(page, 0);

            const rawResult = await nextCapturePromise;
            if (1 < totalFrames) {
              timePromise = timeDriver.setTime(
                page,
                (startFrame + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, timeStep);
            }
            console.log(`Progress: Rendered 0 / ${totalFrames} frames`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            pendingBytes += rawResult.length;
            if (!stream.write(rawResult) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
        }
```
**Why**: Removes the redundant `if (totalFrames > 0)` branch and consolidates the canvas path logic.

## Variations
None.

## Canvas Smoke Test
Run `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run `npm run test -w packages/renderer` to verify the DOM rendering and pipeline structure.

## Prior Art
- PERF-1102 merged redundant strategy blocks.
- PERF-1041 isolated writer loops for cleaner AST footprint.
