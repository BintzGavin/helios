---
id: PERF-505
slug: dedicated-browser-contexts
status: complete
claimed_by: "executor-session"
created: 2024-05-15
completed: "2026-05-23"
result: "improved"
---
# PERF-505: Dedicated Browser Contexts for Process Isolation

## Focus Area
DOM render pipeline orchestration - specifically Chromium renderer process scaling in `BrowserPool.ts`.

## Background Research
Currently, `BrowserPool.ts` initializes a single `sharedContext` and creates multiple pages within it to act as concurrent workers. Combined with the project's `DEFAULT_BROWSER_ARGS` which disable site isolation (`--disable-site-isolation-trials`, `--disable-features=IsolateOrigins,site-per-process`), Chromium aggressively groups all pages navigating to the same origin (`file://` for local compositions) into a **single OS-level renderer process**.

Because a Chromium renderer process relies on a single main thread for DOM updates, CSS animations, and JS execution, all 3-4 of our concurrent capture workers are currently contending for the exact same CPU thread. This explains why increasing worker concurrency in a previous experiment (PERF-504) heavily regressed performance: it merely added Playwright IPC overhead to a single saturated Chromium thread.

By assigning each worker its own dedicated `BrowserContext`, Playwright will force Chromium to spawn an isolated OS-level renderer process for each worker. This will allow true multi-core parallelization of the DOM capture loop, effectively utilizing all available CPU cores in the microVM.

## Benchmark Configuration
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~17.68s (median for 600 frames)
- **Bottleneck analysis**: The Playwright workers are bottlenecked by a single Chromium renderer process thread processing DOM animations serially.

## Implementation Spec

### Step 1: Instantiate Dedicated Browser Contexts
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
1. In `init`, remove the `sharedContext` initialization before the worker creation loop.
2. Inside `createPage`, instantiate a new `BrowserContext` for each worker:
```typescript
      const context = await this.browser!.newContext({
        viewport: {
          width: this.options.width,
          height: this.options.height,
        },
      });

      if (index === 0 && jobOptions?.tracePath) {
        console.log(`Enabling Playwright tracing for worker context...`);
        await context.tracing.start({ screenshots: true, snapshots: true });
      }

      const page = await context.newPage();
```
3. Update the `WorkerInfo` object returned at the end of `createPage` to include this new `context` so it can be closed later. (Replace `return { context: sharedContext, page, strategy, timeDriver };` with `return { context, page, strategy, timeDriver };`)

**Why**: Guarantees that each worker page gets its own isolated Chromium renderer process, unlocking true multi-core parallel execution.
**Risk**: Slightly higher memory usage per worker due to isolated process overhead, but well within the limits of the microVM for 3 workers.

### Step 2: Ensure Proper Teardown
**File**: `packages/renderer/src/core/BrowserPool.ts`
**What to change**:
In the `close` method, iterate over `this.workers` to close each dedicated context, rather than just closing the first one. Stop tracing only on the first worker's context.
```typescript
  public async close(jobOptions?: RenderJobOptions): Promise<void> {
    if (this.workers.length > 0) {
      if (jobOptions?.tracePath) {
        console.log('Stopping tracing...');
        await this.workers[0].context.tracing.stop({ path: jobOptions.tracePath });
      }
      for (const worker of this.workers) {
        await worker.context.close();
      }
    }

    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed.');
    }
  }
```
**Why**: Prevents zombie Chromium renderer processes and memory leaks between renders.
**Risk**: Low risk if iterated correctly.

## Canvas Smoke Test
Run the standard Canvas rendering test to ensure that multiple contexts do not break WebCodecs or Playwright page setup.

## Correctness Check
Verify that the output MP4 has correctly synchronized frames and that no frame drops occur due to parallel context capture.

## Prior Art
- PERF-504 (Optimize BrowserPool Concurrency Formula) which failed because increasing pages inside the same process thrashed the single main thread.

## Results Summary
- **Best render time**: 1.511s
- **Improvement**: N/A (baseline)
- **Kept experiments**: [PERF-505 (Already Implemented)]
- **Discarded experiments**: []
