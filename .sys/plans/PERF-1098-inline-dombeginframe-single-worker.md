---
id: PERF-1098
slug: inline-dombeginframe-single-worker
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1098: Inline domBeginFrame and Simplify Buffer Assignment

## Focus Area
The DOM strategy worker dispatch loop inside `packages/renderer/src/core/CaptureLoop.ts`. Specifically, removing the intermediate `domBeginFrame` arrow function and simplifying the final buffer assignment logic.

## Background Research
Currently, in `CaptureLoop.ts`, the DOM capture path defines a closure:
`const domBeginFrame = isDomStrategy ? (frameTime: number) => strategy.capture(page, frameTime) : null;`
and inside the single worker loop, it uses an intermediate buffer variable:
```typescript
              let buf: Buffer;
              nextCapturePromise = domBeginFrame!((i + 1) * timeStep);
              const data = rawResult.screenshotData;
              if (data) {
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
```
By inlining `strategy.capture(page, ...)` directly where `domBeginFrame` was used, we eliminate the arrow function invocation overhead.

Also, we can eliminate the block-scoped `buf` variable in buffer assignment paths across `CaptureLoop.ts` when `data` exists:
```typescript
              const data = rawResult.screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, "base64");
              }
```
And replace the usages of `buf` with `domLastFrameBuffer!`. This streamlines the assignment, removing the `else` branch entirely. This reduces AST complexity, local variable lookups, and JS execution time per frame.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary closure invocation and intermediate variables within the tight capture loops in the JS JS Engine.

## Implementation Spec

### Step 1: Inline domBeginFrame and Simplify Buffer Assignment
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the `domBeginFrame` arrow function with direct method calls, and streamline buffer assignments inside single-worker paths (both initial and chunk loops).
**Why**: Avoids extra function closure overhead and reduces variable declarations and conditional branching in the V8 JIT.
**Risk**: Very low, functionally identical.

Execute the following script via heredoc to apply the text replacement carefully across the file:
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
