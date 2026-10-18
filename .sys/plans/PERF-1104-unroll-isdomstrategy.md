---
id: PERF-1104
slug: unroll-isdomstrategy-single-worker-initial
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1104: Unroll isDomStrategy checks in single-worker initial frame processing

## Focus Area
The single-worker fast path initialization logic in `packages/renderer/src/core/CaptureLoop.ts` (around lines 171-203) where `isDomStrategy` branches repeatedly.

## Background Research
When a single worker renders the composition, the loop primes the 0th and 1st frames before entering a fast while-loop that iterates the remainder. During this initialization, the `isDomStrategy` boolean is checked in 3 separate `if` blocks sequentially:

```typescript
        if (totalFrames > 0) {
          // ...
          if (isDomStrategy) {
            nextCapturePromise = domBeginFrame!(0);
          } else {
            nextCapturePromise = strategy.capture(page, 0);
          }
        }

        if (totalFrames > 0) {
          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            // ...
            if (isDomStrategy) {
              nextCapturePromise = domBeginFrame!(timeStep);
            } else {
              nextCapturePromise = strategy.capture(page, timeStep);
            }
          }
          // ...
          let buf;
          if (isDomStrategy) {
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }
            buf = domLastFrameBuffer!;
          } else {
            buf = rawResult;
          }
```

Evaluating `isDomStrategy` multiple times sequentially during this block creates redundant parsing and branching instructions in V8's hot path AST.

We can optimize this by hoisting the `isDomStrategy` check out to wrap the entire `if (totalFrames > 0)` initialization sequence. This fully decouples the initial frame processing logic into two parallel, contiguous blocks (one strictly for DOM, one strictly for Canvas), preventing interleaved condition evaluations.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark
- **Render Settings**: Standard
- **Mode**: `dom` (single worker)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Repeated V8 branch evaluations and AST parser overhead in single-worker initialization.

## Implementation Spec

### Step 1: Hoist `isDomStrategy` to unroll initial single worker frame processing
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the single-worker initialization path (around line 171), hoist the `isDomStrategy` check out of the individual blocks to wrap the entire frame initialization up to the while loops.

Run this script to unroll the loops:

```bash
cat << 'PATCH_EOF' > implement-plan.js
const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const search = \`        let nextCapturePromise: any = null;
        if (totalFrames > 0) {
          const timePromise = timeDriver.setTime(
            page,
            startFrame * compTimeStep,
          );
          if (timePromise) await timePromise;
          if (isDomStrategy) {
            nextCapturePromise = domBeginFrame!(0);
          } else {
            nextCapturePromise = strategy.capture(page, 0);
          }
        }

        if (totalFrames > 0) {
          const rawResult = await nextCapturePromise;
          if (1 < totalFrames) {
            const timePromise = timeDriver.setTime(
              page,
              (startFrame + 1) * compTimeStep,
            );
            if (timePromise) await timePromise;
            if (isDomStrategy) {
              nextCapturePromise = domBeginFrame!(timeStep);
            } else {
              nextCapturePromise = strategy.capture(page, timeStep);
            }
          }
          console.log(\\\`Progress: Rendered 0 / \\\${totalFrames} frames\\\`);
          if (onProgress) {
            onProgress(0 / totalFrames);
          }

          let buf;
          if (isDomStrategy) {
            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
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
        }\`;

const replace = \`        let nextCapturePromise: any = null;
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
            console.log(\\\`Progress: Rendered 0 / \\\${totalFrames} frames\\\`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            const data = (rawResult as any).screenshotData;
            if (data || !domLastFrameBuffer) {
              domLastFrameBuffer = Buffer.from((data || (strategy as any).lastFrameData) as string, "base64");
            }
            let buf = domLastFrameBuffer!;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
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
            console.log(\\\`Progress: Rendered 0 / \\\${totalFrames} frames\\\`);
            if (onProgress) {
              onProgress(0 / totalFrames);
            }

            let buf = rawResult;

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
              await this.drainPromise;
              pendingBytes = 0;
            }
          }
        }\`;

code = code.replace(search, replace);
fs.writeFileSync(file, code);
PATCH_EOF
node implement-plan.js
rm implement-plan.js
```

### Step 2: Verify the modification
Run `git diff packages/renderer/src/core/CaptureLoop.ts` to ensure the file edits were applied properly.

### Step 3: Correctness Check
Run `npm run test -w packages/renderer` to ensure nothing is broken.

### Step 4: Complete pre commit steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
