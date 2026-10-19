---
id: PERF-1109
slug: unroll-is-dom-strategy-final-frame
status: unclaimed
claimed_by: ""
created: 2026-07-10
completed: ""
result: ""
---

# PERF-1109: Unroll isDomStrategy in single-worker final frame block

## Focus Area
Single-worker `CaptureLoop` path, specifically the `totalFrames > 1` final frame block.

## Background Research
The `isDomStrategy` check inside the `totalFrames > 1` final frame block in `packages/renderer/src/core/CaptureLoop.ts` is currently evaluated for every execution. Unrolling this logic into separate `if (isDomStrategy)` and `else` blocks simplifies the flow, removing branch checking when processing the final frame buffer.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~8.7s

## Implementation Spec

### Step 1: Unroll isDomStrategy in single-worker final frame block
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
Replace the single `try` block that contains the `if (isDomStrategy)` buffer assignment with two separate `try` blocks wrapped in an outer `if (isDomStrategy)`.

**Current code**:
```typescript
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
// ...
```

**New code**:
```typescript
        if (!aborted && totalFrames > 1) {
          if (isDomStrategy) {
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
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          } else {
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
                  `Progress: Rendered ${i - 1} / ${totalFrames} frames`,
                );
                if (onProgress) {
                  onProgress((i - 1) / totalFrames);
                }
              }
            } catch (e) {
              if (!aborted) throw e;
            }
          }
        }
```
**Why**: Removes dynamic `isDomStrategy` evaluation from the final frame logic, keeping `dom` and `canvas` paths entirely independent in the AST, allowing V8 to optimize the blocks optimally.

## Correctness Check
Run `npm --prefix packages/renderer run test` to verify the pipeline outputs correct video data.
