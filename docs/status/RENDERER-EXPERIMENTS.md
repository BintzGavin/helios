## Performance Trajectory
Current best: 10.046s (baseline was 10.760s, -7%)
Last updated by: PERF-541

## What Works
- **In-Memory Frame Encoding Optimization (PERF-541)**
  - Replaced `--process-per-tab` with `--single-process` in `DEFAULT_BROWSER_ARGS` to eliminate Chromium's internal process-to-process IPC.
  - Render time improved to ~10.046s from the ~10.760s baseline.
- **Dedicated Browser Instances (PERF-526)**
  - **What I did**: Updated `BrowserPool.ts` to launch a dedicated Chromium browser instance per worker page instead of sharing a single browser context.
  - **How much it improved**: ~37% faster (median ~10.760s vs baseline ~17.071s).
  - **Plan ID**: PERF-526
- **PERF-529**: Isolate Renderers with --process-per-tab
  - **What I tried**: Added `--process-per-tab` to Chromium launch arguments and removed `--disable-site-isolation-trials` to force each worker page into its own renderer process with dedicated V8 isolate and compositor thread.
  - **Outcome**: Kept. Improved median render time to ~15.594s vs baseline ~16.306s. Eliminating thread contention across shared workers substantially improved multi-core throughput during the hot loop.
- **PERF-520**: Inlined evaluateStabilityParams await in CdpTimeDriver
  - **What I tried**: Inlined stability check promise directly without chaining `.then()` inside `runSetTime()` in CdpTimeDriver.ts.
  - **Outcome**: Kept. Improved median render time to ~16.306s vs baseline ~16.756s. Bypassing closure and Promise chain allocation slightly improved hot loop performance.
- **PERF-520**: Inline defaultStabilityCheck Promise
  - **What I tried**: Replaced the `.then` promise chaining in the `defaultStabilityCheck` method with an `await` directly in `runSetTime`.
  - **Outcome**: Kept. Improved render time to median ~17.071s vs baseline ~17.163s. Avoiding the secondary Promise wrapper allocation on every frame slightly improved loop performance.
- **PERF-519**: Inline DomStrategy Promise
  - **What I tried**: Replaced the `.then` promise chaining in the `capture` method with an `await` + `try...catch` approach.
  - **Outcome**: Kept. Improved render time to median ~17.163s vs baseline ~17.687s. Avoiding the secondary Promise wrapper allocation on every frame slightly improved loop performance.
- PERF-493: Track Free Workers with Stack in CaptureLoop (improved to 4.169s)
- **PERF-498**: Restore FFmpeg Backpressure in CaptureLoop
  - **What I tried**: Restored the `previousWritePromise` await when writing to FFmpeg stdin to prevent unbounded memory buffering of frames in Node.js.
  - **Outcome**: Kept. While the raw time (~17.687s for 600 frames) seemed slower initially when mistakenly compared against a 300-frame Canvas baseline, it is actually a ~3.1% improvement over the true 600-frame baseline (~18.267s for PERF-496). Critically, it prevents unbound buffering and GC pauses, ensuring stability for long renders.
- **PERF-497**: Optimize Orchestrator State Checks
  - **What I tried**: Moved checkState() call from top of while loop to after nextFrameToWrite++ inside the loop.
  - **WHY it didn't work**: Render time of 18.077s was not better than baseline of 17.687s.
  - **Outcome**: discard

## What Doesn't Work (and Why)
- **Removed `--disable-dev-shm-usage` from DEFAULT_BROWSER_ARGS**: Discarded. Removing this argument caused a slight performance regression (median ~10.950s vs baseline ~10.820s) instead of improving performance. While `/dev/shm` is faster, the flag's removal might lead Chromium to use IPC memory mechanisms that are less efficient for this specific microVM environment or workload. (PERF-543)
- **PERF-538**: Replace Runtime.evaluate with Runtime.callFunctionOn
  - **What I tried**: Updated `CdpTimeDriver.ts` to use `Runtime.callFunctionOn` instead of `Runtime.evaluate` to synchronize media elements, which passes static function declarations with arguments to bypass V8 string parsing per frame.
  - **WHY it didn't work**: The median render time regressed to ~17.462s vs the baseline of ~15.594s. Passing static function declarations via `callFunctionOn` introduced higher argument serialization or CDP protocol overhead than executing a pre-concatenated raw string via `evaluate` in the tight frame loop.
  - **Outcome**: discard
- **PERF-536**: Inline Stability Evaluate in CdpTimeDriver.ts
  - **What I tried**: Attempted to reduce function call dispatch and variable assignment overhead by inlining the `handleStabilityCheckResponse` exception check logic directly into `runSetTime()`.
  - **WHY it didn't work**: Render time regressed to a median of ~17.344s vs baseline ~15.594s. Inlining the error-checking logic inside the V8 hot loop likely caused negative deoptimization side effects, overriding the minuscule savings from avoiding function dispatch.
  - **Outcome**: discard
- **PERF-533**: Limit FFmpeg Threads to Reduce CPU Contention
  - **What I tried**: Added `-threads 1` to the FFmpeg builder arguments for video encoding in `FFmpegBuilder.ts` to limit thread contention with Chromium and Node on the CPU.
  - **WHY it didn't work**: The render time regressed to a median of ~17.431s (and as bad as ~26.641s in one run) compared to the baseline of ~15.594s. Limiting FFmpeg to a single thread likely introduced a bottleneck on the encoding side that backed up the pipeline, forcing Chromium workers to wait, which negatively offset any thread contention gains.
  - **Outcome**: discard
- **PERF-532**: Inline defaultSyncMedia inside CdpTimeDriver.ts
  - **What I tried**: Attempted to reduce function call overhead in the hot loop by replacing the call to `this.defaultSyncMedia(timeInSeconds)` with the inline logic directly inside `runSetTime()`.
  - **WHY it didn't work**: Render time regressed to a median of ~18.669s vs baseline ~15.594s. Inlining a heavy block with complex looping directly into the main execution function increased V8 deoptimization risk and memory footprint, overriding any minor function call dispatch savings.
- **PERF-525**: Reduce Worker Wait Promise Allocation with Shared Promise
  - **What I tried**: Replaced multiple individual worker wait promises inside `CaptureLoop.ts` with a single shared `workerWaitPromise`.
  - **WHY it didn't work**: The performance regressed heavily. The median render time increased to ~19.921s compared to the baseline ~17.071s. The "thundering herd" overhead of waking all workers simultaneously to contend for ring buffer slots outweighed the garbage collection savings of not allocating individual worker promises.
  - **Outcome**: discard
- **PERF-517**: Bypass Playwright Evaluate for Media Sync
  - **What I tried**: Replaced Playwright `frame.evaluate` in the single-frame fallback of `CdpTimeDriver.ts` with a raw `Runtime.evaluate` CDP command.
  - **WHY it didn't work**: Did not improve performance over baseline (median ~18.05s vs true baseline ~17.687s). The `frame.evaluate` is only used when the initial multi-frame optimization isn't hit, which means it isn't the primary bottleneck, and removing its Promise chain wrapper overhead didn't measurably improve overall pipeline throughput.
  - **Outcome**: discard
- **PERF-504**: Optimize BrowserPool Concurrency Formula
  - **What I tried**: Modified `BrowserPool.ts` concurrency logic to `const concurrency = Math.max(1, Math.min(8, cpus * 2));` to increase parallel capture capacity.
  - **WHY it didn't work**: The performance regressed heavily. Increasing Playwright instances/concurrency to 8 exhausted memory and CPU resources, causing the render time to slow down significantly to ~26.429s (compared to baseline ~17.687s).
  - **Outcome**: discard
- **PERF-502**: Tune ZeroLatency
  - **What I tried**: Added `-tune zerolatency` to FFmpeg builder arguments for `libx264`.
  - **WHY it didn't work**: The performance degraded compared to the baseline (~18.675s vs baseline ~17.574s). Forcing the encoder to skip its internal frame buffering didn't improve throughput over the IPC/Playwright bottleneck, and might have caused the encoder to work inefficiently, blocking standard input more frequently.
- **PERF-499: Raw WebSocket CDP Connection for Hot Loop**:
  Bypassing Playwright's `CDPSession` with a raw Node.js TCP/WebSocket connection to reduce IPC and JSON overhead did not improve performance. The render time (18.578s) was slower than the baseline (17.978s). The overhead of managing the WebSocket frames and native Node buffer handling in JavaScript might outweigh the Playwright IPC overhead.
- **PERF-503**: Enable Software Rasterizer
  - **What I tried**: Removed `--disable-software-rasterizer` and `--disable-gpu-compositing` from `GPU_DISABLED_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The software rasterizer overhead in a completely headless microVM environment was significantly worse than Playwright's default behavior, degrading median render time to 18.887s (baseline 17.687s).
  - **Outcome**: discard
- **PERF-500**: Reduce Intermediate JPEG Quality
  - **What I tried**: Reduced intermediate JPEG quality from 90 to 50 in `DomStrategy.ts`.
  - **WHY it didn't work**: Performance degraded (median ~16.729 vs baseline ~16.634). Visual degradation plus no speed improvements means this is a failure.
  - **Outcome**: discard
- **PERF-505**: Dedicated Browser Contexts per Worker
  - **What I tried**: Attempted to replace the single shared browser context in `BrowserPool.ts` with dedicated `browser.newContext()` contexts for each individual worker page to improve Chromium process isolation and CPU utilization.
  - **WHY it didn't work**: The overall render time worsened (median ~19.487s vs baseline ~18.763s). The additional overhead required to instantiate, trace, and coordinate multiple isolated browser contexts inside the Playwright microVM likely outweighs any potential thread contention benefits during DOM capture.
  - **Outcome**: discard
- **PERF-509**: Inline Stability Check Await
  - **What I tried**: Returned direct promise from defaultStabilityCheck without .then() closure overhead
  - **WHY it didn't work**: Did not improve performance over baseline (median ~18.03s vs baseline ~17.37s-19.93s).
  - **Outcome**: discard
- **PERF-513**: Raw Screencast without External Compositor
  - **What I tried**: Dropped `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` flags and replaced `HeadlessExperimental.beginFrame` capture loop with a passive `Page.startScreencast` event listener strategy with a timeout fallback.
  - **WHY it didn't work**: Regression of ~7% (median 21.406s vs baseline 19.93s). While `Page.startScreencast` does capture frames without needing external compositor control, the lack of deterministic frame emission requires arbitrary fallback timeouts (or waiting passively) when there is no visual damage. This passive wait mechanism delays the pipeline significantly compared to the proactive, deterministic pumping of `beginFrame`.
  - **Outcome**: discard

## Open Questions
- Inlining stability check promise resolution in CdpTimeDriver.ts
- The bottleneck is likely in V8 runtime boundaries or Playwright CDP IPC, meaning microtask queue optimizations yield no measurable performance improvement over the baseline.
- Plan ID: PERF-506
- Plan ID: PERF-518

## What Doesn't Work (and Why)
- **Reducing BrowserPool Concurrency to 2 or 1 (PERF-518)**: Tested reducing `concurrency` in `BrowserPool.ts` from 3 (calculated as `Math.max(1, os.cpus().length - 1)`) to 2, and then to 1 to reduce thread contention in the single Chromium process due to `--disable-site-isolation-trials`. Results showed performance degraded. With concurrency = 2, median render time was ~20.89s (vs baseline ~18.2s-20.6s). With concurrency = 1, median render time dropped to ~28.15s. This indicates that while thread contention exists, the benefits of partial parallelism via multiple browser pages outpace the overhead. The existing formula (`Math.max(1, (os.cpus().length || 4) - 1)`) works best in this CPU environment. Discarded the change.
- **PERF-528**: Eager Base64 Decoding & CdpTimeDriver Inlining
  - **What I tried**: Inlined the Base64 frame buffer decoding inside `runWorker` in `CaptureLoop.ts` to improve L1 cache locality, and inlined `runSetTime` logic in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The performance regressed heavily. The median render time increased to ~28.552s compared to the baseline. Eagerly decoding Base64 in the worker closure actually caused a slowdown, likely due to blocking the worker promise resolution while parsing the buffer, thus delaying the next frame cycle in a multi-worker pipeline.
  - **Outcome**: discard
- **PERF-531**: Increase CaptureLoop maxPipelineDepth Buffer
  - **What I tried**: Increased the `maxPipelineDepth` buffer multiplier in `CaptureLoop.ts` from `8` to `64`.
  - **WHY it didn't work**: The performance regressed. The median render time increased to ~19.206s compared to the baseline ~15.594s. Deepening the backpressure ring buffer likely increased memory overhead or V8 GC pressure without significantly improving throughput in this environment.
  - **Outcome**: discard
- **PERF-534**: Remove `--disable-breakpad` from Chromium arguments
  - **What I tried**: Removed `--disable-breakpad` from the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: The performance regressed heavily. The median render time increased to ~19.939s compared to the baseline ~15.594s. Leaving breakpad enabled likely introduced overhead in the headless chromium processes during high-frequency frame capture.
  - **Outcome**: discard

## What Doesn't Work (and Why)
- **Use WebP with image2pipe for Intermediate Formats** (PERF-535)
  - Tried changing the default intermediate screenshot format to `webp` and using the `image2pipe` FFmpeg demuxer (`-vcodec webp`).
  - **WHY it didn't work**: The benchmark immediately crashed with a pipeline error from FFmpeg: `Could not find codec parameters for stream 0 (Video: webp, none): unspecified size` and `Cannot determine format of input stream 0:0 after EOF`. FFmpeg's `image2pipe` parser natively failed to derive the dimensions of the initial incoming headless Chromium-produced base64-decoded WEBP frames, breaking the pipe before any valid video stream was initiated.
- **PERF-537**: Replace Runtime.evaluate with Runtime.callFunctionOn in CdpTimeDriver
  - **What I tried**: Attempted to replace `Runtime.evaluate` with `Runtime.callFunctionOn` in the `defaultSyncMedia` function of `CdpTimeDriver.ts`.
  - **WHY it didn't work**: Render time regressed to a median of ~18.790s vs baseline ~15.594s. Passing arguments and executing pre-compiled static functions over CDP `callFunctionOn` caused more protocol serialization overhead than just concatenating the strings and executing them via `Runtime.evaluate`, negating the V8 re-parsing savings.
  - **Outcome**: discard
- **PERF-533**: Limit FFmpeg Threads to Reduce CPU Contention
  - **What I tried**: Added `-threads 1` to the FFmpeg builder arguments for video encoding in `FFmpegBuilder.ts` to limit thread contention with Chromium and Node on the CPU.
  - **WHY it didn't work**: The render time regressed to a median of ~16.696s (and as bad as ~28.173s in one run) compared to the baseline of ~15.594s. Limiting FFmpeg to a single thread likely introduced a bottleneck on the encoding side that backed up the pipeline, forcing Chromium workers to wait, which negatively offset any thread contention gains.
  - **Outcome**: discard
- **PERF-539**: Disable Chromium Sandbox
  - **What I tried**: Added `--no-sandbox` and `--disable-setuid-sandbox` to the `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time did not improve over the baseline (~17.513s vs baseline ~17.175s). Although we disable process isolation in headless microVM, disabling the sandbox mechanisms directly does not decrease IPC overhead enough to speed up the high-frequency `beginFrame` capture loop.
  - **Outcome**: discard
- **PERF-540**: Eliminate Double Await for Virtual Time Policy in CDP Driver
  - **What I tried**: Replaced the double-wait promise architecture for advancing virtual time via CDP (`await new Promise(virtualTimePromiseExecutor)` and waiting for `Emulation.virtualTimeBudgetExpired`) with a simple `await this.client!.send('Emulation.setVirtualTimePolicy', ...).catch(() => {})`.
  - **WHY it didn't work**: The performance regressed significantly. The median render time increased to ~21.970s compared to the baseline (~10.7s with dedicated instances). The `Emulation.virtualTimeBudgetExpired` event listener is functionally required by Chromium to ensure that the headless compositor has fully resolved the requested time budget and flushed frame paints before the pipeline can request a new `beginFrame`. Without the event listener wait, the time budget loop falls out of sync, severely degrading capture loop throughput or causing excessive frame stalling.
  - **Outcome**: discard
