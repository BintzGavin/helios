#### Benchmark Configuration
- **Composition URL**: http://localhost:3000/default-dom-test
- **Render Settings**: 1920x1080, 30 FPS, 5 seconds, libx264
- **Mode**: `dom` (all benchmarks run in DOM mode)
- **Metric**: Wall-clock render time in seconds (from `render()` call to completion)
- **Minimum runs**: 3 runs per experiment, report median

#### Baseline
- **Current estimated render time**: TBD
- **Bottleneck analysis**: The Frame Capture Loop dominates. Currently, `Renderer.ts` is strictly sequential per-frame: it awaits `timeDriver.setTime()`, then awaits `strategy.capture(page, time)`, and finally awaits a Promise resolving on the write callback to `ffmpegProcess.stdin.write(buffer)`. `page.screenshot()` inside `DomStrategy.capture()` is likely the heaviest component, requiring PNG encoding in the Chromium process, IPC transfer to Node.js, and subsequent PNG decoding in FFmpeg.

#### Experiment Queue

## Experiment 1: Non-blocking FFmpeg I/O & Backpressure Management
**Hypothesis**: Awaiting the `ffmpegProcess.stdin.write(buffer)` callback sequentially halts the capture loop. By removing the strict `await` on every write and instead implementing a high-water-mark backpressure system (using the `drain` event when `write()` returns false), we can capture the next frame while FFmpeg is busy encoding the previous one.
**Changes**: Modify `Renderer.ts` capture loop to only await when `stdin.write` returns `false` (indicating a full buffer), resuming on the `drain` event, rather than awaiting every single write callback.
**Cross-Domain Dependencies**: None
**Expected Impact**: ~10-15% reduction in total render time by overlapping capture and encode.
**Risk Level**: Low
**Canvas Smoke Test**: Run standard Canvas smoke test.
**Correctness Check**: Ensure all frames are encoded in order and video duration is correct.
**Rollback Plan**: Revert to the exact `await new Promise(...)` write callback logic per frame.

## Experiment 2: Intermediate Format Optimization (WEBP/JPEG)
**Hypothesis**: PNG encoding in Chromium and decoding in FFmpeg is extremely CPU-bound. Switching Playwright's screenshot format to `webp` (or `jpeg` for opaque backgrounds) will drastically reduce CPU time spent compressing/decompressing frames and lower the IPC payload size.
**Changes**: Update `DomStrategy.ts` and `Renderer.ts` options to support and default to `webp` (since it supports alpha channel) instead of `png` for intermediate frames.
**Cross-Domain Dependencies**: None
**Expected Impact**: ~20-30% reduction in per-frame capture time.
**Risk Level**: Low
**Canvas Smoke Test**: Standard Canvas smoke test.
**Correctness Check**: Visually verify no extreme compression artifacts and that transparency still works.
**Rollback Plan**: Revert default `intermediateImageFormat` back to `png`.

## Experiment 3: Raw CDP Screencast Protocol
**Hypothesis**: Using `page.screenshot()` repeatedly has high per-frame overhead. The Chrome DevTools Protocol offers `Page.startScreencast`, which automatically streams frames directly from the compositor. Decoupling the time-seeking from an event-driven frame receiver might bypass Playwright's screenshot overhead.
**Changes**: Replace `page.screenshot()` in `DomStrategy.ts` with a direct CDP session subscribing to `Page.screencastFrame`. Await the frame event after each `setTime` call.
**Cross-Domain Dependencies**: None
**Expected Impact**: ~30-40% speedup on capture overhead.
**Risk Level**: High
**Canvas Smoke Test**: Standard Canvas smoke test.
**Correctness Check**: Ensure frames sync exactly with the virtual time requested (no duplicate or dropped frames).
**Rollback Plan**: Revert to Playwright's `page.screenshot()`.

## Experiment 4: Multi-Page Worker Pool (Parallel Capture)
**Hypothesis**: Because we can deterministically seek to any frame via `setTime()`, the capture process is embarrassingly parallel. We can spawn `N` Playwright pages (workers), distribute chunks of the timeline to each, and stream the frames to FFmpeg.
**Changes**: Refactor `Renderer.ts` to instantiate a pool of browser contexts/pages based on CPU core count. Distribute `i = 0 to totalFrames` across the pool. Order the incoming buffers via a priority queue before piping to FFmpeg.
**Cross-Domain Dependencies**: None
**Expected Impact**: ~200-400% speedup, practically scaling linearly with available CPU cores.
**Risk Level**: High
**Canvas Smoke Test**: Standard Canvas smoke test.
**Correctness Check**: Validate frames are piped to FFmpeg in exact chronological order without memory leaks.
**Rollback Plan**: Revert back to the single-page sequential capture loop.
