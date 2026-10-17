---
id: PERF-1097
slug: inline-dombeginframe-and-buffer-assignment
status: unclaimed
claimed_by: ""
created: 2024-10-18
completed: ""
result: ""
---

# PERF-1097: Inline domBeginFrame and Simplify Buffer Assignment

## Focus Area
The DOM strategy worker dispatch loop inside `packages/renderer/src/core/CaptureLoop.ts`. Specifically, removing the intermediate `domBeginFrame` arrow function and simplifying the final buffer assignment logic.

## Background Research
Currently, in `CaptureLoop.ts`, the DOM capture path defines a closure:
`const domBeginFrame = (frameTime: number) => strategy.capture(page, frameTime);`
and inside the hot loop, it uses an intermediate buffer variable:
```typescript
              const rawResult = await domBeginFrame!(i * timeStep);
              const data = (rawResult as any).screenshotData;
              let buf: Buffer;
              if (data) {
                buf = Buffer.from(data as string, "base64");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
              frameBufferRing[i & ringMask] = buf;
```
By inlining `strategy.capture(page, i * timeStep)` directly, we eliminate the arrow function invocation overhead. By assigning directly to `domLastFrameBuffer`, we eliminate the block-scoped `buf` variable, streamlining the assignment and removing the `else` branch entirely. This reduces AST complexity and JS execution time per frame.

## Benchmark Configuration
- **Composition URL**: standard DOM benchmark
- **Render Settings**: 1080p, 60fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: Unnecessary closure invocation and intermediate variables within the tight multi-worker capture loop.

## Implementation Spec

### Step 1: Inline domBeginFrame and Simplify Buffer Assignment
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the `domBeginFrame` arrow function and the buffer assignment logic with a direct method call and streamlined assignment.
**Why**: Avoids extra function closure overhead and reduces variable declarations and conditional branching in the V8 JIT.
**Risk**: Very low, functionally identical.

Execute the following Node script to apply the patch:
```bash
node -e "
const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const searchCode = \`        if (isDomStrategy) {
          const domBeginFrame = (frameTime: number) => strategy.capture(page, frameTime);
          let domLastFrameBuffer: Buffer | null = null;\`;
const replaceCode = \`        if (isDomStrategy) {
          let domLastFrameBuffer: Buffer | null = null;\`;
code = code.replace(searchCode, replaceCode);

const searchLoop = \`              const rawResult = await domBeginFrame!(i * timeStep);
              const data = (rawResult as any).screenshotData;
              let buf: Buffer;
              if (data) {
                buf = Buffer.from(data as string, \\"base64\\");
                domLastFrameBuffer = buf;
              } else {
                buf = domLastFrameBuffer!;
              }
              frameBufferRing[i & ringMask] = buf;\`;
const replaceLoop = \`              const rawResult = await strategy.capture(page, i * timeStep);
              const data = (rawResult as any).screenshotData;
              if (data) {
                domLastFrameBuffer = Buffer.from(data as string, \\"base64\\");
              }
              frameBufferRing[i & ringMask] = domLastFrameBuffer!;\`;
code = code.replace(searchLoop, replaceLoop);

fs.writeFileSync(file, code);
"
git diff packages/renderer/src/core/CaptureLoop.ts
```

### Step 2: Canvas Smoke Test
Run \`node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=canvas\` to ensure the canvas path operates successfully.

### Step 3: Correctness Check
Run \`node --import tsx packages/renderer/scripts/benchmark-perf.ts --mode=dom\` to verify the DOM render completes successfully and does not hang.

### Step 4: Run test suites
Run \`npm run test -w packages/renderer\` to ensure changes haven't introduced regressions.

### Step 5: Complete pre-commit steps
Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
