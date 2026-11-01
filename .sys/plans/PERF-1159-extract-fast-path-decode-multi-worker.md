---
id: PERF-1159
slug: extract-fast-path-decode-multi-worker
status: unclaimed
claimed_by: ""
created: 2024-11-01
completed: ""
result: ""
---

# PERF-1159: Extract fast path decode logic to simplify AST multi worker path

## Focus Area
The multi-worker fast path inside \`CaptureLoop.ts\` \`runWorker\` block (line 469-509).

## Background Research
Currently in \`CaptureLoop.ts\`, in the multi-worker \`runWorker\` fast path, there is a large check \`const isDomStrategy = !!(strategy as any).beginFrameParams;\` followed by \`if (isDomStrategy) { ... } else { ... }\`.
This check was added by a previous experiment to branch the code based on the strategy type because DOM strategy needs base64 buffer conversion while Canvas returns buffers directly.
Similar to the single-worker path optimized in PERF-1158, the duplication here balloons the size of the JavaScript parsed by V8 (AST bloat). The logic across both branches is nearly identical, except for the single line converting \`rawResult\` into \`buf\` or setting \`frameBufferRing\`.
By refactoring this block to use a single loop and moving the buffer resolution logic into a small, fast inline ternary expression, we can merge the two massive identical blocks back into one. This drastically reduces AST parsing overhead, improves CPU I-cache density, and allows V8 TurboFan to optimize the hot multi-worker execution path without code duplication bloat.

## Benchmark Configuration
- **Composition URL**: \`file:///app/examples/dom-benchmark/composition.html\`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: \`dom\`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~13.2s
- **Bottleneck analysis**: Massive duplicated loop body in JS AST parsing and instruction cache overhead for V8 TurboFan in multi-worker \`runWorker\` path.

## Implementation Spec

### Step 1: Replace duplicated block with strategy-agnostic resolver
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
Remove the \`if (isDomStrategy)\` branch entirely and combine the two identical \`try { ... }\` blocks into one in \`runWorker\`. Replace the buffer assignment:
```typescript
      const runWorker = async (worker: WorkerInfo, workerIndex: number) => {
        const { timeDriver, strategy, page } = worker;
        const isDomStrategy = !!(strategy as any).beginFrameParams;

        try {
          while (nextFrameToSubmit !== totalFrames && !aborted) {
            let i: number;
            if (nextFrameToSubmit !== nextFrameToWrite + maxPipelineDepth) {
              i = nextFrameToSubmit++;
            } else {
              freeWorkers[freeWorkersHead++] = workerIndex;
              i = (await workerThenables[workerIndex]) as any as number;
            }

            if (i === -1) break;

            const timePromise = timeDriver.setTime(page, (startFrame + i) * compTimeStep);
            if (timePromise) {
              await timePromise;
            }

            const rawResult = await strategy.capture(page, i * timeStep);
            frameBufferRing[i & ringMask] = isDomStrategy ? Buffer.from(rawResult as string, "base64") : rawResult;
            writerWaiterPromise.resolve();
          }
        } catch (e) {
          fatalError = e;
          aborted = true;
          checkState();
        }
      };
```
**Why**: Shrinks the V8 AST payload for this hot path, enabling better instruction caching in the CPU, while keeping the dynamic dispatch fast and inline.

## Variations
None.

## Canvas Smoke Test
Run \`npx tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` to ensure basic canvas rendering functions still operate correctly.

## Correctness Check
Run \`npm run test -w packages/renderer\` to verify the DOM rendering and pipeline structure.

## Prior Art
Re-merging similar worker paths for size efficiency (PERF-1158).
