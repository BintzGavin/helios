## Performance Trajectory
Current best: 17.163s (baseline was 17.687s)
Last updated by: PERF-519

## What Works
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
- **PERF-520**: Inline Stability Check Await
  - **What I tried**: Inlined the `defaultStabilityCheck` promise resolution directly inside `runSetTime` using `await` and `try...catch` in `CdpTimeDriver.ts`.
  - **Outcome**: Kept. Improved render time to median ~16.140s vs baseline ~17.687s (or ~17.163s). Avoiding the `.then()` chain and closure allocation for the stability check in the hot loop yielded a tangible performance improvement.
