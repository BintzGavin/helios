---
id: PERF-1107
slug: unroll-single-worker-loops
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---
# PERF-1107: Unroll Single-Worker Frame Loops in CaptureLoop.ts

## Focus Area
The single-worker capture path in `CaptureLoop.ts` (Phase 4: Frame Capture Loop). This experiment aims to reduce AST complexity and V8 branch prediction overhead by separating the `dom` and `canvas` frame capture loops, eliminating the repeated per-frame `isDomStrategy` evaluations inside the tight loops.

## Background Research
PERF-1104 successfully isolated the initialization of single-worker rendering into separate `dom` and `canvas` paths, yielding performance benefits due to reduced branch evaluation overhead. However, the main frame loop (`let i = 1; while (...)`) and the final frame completion block (`if (!aborted && totalFrames > 1)`) still contain interleaved paths with runtime checks like `if (isDomStrategy)`. In a hot loop executing thousands of times per second, removing these branches allows the V8 TurboFan compiler to optimize the loop body more aggressively without polymorphic or branch-heavy AST logic.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom` and `canvas`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The `while` loop processes frames sequentially. Inside this loop, `if (isDomStrategy)` is evaluated up to `totalFrames` times. This forces the JS engine to parse larger ASTs and maintain branches that are invariant for the duration of the loop.

## Implementation Spec

### Step 1: Wrap single-worker loop blocks in a top-level `if (isDomStrategy)`
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Inside `packages/renderer/src/core/CaptureLoop.ts`, unroll the main loop and final logic of the single-worker capture. Extract the code starting from `let i = 1;` through `if (!aborted && totalFrames > 1) {...}`. Break it into an `if (isDomStrategy) { ... } else { ... }` block, so that the main loops and final frame completions for dom vs canvas don't have to evaluate `isDomStrategy` during their hot loops.

Run this script to modify the file:
```bash
cat << 'PATCH_EOF' > implement-plan.js
const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const search = \`        let i = 1;
        while (i < totalFrames - 1 && !aborted) {
          const chunkEnd = Math.min(nextProgress, totalFrames - 1);

          for (; i !== chunkEnd; i++) {
            const rawResult = await nextCapturePromise;

            const timePromise = timeDriver.setTime(
              page,
              (startFrame + i + 1) * compTimeStep,
            );
            if (timePromise) await timePromise;

            if (isDomStrategy) {
              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }
            } else {
              if (!aborted) {
              nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
            }
            }

            let buf;
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;
            } else {
              buf = rawResult;
            }

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }

          if (aborted) break;

          if (i === nextProgress) {
            nextProgress += progressInterval;
            console.log(
              \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
            );
            if (onProgress) {
              onProgress((i - 1) / totalFrames);
            }
          }
        }

        if (!aborted && totalFrames > 1) {
          try {
            const rawResult = await nextCapturePromise;

            let buf;
            if (isDomStrategy) {
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;
            } else {
              buf = rawResult;
            }

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }

            i++;
            if (i === nextProgress || i === totalFrames) {
              if (i === nextProgress) nextProgress += progressInterval;
              console.log(
                \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          } catch (e) {
            if (!aborted) throw e;
          }
        }\`;

const replace = \`        if (isDomStrategy) {
          let i = 1;
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(nextProgress, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              }

              let buf;
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }

          if (!aborted && totalFrames > 1) {
            try {
              const rawResult = await nextCapturePromise;

              let buf;
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              buf = domLastFrameBuffer!;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              i++;
              if (i === nextProgress || i === totalFrames) {
                if (i === nextProgress) nextProgress += progressInterval;
                console.log(
                  \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          }
        } else {
          let i = 1;
          while (i < totalFrames - 1 && !aborted) {
            const chunkEnd = Math.min(nextProgress, totalFrames - 1);

            for (; i !== chunkEnd; i++) {
              const rawResult = await nextCapturePromise;

              const timePromise = timeDriver.setTime(
                page,
                (startFrame + i + 1) * compTimeStep,
              );
              if (timePromise) await timePromise;

              if (!aborted) {
                nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              }

              let buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            }

            if (aborted) break;

            if (i === nextProgress) {
              nextProgress += progressInterval;
              console.log(
                \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
              );
              if (onProgress) {
                onProgress((i - 1) / totalFrames);
              }
            }
          }

          if (!aborted && totalFrames > 1) {
            try {
              const rawResult = await nextCapturePromise;

              let buf = rawResult;

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }

              i++;
              if (i === nextProgress || i === totalFrames) {
                if (i === nextProgress) nextProgress += progressInterval;
                console.log(
                  \`Progress: Rendered \${i - 1} / \${totalFrames} frames\`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          }
        }\`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
PATCH_EOF
cat implement-plan.js
node implement-plan.js
```

### Step 2: Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.

### Step 3: Complete Pre Commit
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
