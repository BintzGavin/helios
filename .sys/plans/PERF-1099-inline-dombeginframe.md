---
id: PERF-1099
slug: inline-dombeginframe
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1099: Inline domBeginFrame and Simplify Buffer Assignment across all workers

## Focus Area
The `packages/renderer/src/core/CaptureLoop.ts` file, where the `domBeginFrame` arrow function is defined and used for executing strategy.capture for the DOM capturing strategy in both single and multi-worker modes.

## Background Research
Currently, inside the capture loop, `domBeginFrame` is defined as an intermediate variable. For single-workers:
```typescript
      const domBeginFrame = isDomStrategy
        ? (frameTime: number) => strategy.capture(page, frameTime)
        : null;
```
And similarly for multi-workers inside `runWorker`:
```typescript
          const domBeginFrame = (frameTime: number) => strategy.capture(page, frameTime);
```

In tight capture loops, making `nextCapturePromise = domBeginFrame!(0)` and `await domBeginFrame!(i * timeStep)` executes this intermediate closure function instead of making a direct method call on `strategy.capture`. This adds an unnecessary execution frame.

Additionally, in both the single and multi-worker chunk loops, `let buf: Buffer;` is locally instantiated to conditionally decide between reading a new `screenshotData` Buffer or referencing `domLastFrameBuffer`.
Instead, we can assign directly to `domLastFrameBuffer`, and write `domLastFrameBuffer!` directly. Eliminating the conditional block entirely and avoiding the intermediate `let buf: Buffer;`.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The intermediate function `domBeginFrame` executes within extremely hot capture loops on every frame execution, and a temporary variable allocates an `else` branch overhead.

## Implementation Spec

### Step 1: Inline domBeginFrame and Buffer Variables
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove both definitions of `domBeginFrame`.
2. Replace all calls to `domBeginFrame!(time)` with `strategy.capture(page, time)`.
3. In single worker initialization loop and multi worker loops, replace `let buf: Buffer; if (data) { buf = ...; domLastFrameBuffer = buf; } else { buf = domLastFrameBuffer!; } frameBufferRing[...] = buf;` with `if (data) { domLastFrameBuffer = ... } frameBufferRing[...] = domLastFrameBuffer!;` and pass `domLastFrameBuffer!` to the stream.

Execute the following script via heredoc to apply the patch cleanly:

```bash
cat << 'PATCH_EOF' > implement-plan.js
const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const searchCode1 = \`      const domBeginFrame = isDomStrategy
        ? (frameTime: number) => strategy.capture(page, frameTime)
        : null;\`;
code = code.replace(searchCode1, '');

code = code.split('domBeginFrame!(0)').join('strategy.capture(page, 0)');
code = code.split('domBeginFrame!(timeStep)').join('strategy.capture(page, timeStep)');
code = code.split('domBeginFrame!((i + 1) * timeStep)').join('strategy.capture(page, (i + 1) * timeStep)');
code = code.split('domBeginFrame!(i * timeStep)').join('strategy.capture(page, i * timeStep)');

const searchLoop1 = \`              let buf: Buffer;
              nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              const data = rawResult.screenshotData;
              if (data) {
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {\`;

const replaceLoop1 = \`              nextCapturePromise = strategy.capture(page, (i + 1) * timeStep);
              const data = rawResult.screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }

              pendingBytes += domLastFrameBuffer!.length;
              if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {\`;

code = code.replace(searchLoop1, replaceLoop1);

const searchLoop2 = \`            let buf: any;
            const data = rawResult.screenshotData;
            if (data) {
              buf = Buffer.from(data as string, "base64");
              domLastFrameBuffer = buf;
            } else {
              buf = domLastFrameBuffer!;
            }

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {\`;

const replaceLoop2 = \`            const data = rawResult.screenshotData;
            if (data) {
              domLastFrameBuffer = Buffer.from(data as string, "base64");
            }

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {\`;

code = code.replace(searchLoop2, replaceLoop2);


const searchCode2 = \`          const domBeginFrame = (frameTime: number) => strategy.capture(page, frameTime);
          let domLastFrameBuffer: Buffer | null = null;\`;
const replaceCode2 = \`          let domLastFrameBuffer: Buffer | null = null;\`;
code = code.replace(searchCode2, replaceCode2);

const searchLoop3 = \`              const rawResult = await strategy.capture(page, i * timeStep);
              const data = (rawResult as any).screenshotData;
              let buf: Buffer;
              if (data) {
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
              frameBufferRing[i & ringMask] = buf;\`;
const replaceLoop3 = \`              const rawResult = await strategy.capture(page, i * timeStep);
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
              frameBufferRing[i & ringMask] = domLastFrameBuffer!;\`;
code = code.replace(searchLoop3, replaceLoop3);

fs.writeFileSync(file, code);
PATCH_EOF
node implement-plan.js
```

### Step 2: Verify the modification
Run \`git diff packages/renderer/src/core/CaptureLoop.ts\` to ensure the file edits were applied properly.

### Step 3: Canvas Smoke Test
Run \`node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` to ensure the canvas path operates successfully.

### Step 4: Correctness Check
Run \`node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom\` to verify the DOM render completes successfully and does not hang.

### Step 5: Run test suites
Run \`npm run test -w packages/renderer\` to ensure changes haven't introduced regressions.

### Step 6: Complete pre-commit steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
