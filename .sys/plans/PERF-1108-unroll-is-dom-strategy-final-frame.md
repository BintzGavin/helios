---
id: PERF-1108
slug: unroll-is-dom-strategy-final-frame
status: unclaimed
claimed_by: ""
created: 2024-10-26
completed: ""
result: ""
---

# PERF-1108: Unroll `isDomStrategy` check in single worker final frame loop.

## Focus Area
`CaptureLoop.ts` - Removing the redundant `if (isDomStrategy)` check in the single-worker final frame block (`if (!aborted && totalFrames > 1)`).

## Background Research
Currently, at the end of the single-worker path in `CaptureLoop.ts` there is a cleanup block `if (!aborted && totalFrames > 1)`. Inside this block, `if (isDomStrategy)` is evaluated. By duplicating the pending bytes logic inside the strategy evaluation, we can simplify the flow. The `isDomStrategy` is already checked heavily in previous blocks. This unrolls the buffer type dispatch specifically for the single worker final frame, pulling `stream.write` into the isolated paths to prevent mixed type dispatch jumps and optimize the AST footprint.

## Benchmark Configuration
- **Composition URL**: Standard DOM benchmark composition.
- **Render Settings**: Standard resolution, FPS.
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds.
- **Minimum runs**: 3 per experiment, report median.

## Baseline
- **Current estimated render time**: ~8.69s.
- **Bottleneck analysis**: The `isDomStrategy` branch evaluator consumes minor parser overhead during final cleanup.

## Implementation Spec

### Step 1: Update `CaptureLoop.ts` final frame block
**File**: `packages/renderer/src/core/CaptureLoop.ts`

**What to change**:
Currently, the block at line 298 reads:
```javascript
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
```

Let's replace it with:
```javascript
<<<<<<< SEARCH
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
=======
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
              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
            } else {
              buf = rawResult;
              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
                await this.drainPromise;
                pendingBytes = 0;
              }
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
>>>>>>> REPLACE
```

**Why**: By pushing the `stream.write` and `pendingBytes` check into the `isDomStrategy` branches, we unroll the buffer type dispatch. The engine can keep `buf` in registers, avoiding multiple branch jumps to write the stream. This optimizes the cleanup frame.
**Risk**: Very low, mathematical logic is preserved.

## Correctness Check
A canvas smoke test and DOM render to ensure the paths behave exactly the same mathematically and prevent stream stalls.
