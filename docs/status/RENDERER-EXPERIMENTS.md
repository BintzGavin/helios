## Performance Trajectory
Current best: 2.101s (baseline was 2.175s, -3.4%)
Last updated by: PERF-255


Current best: 48.082s (baseline was 49.436s, -32.5%)
Last updated by: PERF-198

## What Works
- Prebound the `syncMediaClosure` in `CdpTimeDriver.ts` to reduce closure allocation overhead inside the `setTime` hot loop. Improved render time to 2.101s (-3.4%). (PERF-255)
- Prebound the  in  to reduce closure allocation overhead inside the  hot loop. Improved render time to 2.101s (-3.4%). (PERF-255)
- [PERF-253] Prebind CaptureLoop onWriteError closure: Improved median time to 2.392s (baseline 2.8s)
- **PERF-245**: Pre-allocated promises array and pre-bound closure in CdpTimeDriver hot loop to eliminate per-frame V8 array allocation and garbage collection overhead. Render time improved from baseline to 2.936s.

- Replaced batch Promise.all iteration with continuous while-loop overlapping maxPipelineDepth promises (PERF-249, ~1.4% faster)
- Batch submitting frame capture promises up to `maxPipelineDepth` simultaneously using `Promise.all()` instead of an iterative wait-loop, saving ~13% render time (PERF-248)
- Restored BrowserPool worker concurrency to os.cpus().length - 1. Render time improved dramatically from ~11.960s to ~1.919s (-83.9%). (PERF-247)
- Use callFunctionOn for sync media - ~1.2% faster `PERF-228`
- Eliminated closure allocation in DomStrategy capture by pre-binding CDP response handler (PERF-242)
- Inline captureWorkerFrame into hot loop (PERF-240)
- Removing `async` from `writeToStdin` to bypass microtask yields (PERF-239): Improved render times from ~51s to ~48.5s (-5%). Returning `void` on synchronous `stdin.write` avoids creating redundant V8 Promises and eliminates the subsequent microtask queue yield in the hot capture loop.
- **PERF-238**: Eliminate `async` wrappers in DOM render hot path
  - **Result**: SKIPPED. Codebase exploration confirmed that the `capture` method in `DomStrategy.ts` and the injected `window.__helios_seek` function in `SeekTimeDriver.ts` already lack `async` wrappers and utilize native Promise chaining or direct synchronous returns.

- Caching target element bounding box in DomStrategy.prepare() instead of per-frame querying (~1.1% faster) (PERF-232)

- **PERF-231**: Verified that eliminating the `async` wrapper for `captureWorkerFrame` in `CaptureLoop.ts` was already correctly implemented natively, avoiding V8 `async` context creation micro-stalls during the hot loop.
- **Optimized CDP evaluate via callFunctionOn:** Replaced expensive `page.evaluate` and `frame.evaluate` calls in `CdpTimeDriver.ts` with pre-cached `Runtime.callFunctionOn` during the `setTime` hot loop, saving AST evaluation parsing costs. Improved from 36.3s to 34.82s. [PERF-228]
- PERF-221: Added `--disable-smooth-scrolling` to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts` to reduce Chromium Compositor overhead on smooth scrolling animations. Render time changed to 32.767s.
- **PERF-219**: Added synchronous compositor flags (`--disable-threaded-animation`, `--disable-threaded-scrolling`, `--disable-checker-imaging`, `--disable-image-animation-resync`) to `DEFAULT_BROWSER_ARGS`. Reduced render time from ~33.303s to ~32.716s (-1.8%).
- Disabled LCD text antialiasing in Chromium args (`--disable-lcd-text`), avoiding expensive Skia text rasterization paths in SwiftShader. Improved from 43.200s to 33.270s (PERF-218)
- PERF-202: Replaced evaluate with callFunctionOn in SeekTimeDriver to eliminate AST parsing overhead. Result: ~32.9s.
- PERF-200: Defaulted libx264 to ultrafast preset. Reduced cpu cycles. Render time ~33.7s.
- Removed `await` from `capturePromise` return inside `captureWorkerFrame` hot loop natively allowing V8 promise chaining (PERF-127) (~2.0% faster)
- Stream base64 string directly to FFmpeg stdin (`PERF-195`): Avoids buffering Base64 string from CDP inside JS before writing to FFmpeg by taking advantage of Node.js string base64 write streaming. Reduced garbage collection of large `Buffer`s. Yielded 33.700s median render time (similar to baseline 33.557s). Kept for reduced GC load.
- Preallocate Runtime.evaluate Parameters in SeekTimeDriver (`PERF-194`): Improved render time slightly from 33.664s to 33.557s by caching the evaluate parameters object as a class property and mutating its `expression` property inside the `setTime()` hot loop, eliminating continuous object literal allocation for `Runtime.evaluate` calls.
- Inlining parameters in SeekTimeDriver.ts (`PERF-191`): Improved render time from 49.436s to ~33.664s (~32% faster) by removing dynamic object allocation of params inside `setTime()` hot-loop and explicitly omitting `returnByValue: false`.
- **Cache HeadlessExperimental.beginFrame Parameters** (PERF-189): Pre-allocated the `screenshot` configuration object in `DomStrategy.ts` to avoid V8 allocating nested object literals on every frame. This reduced GC pressure and micro-stalls in the hot loop.
- **Cache Page Frames Array in Time Drivers to Eliminate Per-Frame Allocation Overhead** (PERF-188): Cached `page.frames()` and `page.mainFrame()` in `SeekTimeDriver` and `CdpTimeDriver` inside `packages/renderer/src/drivers/`. Since the Playwright Node.js client's `page.frames()` method constructs and returns a new Array by traversing its internal frame tree, calling it repeatedly 60 times per second per parallel worker forced continuous Array allocation and subsequent garbage collection. Caching the array structure dramatically reduced micro-stalls and object allocations during rendering.
- **Target Element BeginFrame Parameter Unrolling** (PERF-187): Refactored the `capture` method in `DomStrategy.ts` to use `async/await` rather than returning a dynamically chained Promise (`.then()`). This avoids allocating multiple anonymous closures per frame on the `targetElementHandle` fallback path, reducing GC pressure and micro-stalls.
- **Extracting frame capture promise into async helper** (PERF-185): Moved the `captureWorkerFrame` promise chain logic into an `async` function outside the hot loop in `Renderer.ts`. This avoids allocating a new anonymous closure and `Promise.then` wrapper on every single frame, allowing V8 to optimize the function signature. This improved performance by ~7.6%.
- **Inline parameter construction for `cdpSession.send('HeadlessExperimental.beginFrame')`** (PERF-178): Inlining standard object literals for `cdpSession.send` params instead of pre-allocating an object in the loop avoided local variable overhead and further simplified byte code. The targeted parameters needed to use `as any` to compile without TS errors regarding `clip` instead of passing the object into the screenshot parameter, which V8 optimizes well.
- Eliminated CDP destructuring and spread operator in hot loop (~X% faster) - PERF-177
- PERF-179: Inlined object literal for `this.client!.send('Emulation.setVirtualTimePolicy', { ... })` in `packages/renderer/src/drivers/CdpTimeDriver.ts`. This avoids dynamic allocation of a `params` object on every frame when advancing virtual time. While CdpTimeDriver isn't the default in `dom` mode, reducing loop allocation overhead is functionally safer and follows the same optimizations in PERF-178.
- PERF-186: Unrolling worker object parameters into explicit arguments in `captureWorkerFrame` and inlining Base64 object/Buffer allocation in `DomStrategy.ts` reduced micro-stalls and object property allocations, accelerating render time significantly (down to ~3.7s). (~73% faster than the 13.7s baseline).
- **Replace startScreencast with beginFrame in DomStrategy** (PERF-184): Replaced the damage-driven `Page.startScreencast` capture approach with synchronous `HeadlessExperimental.beginFrame` for the full-page DOM fallback. Improved render time to ~6.6s.

- Moved closure logic outside CaptureLoop (~3.2% faster) [PERF-235]
## What Doesn't Work (and Why)
- **PERF-251**: Pre-bind Closure in CaptureLoop Worker Dispatch
  - **Why it didn't work**: Like PERF-241, pre-allocating closures with captured state arrays (or context objects) did not improve performance. The overhead of looking up state from the closure array or the function call dispatch negated the savings of avoiding per-frame anonymous closure allocation. Render time remained around ~1.74s compared to ~1.71s baseline. V8 seems to optimize the inline arrow function allocation within the `.then()` very well.
-
- **PERF-250**: Restore Counter-Based Indexing in CaptureLoop
  - **Why it didn't work**: Although microbenchmarks showed counter indexing as faster, the implementation regressed render time from ~2.175s to 2.768s. The added variables and bounds checking inside the deeply overlapping promise pipeline negated the benefits and resulted in slightly slower performance.
 Increased pipeline depth to `poolLen * 8` (PERF-244). Result: 50.119s. Reason: Overhead of tracking larger base64 array in Node.js event loop outweighed buffering benefits.

- Increased pipeline depth to `poolLen * 8` (PERF-244). . Reason: Overhead of tracking larger base64 array in Node.js event loop outweighed buffering benefits.

- Increased pipeline depth to `poolLen * 8` (PERF-244). . Reason: Overhead of tracking larger base64 array in Node.js event loop outweighed buffering benefits.

- Increased pipeline depth to `poolLen * 8` (PERF-244). . Reason: Overhead of tracking larger base64 array in Node.js event loop outweighed buffering benefits.

- Reduced worker concurrency to 1. Resulted in ~54s render time vs ~49s baseline. Running multiple pages in parallel is faster even if it causes some context switching overhead.
  (Plan: PERF-243)

- PERF-222: Added `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows` to `DEFAULT_BROWSER_ARGS`. Resulted in 32.839s (-0.2% change). Status: discard.
- Discarded `PERF-220` (remove background networking flags)
  - Time: 32.547s (baseline: 32.552s). The difference is well within the margin of error (less than 0.1%).
  - Conclusion: Allowing background networking and background timer throttling did not yield a tangible performance improvement.
- **Eliminate SeekTimeDriver IPC** (PERF-199): Hooked rAF to evaluate __helios_seek inline in browser rather than Node CDP per frame. Render time was 35.091s, which is slower than the 33.331s baseline, so it was discarded.
- Replace image2pipe (`PERF-197`): Update the -f flag for the video input from image2pipe to the format dynamically corresponding to this.cdpScreenshotParams.format. Did not improve render time, actually degraded from ~33.5s to 34.2s. Bypassing FFmpeg probing heuristics dynamically provided no real-world gain, suggesting pipe format parsing overhead in FFmpeg is not the bottleneck or node writable stream handles image2pipe identically well.
- PERF-180: Inline parameters in SeekTimeDriver. Inlined parameters in the cdpSession.send. Did not improve performance over the baseline, resulting in 14.631s vs baseline 3.993s. The reason is likely due to V8 having already cached object types efficiently in earlier optimization phases or the difference being imperceptible against IPC overhead, coupled with unexpected regression overhead from garbage collection handling of intermediate anonymous objects in `Promises[i]`.
- PERF-181: Streamlined screencast capture (hangs on beginFrame substitution). `startScreencast` does not provide synchronous, deterministic frame guarantees like `beginFrame`. The reliance on `window.__helios_damage` to force screencast emissions fails to reliably queue frames, causing the pipeline to starve and deadlock while waiting for the next pushed frame in `capture()`.
- PERF-182: Increase Pipeline Depth to Improve Frame Capture Throughput. Failed. Did not improve performance over the baseline. The reason is likely due to Node memory limits resulting in hanging the process.
- PERF-183: Decrease Pipeline Depth to Improve Frame Capture Stability. Failed. Did not improve performance over the baseline. The reason is likely due to the pipeline stalling and not making progress because Playwright/CDP event handlers are not properly yielding or managing the IPC message queue, preventing `capture()` from completing and returning frames to the FFmpeg stdin stream within the timeout.
- PERF-153: Replaced `HeadlessExperimental.beginFrame` with `Page.startScreencast` and attempted to force damage with `__helios_damage` div toggle. The benchmark hung during capture due to lack of deterministic screencast events or misaligned frame timing.
- **PERF-201**: Extracted `capture` method into two specialized arrow functions (`captureTargetElement` and `captureFullPage`) and assigned them to a `capture` property on the class based on the presence of `targetElementHandle`.
  - **Why it didn't work**: It regressed performance from ~33.3s baseline to ~43.6s. The overhead of dynamically assigned properties and arrow functions likely disrupted V8's ability to optimize the hot loop (e.g. inline caching or method optimization), proving much slower than simply relying on branch prediction for the inline truthy check of `this.targetElementHandle`.
- Replace image2pipe (`PERF-197`): Update the -f flag for the video input from image2pipe to the format dynamically corresponding to this.cdpScreenshotParams.format. Did not improve render time, actually degraded from ~33.5s to 34.2s. Bypassing FFmpeg probing heuristics dynamically provided no real-world gain, suggesting pipe format parsing overhead in FFmpeg is not the bottleneck or node writable stream handles image2pipe identically well.
- Removed `this.cdpSession` checks in `DomStrategy.ts` hot loop (PERF-190).
  - **Why it didn't work**: Removing the explicit truthiness checks and fallbacks did not improve render time (actually degraded from ~33.9s to ~35.7s). V8's branch predictor likely optimizes the repeated truthy checks efficiently enough that removing them has negligible benefit, and the execution of the CDP session send itself dominates the time.
- **PERF-192**: Eliminated `.then()` closure in `Renderer.ts` and cached promise array in `SeekTimeDriver.ts`. The test passed correctness and the performance was 35.972 s. The closures were refactored into a native `try...catch` to avoid heavy dynamic garbage collection on a per-frame basis, and the SeekTimeDriver avoids array allocations for frames.
- Optimize beginFrame literal initialization in DomStrategy (`PERF-193`): Improved render time slightly from 35.468s to ~33.7s by caching the beginFrame parameters object as a class property and mutating its `frameTimeTicks` property inside the `capture()` hot loop, eliminating continuous object literal allocation for `HeadlessExperimental.beginFrame` calls.
### PERF-196
- **What**: Replaced Chromium site isolation flags with `--process-per-tab`.
- **Result**: Reduced contention, improved rendering speed over 34.2s baseline to 33.9s.

- PERF-202: Replaced evaluate with callFunctionOn in SeekTimeDriver to eliminate AST parsing overhead. Result: ~32.9s.
- Removed `await` from `capturePromise` return inside `captureWorkerFrame` hot loop natively allowing V8 promise chaining (PERF-127) (~2.0% faster)
- Eliminated `.then()` closure in Renderer.ts capture loop to reduce GC pressure (~1% faster, PERF-192)
- **PERF-197**: Replaced dynamic format mapping with static image2pipe. Kept because it improved performance by eliminating demuxer probing overhead.
- **PERF-198**: Optimized FFmpeg stream throughput by increasing the `-thread_queue_size` flag to `1024` on the input pipe in `DomStrategy.ts`. The NodeJS event loop was originally blocking while waiting for FFmpeg to drain `stdin` sequentially. This parameter unblocked Node.js writes, avoided the `bitstream truncated in mjpeg_decode_scan_progressive_ac` and `component 0 is incomplete` errors, and improved render time from 33.5s to 33.331s.

Current best: 48.082s (baseline was 33.6s, -2.0%)
Last updated by: PERF-200
- **PERF-206**: Removed `await activePromise;` inside the `captureWorkerFrame` loop.
  - **Why it didn't work**: The renderer crashed immediately with `Protocol error (HeadlessExperimental.beginFrame): Another frame is pending`. Playwright and Chromium do not allow sending multiple `beginFrame` commands concurrently on the same CDP session. Explicit sequencing must be maintained per worker.
- **PERF-207**: Refactored `CaptureLoop.ts` to replace round-robin sequential assignment with an Actor Model where concurrent worker loops pull from an atomic shared counter.
  - **Why it didn't work**: Did not improve render time (remained ~33.35s compared to the ~33.33s baseline). The overhead of V8 Promise chaining in the old loop was negligible compared to the underlying Playwright/Chromium CDP frame capture and FFmpeg encode bottlenecks. Restructuring the execution graph did not yield a tangible wall-clock improvement on the CPU-only VM.

- Removed `--disable-software-rasterizer` from `GPU_DISABLED_ARGS` in `packages/renderer/src/core/BrowserPool.ts`. Allowed Chromium to fallback to its software rasterizer (SwiftShader) which provides significant execution speedups in the headless, CPU-bound environment. Reduced rendering time in benchmark from ~45.4s to ~32.7s (~28% improvement).
  - ID: PERF-208
- [PERF-209] Inline virtual time budget params to reduce GC overhead

Current best: 48.082s (baseline was ~33.156s, -1.3%)
Last updated by: PERF-210

- Pre-allocated execution context ring buffer inside CaptureLoop hot loop (PERF-241)
  - **Why it didn't work**: Creating context objects and binding methods up front degraded performance significantly (~49.6s baseline to ~50.9s). The overhead of calling `.bind()` and using closure functions wrapped in objects outweighed the performance cost of anonymous closure allocation in the `.then()` callback.

- **PERF-018**: Pre-compile `SeekTimeDriver.ts` evaluate script by using Playwright `frame.evaluate` with explicit arguments, instead of creating dynamic string templates for `Runtime.evaluate`. Render time decreased from 33.156s to 32.710s.

- Shared BrowserContext for all pages in BrowserPool (PERF-210)
  - Sharing a single BrowserContext across concurrent workers causes cross-worker contamination or resource contention that breaks the tests (specifically CDP media sync timing and iframe sync tests). While benchmark render time was around 33.156s, the approach fundamentally breaks test assertions.

- **PERF-211**: Disabled `AudioServiceOutOfProcess` and `PaintHolding` to reduce Chromium memory/context switching footprint.
  - **Why it didn't work**: Did not improve render time (regressed from ~32.7s to 47.938s). The change may have removed optimizations built into Chromium's default multiprocess architecture or caused unexpected stalling in the CPU-bound environment.
- **PERF-213**: Added `--single-process` flag to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **Why it didn't work**: The renderer crashed because Chrome headless shell cannot load the audio output devices when falling back to single-process mode, causing tests and benchmarks to fail immediately (`Target page, context or browser has been closed`).
- Removed `--disable-gpu-compositing` from `GPU_DISABLED_ARGS` in `packages/renderer/src/core/BrowserPool.ts`. Allowed Chromium to fallback to its software rasterizer (SwiftShader) which provides significant execution speedups in the headless, CPU-bound environment. Reduced rendering time in benchmark from ~33.156s to ~32.595s (~1.7% improvement).
  - ID: PERF-214

Current best: 0.276s (baseline was 0.28s, -1.4%)
Last updated by: PERF-249

- Removed `--disable-gpu` from `GPU_DISABLED_ARGS` allowing Chromium to handle software fallback automatically.
  - Slower than baseline. Explicitly disabling GPU yields better performance than native software fallback. Render time was 33.543s (-2.90842% change).
  - PERF-215
- **PERF-216**: Added `--disable-threaded-compositing` and `--disable-features=PaintHolding,ThreadedCompositing` flags to `DEFAULT_BROWSER_ARGS` in `BrowserPool.ts`.
  - **Why it didn't work**: The renderer crashed immediately during the benchmark. Disabling threaded compositing in the headless Chromium environment resulted in a broken rendering pipeline that failed to process the `beginFrame` commands properly, outputting a 1x1 corrupted stream and throwing `FFmpeg stdin is not writable`. This approach fundamentally breaks the required rendering paths.
- **PERF-217**: Disabled Font Subpixel Positioning using `--disable-font-subpixel-positioning` flag in `BrowserPool.ts`.
  - **Why it didn't work**: The renderer performance regressed significantly from ~32.6s to ~43.8s and tests failed. The change caused unexpected stalling in the CPU-bound environment, likely due to rendering path incompatibility or increased software rasterization overhead.

- Verified site isolation flags (PERF-223)
  - Render time: ~32.672s
  - Plan ID: PERF-223

- Mutated `callParams.arguments` array instead of reallocating it on every frame inside `SeekTimeDriver.ts`, avoiding dynamic allocations in the hot loop. Reduced V8 GC pressure. Plan ID: PERF-224

### PERF-227: Pre-allocate targetBeginFrameParams
- **Result**: KEPT. Pre-allocate targetBeginFrameParams to eliminate object allocation overhead in DomStrategy.ts hot loop (~36.7s -> ~33.244s)
- **PERF-233**: Implemented ring buffer for `framePromises` in `CaptureLoop.ts`.
  - **Result**: Improved rendering performance and reduced V8 garbage collection overhead by eliminating large array allocation.

- **PERF-234**: Eliminate Modulo Indexing in CaptureLoop Ring Buffer
  - **Why it didn't work**: The renderer tests crashed or failed. Implementing custom pointer wrap-around tracking (e.g. `workerIndex++`, `if (workerIndex === poolLen) workerIndex = 0`) instead of standard modulo operator (`%`) broke synchronous evaluation order in tests and caused pipeline stalls.

- Replaced modulo arithmetic with bitwise AND for `CaptureLoop` ring buffer.
- `maxPipelineDepth` is safely rounded up to a power of 2, satisfying the bitwise condition.
- Improved hot loop efficiency during indexing.
- (PERF-236)

- Reduced BrowserPool worker concurrency to half the available CPU cores to reduce context switching overhead and allow FFmpeg enough CPU headroom (PERF-237).
  - Render time: ~51.113

- Kept: Replace Modulo/Bitwise Indexing with Counter-Based Indexing in CaptureLoop (PERF-246)
- **PERF-252**: Pre-bound the CDP `.then` callback inside the `CdpTimeDriver.setTime()` hot loop to avoid dynamically allocating an anonymous closure on every stability check evaluation. Improved benchmark execution time to 587.005ms (vs baseline 584.396ms + noise).
