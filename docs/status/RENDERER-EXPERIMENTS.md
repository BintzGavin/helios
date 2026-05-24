## Performance Trajectory
Current best: 1.511s (baseline was 2.017s, -25%)
Last updated by: PERF-569

## What Works
- **PERF-505**: Dedicated Browser Contexts for Process Isolation
  - **What I did**: Evaluated assigning each worker its own dedicated `BrowserContext` to force isolated OS-level Chromium renderer processes instead of a single shared one. Discovered this is already implemented natively by the baseline `createPage` logic which spawns a new `BrowserContext` per worker.
  - **Impact**: Marked complete and kept natively. Median render time is ~1.511s.
  - **Plan ID**: PERF-505
- **PERF-569**: Removed `frameTimeTicks` from `DomStrategy.ts`. The median render time improved to ~1.511s (vs baseline ~2.017s). Removing the explicit frame time calculation and property assignment from the CDP payload reduces JSON payload size, eliminates per-frame arithmetic in the Node.js hot loop, and relies on Chromium's native virtual time fallback.
- **PERF-565**: Revert noDisplayUpdates bug
  - **What I did**: Changed `noDisplayUpdates` to `false` on `beginFrameParams` and `targetBeginFrameParams` in `DomStrategy.ts`.
  - **Improvement**: ~0.960s (Restored expected capture rendering overhead). Reverts the critical bug introduced in PERF-562 where `noDisplayUpdates: true` completely skipped frame rendering and caused output videos to be blank.
- **PERF-560**: Pre-evaluate Sync Media Status in CdpTimeDriver
  - **What I did**: Removed the redundant `Runtime.evaluate` block that queries `document.querySelectorAll('video, audio').length > 0` over CDP during initialization. Replaced it with purely setting `syncMediaState = hasMedia ? 1 : 2`.
  - **Improvement**: ~9.980s (No statistically significant time change, but it removes a completely redundant IPC roundtrip during Phase 3 `prepare()`).
- **PERF-559**: Fix frameTimeTicks scale
  - **What I did**: Changed `frameTimeTicks = 10000 + frameTime` to `10000 + (frameTime * 1000)` in `DomStrategy.ts` to correctly scale seconds to milliseconds as required by Chromium's CDP.
  - **Improvement**: ~9.980s (negligible performance impact but correctness/accuracy fix)
- **Remove --disable-dev-shm-usage Optimization (PERF-542)**
  - Removed `--disable-dev-shm-usage` from `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - Render time improved slightly to ~10.002s (vs baseline ~11.931s on this runner). Allowed Chromium to use faster RAM-backed `/dev/shm` shared memory for IPC instead of `/tmp`.
- **In-Memory Frame Encoding Optimization (PERF-541)**
  - Replaced `--process-per-tab` with `--single-process` in `DEFAULT_BROWSER_ARGS` to eliminate Chromium's internal process-to-process IPC.
  - Render time improved to ~10.046s from the ~10.760s baseline.
- **PERF-449**: Skip Media Sync CDP Call in CdpTimeDriver When No Media Exists
  - **What I did**: Evaluated media presence during driver initialization and bypassed the `sync_media` CDP IPC call in the `runSetTime` hot loop if no media elements are present.
  - **How much it improved**: ~1% faster (median ~10.516s vs baseline ~10.640s).
  - **Plan ID**: PERF-449
- **Dedicated Browser Instances (PERF-526)**
  - **What I did**: Updated `BrowserPool.ts` to launch a dedicated Chromium browser instance per worker page instead of sharing a single browser context.
  - **How much it improved**: ~37% faster (median ~10.480s vs baseline ~17.071s).
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
- [FAILED] Skipping base64 payload serialization on identical frames via dirty tracking (PERF-572) - Flawed heuristic misses CSS animations, scrolling, Canvas/WebGL updates, etc.
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)


- **PERF-562**: Set noDisplayUpdates to true
  - **What I tried**: Changed `noDisplayUpdates` to `true` on `beginFrameParams` and `targetBeginFrameParams` in `DomStrategy.ts`.
  - **WHY it didn't work**: While it seemed to massively improve benchmark times (median ~0.622s), it was a false positive. Setting this flag true skips the display compositor entirely, resulting in blank/black screenshot data being returned. The performance "gain" was just the speed of not doing the work.
  - **Outcome**: discard (reverted by PERF-565)
- **PERF-564**: Evaluate WebCodecs Fallback for DomStrategy
  - **What I tried**: Attempted to implement a WebCodecs fallback in `DomStrategy` by rasterizing the DOM into a hidden canvas via DOM-to-SVG-to-Canvas (`XMLSerializer` + `foreignObject`) to bypass Playwright's base64 IPC overhead.
  - **WHY it didn't work**: The overhead of serializing the DOM, encoding it to an SVG string, and rasterizing it onto a canvas via an `Image` object is massively slower (~600-1300ms per frame) compared to Chromium's native `HeadlessExperimental.beginFrame` screenshot capture (~20ms per frame). This completely nullified any savings from avoiding base64 serialization and Playwright IPC. Furthermore, capturing computed styles for animations is extremely complex and brittle.
  - **Outcome**: discard
- **PERF-555**: Disable Chromium IPC Flooding Protection
  - **What I tried**: Added `--disable-ipc-flooding-protection` and `--disable-hang-monitor` to the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time degraded to ~10.851s compared to the baseline ~10.002s. While the intention was to prevent Chromium from throttling our high-frequency CDP commands, these flags did not yield a performance improvement and actually introduced a measurable slowdown, likely due to side effects in process scheduling or event loop polling in headless mode.
  - **Outcome**: discard
- **PERF-514**: Optimize BrowserPool Concurrency Formula
  - **What I tried**: Changed the concurrency calculation in `BrowserPool.ts` from `Math.max(1, (os.cpus().length || 4) - 1)` to a hardcoded `2`.
  - **WHY it didn't work**: The median render time significantly degraded to ~25.049s compared to the baseline of ~10.002s. By lowering the concurrency from the dynamically calculated 3 down to 2, the total capture throughput dropped. It appears the CPU still benefits from having at least 3 active workers generating frames simultaneously even if they are in the same or separate processes.
  - **Outcome**: discard
- **PERF-544**: Remove try-catch blocks from hot loop in DomStrategy
  - **What I tried**: Rewrote the `capture()` method in `DomStrategy.ts` so that the await uses a native promise chain with `.catch()` instead of setting up a `try...catch` scope on every frame.
  - **WHY it didn't work**: The performance regressed or showed no clear improvement. The median render time was ~10.509s compared to the baseline ~10.046s. The V8 overhead of setting up a block scope to capture exceptions on every loop iteration is extremely small and chaining a promise `.catch()` likely introduces comparable or worse microtask scheduling overhead.
  - **Outcome**: discard
- **PERF-546**: Disable Site Isolation
  - **What I tried**: Added `--disable-site-isolation-trials` and `IsolateOrigins,site-per-process` to the `--disable-features` flag in `BrowserPool.ts`.
  - **WHY it didn't work**: The performance degraded slightly, yielding a median render time of ~10.704s compared to the baseline of ~10.046s. Disabling site isolation in this specific microVM environment likely interfered with Playwright's internal assumptions or Chromium process scheduling without yielding enough IPC reduction to overcome those overheads.
  - **Outcome**: discard

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

- **PERF-561**: Explicitly set noDisplayUpdates to false in beginFrame
  - **What I tried**: Explicitly added `noDisplayUpdates: false` to `beginFrameParams` and `targetBeginFrameParams` in `DomStrategy.ts`.
  - **How much it improved**: The median render time on the dom-benchmark improved from ~1.448s to ~1.304s (approx 10% faster) on a 150-frame microVM benchmark by bypassing unoptimized synchronization paths inside Chromium for screenshot captures.
  - **Outcome**: keep

## Open Questions
- Inlining stability check promise resolution in CdpTimeDriver.ts
- The bottleneck is likely in V8 runtime boundaries or Playwright CDP IPC, meaning microtask queue optimizations yield no measurable performance improvement over the baseline.
- Plan ID: PERF-506
- Plan ID: PERF-518

## What Doesn't Work (and Why)
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)


- **PERF-516**: Bypass Playwright Evaluate
  - **What I tried**: Replaced `await frame.evaluate(...)` with a raw CDP `Runtime.evaluate` in `CdpTimeDriver.ts` to check if a page has media before running media synchronization.
  - **WHY it didn't work**: Performance regressed to ~11.414s compared to the baseline of ~10.046s. This one-time evaluation happens during page initialization/setup, not in the hot loop (unlike `defaultSyncMedia` which was already optimized). Inlining this single check offered no measurable improvement in the hot loop, but likely suffered from slightly less optimized Playwright setup code paths.
  - **Outcome**: discard
- **PERF-547**: Disable Skia Wait and Color Profile Overheads
  - **What I tried**: Added `--disable-color-correct-rendering` and `--disable-skia-runtime-opts` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The performance degraded (median ~10.306s vs baseline ~10.002s). Disabling these runtime optimizations likely interfered with Chromium's internal rendering assumptions for the headless software rasterizer, introducing more overhead than they saved.
  - **Outcome**: discard
- **PERF-548**: Remove Synchronous Threading Flags in Single-Process Mode
  - **What I tried**: Removed `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`, and `--disable-smooth-scrolling` from the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time degraded to ~10.423s vs the baseline of ~10.002s. While `--single-process` makes the browser conceptually single-threaded, these flags actually force deterministic execution of rendering operations within the main frame loop. Removing them allows Chromium to try offloading work to threads it doesn't have in this context, or breaks the synchronous pipeline expected by the deterministic `beginFrame` capture loop, leading to wait timeouts or stalls.
  - **Outcome**: discard
- **PERF-545**: Disable GPU Memory Buffer Optimization
  - **What I tried**: Added `--disable-gpu-memory-buffer-video-frames` and `--disable-gpu-memory-buffer-compositor-resources` to `GPU_DISABLED_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The performance degraded (median ~10.977s vs baseline ~10.046s). Forcing Chromium to disable GPU memory buffers likely interfered with some internal optimization or hardware abstraction layer paths, negating the expected CPU-memory allocation benefits.
  - **Outcome**: discard
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
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)


- **PERF-558**: Disable V8 Idle Tasks
  - **What I tried**: Added `--disable-v8-idle-tasks` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time regressed to ~11.118s (vs baseline ~10.002s). While preventing V8 from running background garbage collection and idle tasks was intended to reduce CPU contention, it likely forced those necessary tasks to run synchronously or accumulate, causing larger micro-stutters that delayed the frame capture loop.
  - **Outcome**: discard
- **PERF-005**: Raw CDP Screencast
  - **What I tried**: Replaced `HeadlessExperimental.beginFrame` with `Page.startScreencast` in `DomStrategy.ts` to stream frames natively via CDP without compositor synchronization.
  - **WHY it didn't work**: Severe performance regression and pipeline breakage (render time ~101s vs baseline ~18.5s). `Page.startScreencast` natively pushes frames inconsistently, dropping them when visual changes do not meet damage thresholds, which creates deadlock timeouts and truncates the FFmpeg `mjpeg` bitstream in our deterministic capture pipeline.
  - **Outcome**: discard
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
- **PERF-524**: Increase CaptureLoop maxPipelineDepth Buffer
  - **What I tried**: Increased the `maxPipelineDepth` buffer multiplier in `CaptureLoop.ts` from `8` to `64`.
  - **WHY it didn't work**: The performance regressed or showed no meaningful improvement. The median render time was ~10.107s, which is slightly worse than the baseline ~10.046s. Deepening the backpressure ring buffer likely increased memory overhead or V8 GC pressure without significantly improving throughput in this environment.
  - **Outcome**: discard
- **PERF-548**: Remove Synchronous Threading Flags in Single-Process Mode
  - **What I tried**: Removed `--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`, and `--disable-smooth-scrolling` from the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time degraded to ~10.676s vs the baseline of ~10.002s. While `--single-process` makes the browser conceptually single-threaded, these flags actually force deterministic execution of rendering operations within the main frame loop. Removing them allows Chromium to try offloading work to threads it doesn't have in this context, or breaks the synchronous pipeline expected by the deterministic `beginFrame` capture loop, leading to wait timeouts or stalls.
  - **Outcome**: discard
- **PERF-549**: Bypass CDP Evaluate on No Media (try-catch strictness)
  - **What I tried**: Modified the `try-catch` blocks in `CdpTimeDriver.ts` that attempt to evaluate the presence of media during initialization. Instead of defensively setting `this.hasMedia = true` and `this.syncMediaState = 1` on exception, changed the default fallback to `false` and `2` respectively, aiming to definitively avoid CDP syncing overhead for pages without media.
  - **WHY it didn't work**: Render performance showed no meaningful improvement (median ~10.531s vs baseline ~10.408s). Although this strictly prevents unnecessary syncing if the evaluation throws an exception, Playwright's CDP `Runtime.evaluate` overhead for `document.querySelectorAll('video, audio').length > 0` typically succeeds safely on headless Chromium setups anyway, so this edge case optimization didn't address the primary bottleneck for the hot loop in most stable pipelines. Since the baseline was roughly equivalent, the change was discarded to avoid overly pessimistic assumptions during Playwright context instantiation timeouts.
  - **Outcome**: discard
- **PERF-550**: Inline CDP evaluate parameters to bypass object mutation overhead
  - **What I tried**: Attempted to replace the pre-allocated `singleFrameSyncMediaParams` object mutation with fresh inline object literals in the `defaultSyncMedia` function of `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The performance regressed significantly. The median render time increased to ~14.046s compared to the baseline ~10.002s. In the extremely hot frame loop, rapidly allocating fresh object literals for every single frame and relying on the V8 nursery for garbage collection introduced more overhead (likely due to GC pauses or un-optimized object shapes) than simply mutating a pre-allocated object whose hidden classes were already stabilized.
  - **Outcome**: discard
- **PERF-551**: Disable Chromium Logging
  - **What I tried**: Added `--disable-logging` and `--log-level=3` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **WHY it didn't work**: The median render time did not improve meaningfully (median ~10.148s vs baseline ~9.958s). Suppressing the internal logs in headless mode does not significantly decrease IPC or CPU overhead, likely because the headless Chromium instance does not produce enough background logs in a deterministic environment to cause measurable pipeline latency. The benefits of hiding output do not outweigh the cost to debuggability.
  - **Outcome**: discard
- **PERF-552**: Inline multiFrameSyncMediaParams allocation
  - **What I tried**: Replaced the `multiFrameSyncMediaParams` array allocation and object mutation logic in `CdpTimeDriver.ts` with direct inline object literal allocations sent to `Runtime.evaluate` in the hot loop.
  - **WHY it didn't work**: The median render time (~9.955s) did not significantly improve over the baseline (~10.002s). Any minor optimization from avoiding array management was offset or negated by V8 having to rapidly allocate and garbage-collect new inline object literals on every frame loop instead of mutating a pre-allocated structure.
  - **Outcome**: discard
- **PERF-553**: FFmpeg Input Stream Probesize Optimization
  - **What I tried**: Added `-probesize 32` and `-analyzeduration 0` to the FFmpeg video input arguments in `DomStrategy.ts` to bypass the stream analysis phase for the deterministic incoming frame pipe.
  - **WHY it didn't work**: The median render time (~10.562s) did not significantly improve over the baseline (~10.575s). Since we already explicitly declare `-f mjpeg` and `-framerate 60`, FFmpeg's stream analysis overhead on the deterministic single-image pipe was already negligible. The slight variance was entirely within the margin of noise for the headless environment.
  - **Outcome**: discard
- **PERF-556**: Bypass Await in DomStrategy Capture
  - **What I tried**: Modified `capture` method in `DomStrategy.ts` to return the promise chain `.then()` directly rather than using `try...catch` and `await`, prebinding success and error handlers to avoid closure allocation.
  - **WHY it didn't work**: The median render time regressed to ~10.688s (vs baseline ~10.002s). While returning the promise directly avoids the explicit `await` suspension point within the `capture` function's execution context, passing prebound handlers to `.then()` still introduces microtask scheduling overhead. V8's native async/await state machine optimization for a single awaited promise is faster than manual promise chaining in this highly optimized hot loop.
  - **Outcome**: discard
- **PERF-557**: Pre-evaluate Stability State in CdpTimeDriver
  - **What I tried**: Removed the conditional `stabilityCheckState === 0` logic from the `runSetTime` hot loop in `CdpTimeDriver.ts` and moved it entirely into the `prepare` phase to evaluate if the custom stability function (`waitUntilStable`) existed before the capture loop started.
  - **WHY it didn't work**: Although the unit test for `CdpTimeDriver` passing indicated that moving the check works logically (since we can confirm evaluation at setup), performance-wise it offered no measurable improvement (median simulated advance time remained ~101ms, identical to baseline). More critically, the implementation change triggered downstream dependency import failures in integration layers (`@helios-project/core` couldn't resolve `TimeDriver`), meaning it broke fundamental contract expectations of Playwright's shared CDP session when applied out-of-order in the initialization lifecycle. Given no performance gain and severe pipeline brittleness, it was rolled back.
  - **Outcome**: discard

## What Doesn't Work (and Why)
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)


- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-515**: Raw CDP evaluate for initialization media check
  - **What I tried**: Replaced Playwright's `frame.evaluate` in `CdpTimeDriver.ts` initialization with direct CDP `Runtime.evaluate` to avoid Playwright overhead, and cleaned up the `executionContextIds` fallback blocks.
  - **WHY it didn't work**: The performance significantly regressed. The median render time increased to ~1.436s (baseline was ~0.960s). Even though it was moved out of the hot loop, altering the initialization phase by bypassing Playwright's execution context synchronization caused the internal pipeline to stall and de-sync, leading to longer execution latency across the entire trace. Since `PERF-560` already optimized the initialization logic efficiently, this caused a performance hit.
  - **Outcome**: discard

- **PERF-554**: Disable Chromium IPC Flooding Protection
  - **What I tried**: Added `--disable-ipc-flooding-protection` and `--disable-hang-monitor` to the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: Render time regressed compared to the highly optimized baseline (median ~1.193s with flags vs baseline ~1.147s). While intended to prevent Chromium from throttling our high-frequency CDP commands, these flags introduced a measurable slowdown, likely due to side effects in process scheduling or event loop polling in the single-process headless mode environment.
  - **Outcome**: discard
- **PERF-555**: Disable Chromium IPC Flooding Protection (Retry)
  - **What I tried**: Added `--disable-ipc-flooding-protection` and `--disable-hang-monitor` to the `DEFAULT_BROWSER_ARGS` array in `BrowserPool.ts`.
  - **WHY it didn't work**: Render time did not improve and slightly regressed compared to the highly optimized baseline (median ~0.646s with flags vs baseline ~0.636s). While intended to prevent Chromium from throttling our high-frequency CDP commands, these flags did not improve throughput in our headless single-process microVM setup, confirming findings from PERF-554.
  - **Outcome**: discard
- **PERF-563**: Disable Additional Chromium Features
  - **What I tried**: Appended `IsolateOrigins,site-per-process` to the `--disable-features` array in `BrowserPool.ts` to strictly disable background site isolation trials.
  - **WHY it didn't work**: Render time did not meaningfully improve compared to the baseline (~0.582s median with flags). Disabling these features didn't suppress background processes enough to gain speed on the deterministic `beginFrame` capture loop, likely because they were already practically suppressed or inactive in a single-domain `file://` context in a microVM headless state.
  - **Outcome**: discard
- **PERF-567**: Test `Page.captureScreenshot` vs `HeadlessExperimental.beginFrame`
  - **What I tried**: Replaced Playwright's `HeadlessExperimental.beginFrame` with `Page.captureScreenshot` in `DomStrategy.ts` using the existing `CdpTimeDriver.ts` virtual time advancement.
  - **WHY it didn't work**: The renderer process completely hung and timed out during the benchmark. Without the explicit compositor synchronization provided by `HeadlessExperimental.beginFrame`, `Page.captureScreenshot` stalled in headless mode when time was explicitly paused/controlled. `beginFrame` is strictly required to force the compositor to produce deterministic frames when time is frozen.
  - **Outcome**: discard
- **PERF-568**: Prebind Stability Check in CdpTimeDriver.ts
  - **What I tried**: Replaced the `stabilityCheckState` variable with a dynamic function property `performStabilityCheck` to implement a state machine and remove the conditional `if (this.stabilityCheckState === 0)` branch from the hot loop `runSetTime`.
  - **WHY it didn't work**: The median render time (4.792s) did not improve and slightly regressed compared to the baseline (4.768s). While V8 branch prediction is highly optimized, the overhead of invoking a dynamic function reference on every frame loop iteration is marginally higher than a well-predicted simple integer comparison.
  - **Outcome**: discard

## What Doesn't Work (and Why)
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)

- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)


- **PERF-566: Use webp_pipe Demuxer for WEBP Intermediate Format:** Tried to use `webp_pipe` instead of `image2pipe` to handle WEBP format frames coming from CDP. The FFmpeg process still crashes with "Could not find codec parameters for stream 0 (Video: webp, none): unspecified size" and "pipe:: Invalid argument". It seems decoding raw WEBP piped streams in this version of FFmpeg still requires explicit dimensions or different demuxing, making WEBP format over pipe unusable currently.
- **PERF-507: Eliminate defaultStabilityCheck method and inline logic**
  - **What I tried**: Attempted to inline `defaultStabilityCheck` directly into `runSetTime` in `CdpTimeDriver.ts`.
  - **WHY it didn't work**: The `defaultStabilityCheck` method had already been eliminated in previous iterations (likely PERF-506) and the `Runtime.evaluate` call was already inlined. This experiment was discarded as a duplicate with no code changes.
  - **Outcome**: discard (duplicate)
- **PERF-513**: Enable Site Isolation for Multi-Core Concurrency
  - **What I tried**: Removed `--single-process` and added `--process-per-tab` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts` to allow Chromium to distribute the rendering workload across multiple processes.
  - **WHY it didn't work**: The median render time (1.600s to 2.303s) actually improved slightly over the microVM baseline (2.209s), but variance was huge, and in general, managing multiple renderer processes per tab caused higher instability and CPU contention without consistent throughput improvements compared to the highly optimized single-process headless architecture. The experiment was discarded because it didn't demonstrate a consistent, clear win over the established baseline and introduced noise.
  - **Outcome**: discard
- **PERF-570**: Remove interval from beginFrameParams
  - **What I tried**: Removed the interval property from beginFrameParams and targetBeginFrameParams in DomStrategy.ts.
  - **WHY it didn't work**: The median render time change (~1.481s vs baseline ~1.494s) was well within the margin of error (~0.8%). The optimization did not demonstrate a clear improvement over the noise threshold, so it was discarded to avoid changing a potentially critical parameter for Chromium's internal compositor pacing synchronization without clear benefit.
  - **Plan ID**: PERF-570
- **PERF-571**: Remove `optimizeForSpeed: true` from intermediate CDP screenshot params
  - **What I tried**: Removed `optimizeForSpeed: true` from the CDP screenshot parameters in `DomStrategy.ts`. Hypothesized that skipping optimization would slightly increase Chromium CPU time but produce smaller Base64 payloads to reduce Playwright IPC/JSON parsing overhead.
  - **WHY it didn't work**: Resulted in a negligible performance change/slight regression (median ~1.585s vs baseline ~1.469s) indicating the IPC payload savings from smaller images didn't outweigh the additional CPU cost in Skia compressing the JPEGs.
  - **Outcome**: discard

## Performance Trajectory
Current best: 1.449s (baseline was 1.511s, -4.1%)
Last updated by: PERF-573

## What Works
- **Optimize capture allocation** (`PERF-573`): Removed block-scoped variable allocation and logic operator branching in the CDP `capture` hot loop inside `DomStrategy.ts`. Decreased GC pressure resulting in a ~4.1% performance improvement, reaching a median render time of 1.449s.
- **PERF-574**: BrowserPool Concurrency
  - **What I tried**: Modified `BrowserPool.ts` concurrency calculation from `Math.max(1, (os.cpus().length || 4) - 1)` to `Math.max(1, (os.cpus().length || 4) * 2 - 1)` to oversubscribe workers.
  - **WHY it didn't work**: The median render time regressed to ~1.650s compared to the baseline of ~1.368s. Although Playwright IPC and Chromium's CDP `beginFrame` loop are heavily I/O bound, oversubscribing workers in a CPU-constrained microVM (e.g. 7 workers on a 4-core machine) introduced too much context-switching overhead and CPU contention. The existing formula correctly balances process scheduling and thread pooling for the current headless deployment without saturating Node's event loop with parallel CDP wait routines.
  - **Outcome**: discard

- **PERF-488**: Eliminate Spurious Wakeups and Redundant Checks
  - **What I tried**: Evaluated eliminating spurious wakeups and redundant checkState calls in CaptureLoop.ts.
  - **WHY it didn't work**: The optimizations are already natively implemented in the baseline codebase.
  - **Outcome**: discard (already implemented)
- **PERF-491**: Eliminate Redundant checkState calls
  - **What I tried**: Evaluated removing redundant checkState calls in CaptureLoop.ts.
  - **WHY it didn't work**: The optimization is already natively implemented in the baseline codebase.
  - **Outcome**: discard (already implemented)
- Pre-check freeWorkersHead in CaptureLoop orchestrator: ~2% faster (PERF-575)
- **PERF-576**: BrowserPool Concurrency Exact Match
  - **What I tried**: Modified `BrowserPool.ts` concurrency calculation from `Math.max(1, (os.cpus().length || 4) - 1)` to `Math.max(1, (os.cpus().length || 4))` to match the number of workers exactly to the number of logical cores.
  - **WHY it didn't work**: The median render time did not improve and remained roughly the same as the baseline (~1.529s vs baseline ~1.541s). There was no significant throughput improvement, indicating that leaving one core free (the baseline) is sufficient and matching exactly the number of cores does not alleviate the Playwright CDP IPC wait time bottleneck. Therefore, the experiment was discarded as inconclusive noise.
  - **Outcome**: discard
- **PERF-512**: Test raw CDP Screencast vs HeadlessExperimental.beginFrame
  - **What I tried**: Removed `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` from `BrowserPool.ts` and replaced `HeadlessExperimental.beginFrame` with `Page.startScreencast` using a small fallback timeout for damage-less frames in `DomStrategy.ts`.
  - **WHY it didn't work**: The median render time regressed to ~1.664s compared to the baseline of ~1.515s. Without the deterministic explicit synchronization provided by `beginFrame` and Chromium's external compositor control, falling back to timeouts for static frames and relying purely on screencast frame emission overhead is slower and less efficient than directly advancing and reading frames in lockstep.
  - **Outcome**: discard
- **PERF-513**: Test raw CDP Screencast without external compositor control
  - **What I tried**: Removed `--enable-begin-frame-control` and `--run-all-compositor-stages-before-draw` from `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`. Replaced `HeadlessExperimental.beginFrame` with `Page.startScreencast` and a short timeout fallback in `DomStrategy.ts`.
  - **WHY it didn't work**: The median render time regressed to ~1.801s compared to the baseline of ~1.511s. Relying on screencast frame emission with a timeout fallback for static frames is slower and less efficient than directly advancing and reading frames deterministically in lockstep using `beginFrame`.
  - **Outcome**: discard
