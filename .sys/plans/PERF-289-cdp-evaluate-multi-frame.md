---
id: PERF-289
slug: cdp-evaluate-multi-frame
status: unclaimed
claimed_by: ""
created: 2026-04-16
completed: ""
result: ""
---

# PERF-289: Optimize CdpTimeDriver Multi-Frame Sync Media by using Runtime.evaluate

## Focus Area
`packages/renderer/src/drivers/CdpTimeDriver.ts` - `setTime` method.

## Background Research
Currently, when `CdpTimeDriver.setTime` attempts to synchronize media elements, for multi-frame compositions it evaluates the Javascript expression inside the browser context using Playwright's `frame.evaluate()`. This creates overhead due to IPC and Playwright internal processing logic (such as context checking and argument serialization).

Based on prior successes (e.g. `PERF-285` where we optimized `SeekTimeDriver` single-frame evaluation by replacing `frame.evaluate` with raw CDP string evaluation using `Runtime.evaluate`, and `PERF-286` where we extended the multi-frame strategy to use `Runtime.evaluate`), we can do the exact same optimization in `CdpTimeDriver`. We can track the `executionContextIds` during `prepare()`, and use `Runtime.evaluate` to send raw CDP commands instead of `frame.evaluate()` for multi-frame contexts.

## Benchmark Configuration
- **Composition URL**: The standard DOM benchmark composition (from `scripts/benchmark-test.js`)
- **Render Settings**: 1280x720, 30 FPS, 3s duration, libx264
- **Mode**: `dom` (which internally exercises TimeDriver setup and media sync when needed)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 1 per experiment to test validity; append final result to the journal.

## Baseline
- **Current estimated render time**: ~32.203s
- **Bottleneck analysis**: Serializing multi-frame evaluations over Playwright's `frame.evaluate()` IPC boundaries adds overhead in tight loops.

## Implementation Spec

### Step 1: Pre-collect CDP Execution Context IDs
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
- Introduce a new property `private executionContextIds: number[] = [];`.
- In `prepare(page)`, capture the context IDs using the `Runtime.executionContextCreated` CDP event:
```typescript
<<<<<<< SEARCH
    // Initialize virtual time policy to 'pause' to take control of the clock.
=======
    this.executionContextIds = [];
    this.client!.on('Runtime.executionContextCreated', (event) => {
      if (event.context.name === '') {
        this.executionContextIds.push(event.context.id);
      }
    });

    // Initialize virtual time policy to 'pause' to take control of the clock.
>>>>>>> REPLACE
```
- In `prepare(page)`, near the end of the method (after `this.cachedFrames = page.frames();`), wait briefly for execution contexts:
```typescript
<<<<<<< SEARCH
    this.cachedFrames = page.frames();

    const windowRes = await this.client!.send('Runtime.evaluate', { expression: 'window' });
=======
    this.cachedFrames = page.frames();
    await new Promise(r => setTimeout(r, 100));

    const windowRes = await this.client!.send('Runtime.evaluate', { expression: 'window' });
>>>>>>> REPLACE
```

### Step 2: Use `Runtime.evaluate` for Multi-Frame Sync Media
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
- Modify the condition in `setTime` handling `syncMedia`:
```typescript
<<<<<<< SEARCH
      if (frames.length === 1) {
        await frames[0].evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
      } else {
        if (this.cachedPromises.length !== frames.length) {
          this.cachedPromises = new Array(frames.length);
        }
        const framePromises = this.cachedPromises;
        for (let i = 0; i < frames.length; i++) {
          const frame = frames[i];
          framePromises[i] = frame.evaluate("if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");").catch(this.handleSyncMediaError);
        }
        await Promise.all(framePromises);
      }
=======
      if (frames.length === 1) {
        await this.client!.send('Runtime.evaluate', {
          expression: "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");"
        }).catch(this.handleSyncMediaError);
      } else {
        if (this.cachedPromises.length !== this.executionContextIds.length) {
          this.cachedPromises = new Array(this.executionContextIds.length);
        }
        const framePromises = this.cachedPromises;
        const expression = "if(typeof window.__helios_sync_media==='function') window.__helios_sync_media(" + timeInSeconds + ");";
        for (let i = 0; i < this.executionContextIds.length; i++) {
          framePromises[i] = this.client!.send('Runtime.evaluate', {
            expression: expression,
            contextId: this.executionContextIds[i],
            awaitPromise: false
          }).catch(this.handleSyncMediaError);
        }
        await Promise.all(framePromises);
      }
>>>>>>> REPLACE
```

**Why**: By replacing `frame.evaluate` with `Runtime.evaluate`, we eliminate the serialization overhead introduced by Playwright's proxy layers when invoking functions or script evaluation on multiple frames, cutting down per-frame render times significantly.

**Risk**: Negligible risk; logic identically replicates standard CDP raw evaluations.

### Step 3: Verification
Use `run_in_bash_session` to execute `cd packages/renderer && npx tsx scripts/benchmark-test.js` to observe and log performance gains. Add results to `.sys/perf-results.tsv`. Update `docs/status/RENDERER-EXPERIMENTS.md` with findings and PR the results.

## Correctness Check
Rendered output video should be identical in quality and complete 90 frames successfully.

## Canvas Smoke Test
Smoke test using Canvas logic in `benchmark-test.js`.

## Variations
If no improvement, discard the changes.
