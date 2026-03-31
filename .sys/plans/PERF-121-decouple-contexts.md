---
id: PERF-121
slug: decouple-contexts
status: unclaimed
claimed_by: ""
created: 2026-03-30
completed: ""
result: ""
---
# PERF-121: Decouple Browser Contexts for Playwright Workers

## Focus Area
DOM Rendering CPU Bottleneck. Specifically, Playwright pages inside `Renderer.ts` are currently grouped into a single browser context, causing them to share the same Chromium renderer process and locking concurrent layout/paint scaling to a single V8 main thread.

## Background Research
Currently, `packages/renderer/src/Renderer.ts` launches a single Chromium browser and creates a single `BrowserContext` (`const context = await browser.newContext(...)`). Then it creates a pool of up to 8 pages using `context.newPage()`.
Because all workers navigate to the same local URL (`file:///.../composition.html`), Chromium groups these pages into the **same renderer process** (Site Isolation rules for same-origin or local files). This means all 4-8 pages in our concurrent worker pool are fighting for the exact same V8 main thread to recalculate CSS styles, parse JS animations, and capture frames over CDP.

We tested creating completely separate browser instances (e.g. `chromium.launch()` per worker) in a past experiment (`PERF-044`), but it was too heavy, caused huge memory overhead, and broke Canvas mode due to process isolation constraints.

However, creating a separate `BrowserContext` for *each* page within the *same* browser forces Chromium to instantiate a brand new, isolated renderer process per worker, without the heavy overhead of spinning up entire browser binaries.
By replacing `const page = await context.newPage();` with `const pageContext = await browser.newContext(...); const page = await pageContext.newPage();`, we bypass the same-site process grouping. This will allow the microVM's multi-core CPU to actually parallelize the V8 layout and script evaluation across workers.

My quick empirical benchmark showed a median render time reduction from ~34.3s down to **~33.36s - 33.44s**, reliably shaving off ~1 second in the CPU-bound DOM benchmark.

## Benchmark Configuration
- **Composition URL**: `output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~34.3s
- **Bottleneck analysis**: Playwright pages share a single browser context and are grouped into the same renderer process by Chromium, serializing layout calculations and defeating our multi-worker parallelism strategy.

## Implementation Spec

### Step 1: Instantiate individual BrowserContexts per worker
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
1. Inside `Renderer.render()`, remove the global `context` creation:
   `const context = await browser.newContext({ viewport: { width: this.options.width, height: this.options.height } });`
2. Move the context creation inside the `createPage` function so every worker gets an isolated context:
   ```typescript
      const createPage = async (index: number) => {
        const pageContext = await browser.newContext({
          viewport: {
            width: this.options.width,
            height: this.options.height,
          },
        });
        const page = await pageContext.newPage();
   ```
3. Update the worker pool to also store the context so we can close it correctly later. Add `context: import('playwright').BrowserContext` to the `pool` array type definition.
   ```typescript
   let pool: { context: import('playwright').BrowserContext, page: import('playwright').Page, strategy: RenderStrategy, timeDriver: TimeDriver, activePromise: Promise<void> }[] = [];
   ...
   return { context: pageContext, page, strategy, timeDriver, activePromise: Promise.resolve() };
   ```

### Step 2: Fix tracing configuration logic
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Since we now have multiple contexts, we need to apply the Playwright tracing logic (if requested) to all of them.
1. Move the `context.tracing.start` block down inside `createPage` right after creating `pageContext`:
   ```typescript
        if (jobOptions?.tracePath) {
          console.log(`Enabling Playwright tracing for worker ${index}...`);
          await pageContext.tracing.start({ screenshots: true, snapshots: true });
        }
   ```
2. Update the `finally` cleanup block to iterate over the pool and close/stop tracing on each context:
   ```typescript
      if (jobOptions?.tracePath) {
        console.log('Stopping tracing...');
        // Note: Playwright only lets you save one trace file per path, so we'll just save the first worker's trace
        if (pool[0]) {
            await pool[0].context.tracing.stop({ path: jobOptions.tracePath });
        }
      }
      for (const worker of pool) {
          await worker.context.close();
      }
      await browser.close();
   ```

**Why**: By isolating each page in its own BrowserContext, Chromium is forced to spawn independent renderer processes for each worker. This prevents the OS thread contention where 8 workers serialize their JS and layout calculations on a single V8 thread.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to execute verification tests for Canvas strategy.

## Correctness Check
Run the entire renderer test suite (`npm run test -w packages/renderer`) to ensure this process isolation doesn't break WebCodecs Canvas mode or any edge-case IPC behaviors (since `PERF-044` noted full browser isolation broke Canvas). Also run `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to confirm the speedup.
