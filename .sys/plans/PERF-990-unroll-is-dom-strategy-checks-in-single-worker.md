---
id: PERF-990
slug: unroll-is-dom-strategy-checks-in-single-worker
status: unclaimed
claimed_by: ""
created: 2026-07-13
completed: ""
result: ""
---

# PERF-990: Unroll \`isDomStrategy\` checks in single-worker initial frame processing

## Focus Area
The single-worker \`hasProcessFn\` and \`!hasProcessFn\` fast path initialization logic in \`packages/renderer/src/core/CaptureLoop.ts\` (around lines 194-260 and 410-470) where \`isDomStrategy\` branches repeatedly.

## Background Research
When a single worker renders the composition, the loop primes the 0th and 1st frames before entering a fast while-loop that iterates the remainder. During this initialization, the \`isDomStrategy\` boolean is checked in 3 or more separate \`if\` blocks sequentially in both the \`hasProcessFn\` and \`!hasProcessFn\` paths:

\`\`\`typescript
if (totalFrames > 0) { ... if (isDomStrategy) { ... } else { ... } }
...
if (totalFrames > 0) { ... if (1 < totalFrames) { ... if (isDomStrategy) { ... } else { ... } }
  // ...
  if (isDomStrategy) { ... } else { ... }
}
\`\`\`

Evaluating \`isDomStrategy\` multiple times sequentially during this block creates redundant parsing and branching instructions in V8's hot path AST.

We can optimize this by hoisting the \`isDomStrategy\` check out to wrap the entire \`if (totalFrames > 0)\` initialization sequence. This fully decouples the initial frame processing logic into two parallel, contiguous blocks (one strictly for DOM, one strictly for Canvas), preventing interleaved condition evaluations.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: \`dom\` and \`canvas\` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated V8 branch evaluations and AST parser overhead in single-worker initialization.

## Implementation Spec

### Step 1: Hoist \`isDomStrategy\` to unroll initial single worker frame processing for \`hasProcessFn\`
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
In the \`hasProcessFn\` path (around line 194), hoist the \`isDomStrategy\` check out of the individual blocks to wrap the entire frame initialization up to the while loops. It should look like:
\`\`\`typescript
        if (hasProcessFn) {
          let nextCapturePromise = null;
          if (isDomStrategy) {
            if (totalFrames > 0) {
              timeDriver.setTime(page, startFrame * compTimeStep);
              nextCapturePromise = domBeginFrame!();
            }

            if (totalFrames > 0) {
              const rawResult = await nextCapturePromise;
              if (1 < totalFrames) {
                timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
                nextCapturePromise = domBeginFrame!();
              }
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              const buffer = domLastFrameData;
              console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
              if (onProgress) {
                onProgress(0 / totalFrames);
              }
              let writeSuccess = false;
              if ((rawResult as any).screenshotData || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from(buffer as string, "base64");
              }
              const buf = domLastFrameBuffer;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            // existing isDomStrategy main chunk loop (while (i < totalFrames - 1))
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
              const buffer = strategy.processCaptureResult!(rawResult);
              console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
              if (onProgress) {
                onProgress(0 / totalFrames);
              }

              pendingBytes += (buffer as any).length;
              const writeSuccess = stream.write(buffer as any);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            // existing !isDomStrategy main chunk loop (while (i < totalFrames - 1))
          }
\`\`\`

### Step 2: Hoist \`isDomStrategy\` to unroll initial single worker frame processing for \`!hasProcessFn\`
**File**: \`packages/renderer/src/core/CaptureLoop.ts\`
**What to change**:
In the \`!hasProcessFn\` path (around line 410), perform the same hoisting:
\`\`\`typescript
        } else {
          let nextCapturePromise = null;
          if (isDomStrategy) {
            if (totalFrames > 0) {
              timeDriver.setTime(page, startFrame * compTimeStep);
              nextCapturePromise = domBeginFrame!();
            }

            if (totalFrames > 0) {
              const bufRaw = await nextCapturePromise;
              if (1 < totalFrames) {
                timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
                nextCapturePromise = domBeginFrame!();
              }
              console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
              if (onProgress) {
                onProgress(0 / totalFrames);
              }

              const data = (bufRaw as any).screenshotData;
              if (data) {
                domLastFrameData = data;
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              } else if (!domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from(bufRaw as string, "base64");
              }
              const buf = domLastFrameBuffer!;
              pendingBytes += buf.length;
              const writeSuccess = stream.write(buf);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            // existing isDomStrategy main chunk loop (while (i < totalFrames - 1))
          } else {
            if (totalFrames > 0) {
              const timePromise = timeDriver.setTime(page, startFrame * compTimeStep);
              if (timePromise) await timePromise;
              nextCapturePromise = strategy.capture(page, 0);
            }

            if (totalFrames > 0) {
              const buffer = await nextCapturePromise;
              if (1 < totalFrames) {
                const timePromise = timeDriver.setTime(page, (startFrame + 1) * compTimeStep);
                if (timePromise) await timePromise;
                nextCapturePromise = strategy.capture(page, timeStep);
              }
              console.log(\`Progress: Rendered 0 / \${totalFrames} frames\`);
              if (onProgress) {
                onProgress(0 / totalFrames);
              }

              pendingBytes += (buffer as any).length;
              const writeSuccess = stream.write(buffer as any);

              if (!writeSuccess && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            // existing !isDomStrategy main chunk loop (while (i < totalFrames - 1))
          }
        }
\`\`\`

**Why**: Unrolling this reduces the number of inline cache nodes created during V8 JIT and gives the compiler a unified, predictable execution path, speeding up function compilation footprint and parsing time. It completely splits the `isDomStrategy` paths without any interleaved boolean checks.

## Correctness Check
Run \`npm test -w packages/renderer\` to ensure nothing is broken.
