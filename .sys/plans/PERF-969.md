---
id: PERF-969
slug: cache-decoded-buffer-unchanged-frames-single-worker-no-processfn
status: complete
claimed_by: "perf-969-executor"
created: 2024-07-11
completed: "2024-07-11"
result: "improved"
---

# PERF-969: Cache Decoded Base64 Buffers for Unchanged Frames in Single-Worker Loop (!hasProcessFn)

## Focus Area
The single-worker DOM strategy chunked loops in `packages/renderer/src/core/CaptureLoop.ts`, specifically the `!hasProcessFn` code path.

## Background Research
PERF-965 and PERF-966 successfully optimized the DOM capture paths by caching decoded Base64 `Buffer` objects for unchanged frames, avoiding redundant CPU-bound decoding. However, `CaptureLoop.ts` contains a single-worker path that splits based on `hasProcessFn`. The `hasProcessFn = true` path was optimized in PERF-965, but the `hasProcessFn = false` path (which handles some fallback DOM strategy execution) was missed and is still doing `Buffer.from(..., "base64")` unconditionally for every frame.

## Benchmark Configuration
- **Composition URL**: DOM benchmark composition
- **Render Settings**: 600x600, 30fps
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~20s
- **Bottleneck analysis**: The `!hasProcessFn` path for `isDomStrategy` loops in `CaptureLoop.ts` performs synchronous CPU-bound string decoding for every frame.

## Implementation Spec

### Step 1: Optimize the initial frame capture and loops
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
In the `else` block corresponding to `!hasProcessFn`, find the `if (isDomStrategy)` branch around line 452.
Update the initial capture:
```javascript
<<<<<<< SEARCH
            if (isDomStrategy) {
              const buf = Buffer.from(buffer as string, "base64");
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
=======
            if (isDomStrategy) {
              const data = (bufRaw as any).screenshotData;
              if (data) {
                domLastFrameData = data;
              }
              if (data || !domLastFrameBuffer) {
                domLastFrameBuffer = Buffer.from((data || buffer) as string, "base64");
              }
              const buf = domLastFrameBuffer;
              pendingBytes += buf.length;
              writeSuccess = stream.write(buf);
>>>>>>> REPLACE
```

Update the inner `for` chunk loop around line 473:
```javascript
<<<<<<< SEARCH
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const buf = Buffer.from(rawResult as unknown as string, "base64");

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
=======
                  for (; i < chunkEnd; i++) {
                    const rawResult = await nextCapturePromise;

                    timeDriver.setTime(
                      page,
                      (startFrame + i + 1) * compTimeStep,
                    );
                    nextCapturePromise = domBeginFrame!();

                    const data = (rawResult as any).screenshotData;
                    let buf: Buffer;
                    if (data || !domLastFrameBuffer) {
                      if (data) domLastFrameData = data;
                      buf = Buffer.from(domLastFrameData as string, "base64");
                      domLastFrameBuffer = buf;
                    } else {
                      buf = domLastFrameBuffer;
                    }

                    pendingBytes += buf.length;
                    const writeSuccessStr = stream.write(buf);
>>>>>>> REPLACE
```

Update the `totalFrames > 1` final iteration around line 504:
```javascript
<<<<<<< SEARCH
                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  const buf = Buffer.from(rawResult as unknown as string, "base64");

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);
=======
                if (!aborted && totalFrames > 1) {
                  const rawResult = await nextCapturePromise;

                  const data = (rawResult as any).screenshotData;
                  let buf: Buffer;
                  if (data || !domLastFrameBuffer) {
                    if (data) domLastFrameData = data;
                    buf = Buffer.from(domLastFrameData as string, "base64");
                    domLastFrameBuffer = buf;
                  } else {
                    buf = domLastFrameBuffer;
                  }

                  pendingBytes += buf.length;
                  const writeSuccessStr = stream.write(buf);
>>>>>>> REPLACE
```

**Why**: Reuses the previously decoded Node.js `Buffer` if the CDP `screenshotData` is undefined (meaning the frame hasn't changed), avoiding expensive string decoding overhead.
**Risk**: If `screenshotData` is misinterpreted or reference sharing causes stream issues, data corruption could occur. However, earlier experiments (PERF-965/966) showed stream reference retention works well for this pattern because Node.js doesn't modify the buffer internally.

## Canvas Smoke Test
Run a simple Canvas animation and ensure it doesn't break, though `isDomStrategy` paths won't be hit by it.

## Correctness Check
Run `tests/run-all.ts` or visually verify the DOM output mp4 to ensure frames aren't dropped or duplicated incorrectly.


## Results Summary

```
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	19.800	600	30.30	510.0	keep	baseline
2	19.500	600	30.76	510.1	keep	Cached decoded Base64 buffers for unchanged frames in single-worker !hasProcessFn path
3	19.450	600	30.84	510.2	keep	Cached decoded Base64 buffers for unchanged frames in single-worker !hasProcessFn path
```
