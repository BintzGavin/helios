---
id: PERF-482
slug: cache-media-element-check
status: unclaimed
claimed_by: ""
created: 2024-05-12
completed: ""
result: ""
---

# PERF-482: Eliminate Closure in CDP Media Sync

## Focus Area
The `prepare()` setup and execution of the `syncMediaFn` closure in `CdpTimeDriver.ts`. This targets the closure allocation and branching overhead in the hot `runSetTime` loop when no media elements are present.

## Background Research
Currently, `CdpTimeDriver.prepare()` dynamically tests if media elements exist via `Runtime.evaluate`, and assigns a closure (`this.defaultSyncMedia.bind(this)` or `() => {}`) to `this.syncMediaFn`.
In PERF-477, an attempt to eliminate this closure by replacing it with a primitive boolean flag (`hasMedia`) and an inline branch (`if (this.hasMedia) this.syncMedia(...)`) failed to improve performance because V8 optimizes the empty closure well.

However, PERF-479 successfully proved that using an integer state machine (`stabilityCheckState`) to represent dynamically checked conditions drastically reduces the overhead in `CdpTimeDriver.runSetTime` (from baseline down to ~0.612s median render time).

We can apply the exact same integer state machine pattern to the media synchronization check, completely removing the `syncMediaFn` closure property and replacing it with an integer state check (`syncMediaState`), lazily initialized on the first frame tick just like the stability check. This avoids adding overhead to the `prepare()` phase and simplifies the class structure to pure integer states in the hot loop.

## Benchmark Configuration
- **Composition URL**: Any standard DOM benchmark (e.g., `/examples/dom-benchmark/composition.html`)
- **Render Settings**: Baseline resolution, fps, duration, and codec (`dom` mode)
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~0.612s (from PERF-479)
- **Bottleneck analysis**: Micro-optimizing the remaining closure assignment overhead in `CdpTimeDriver.ts`.

## Implementation Spec

### Step 1: Replace closure with Integer State Machine
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
1. Remove `private syncMediaFn: (timeInSeconds: number) => void = () => {};`
2. Add `private syncMediaState: number = 0; // 0 = unknown, 1 = true, 2 = false`
3. In `prepare()`, remove the `try/catch` block that evaluates `document.querySelectorAll('video, audio').length > 0` and assigns `this.syncMediaFn`.
4. In `runSetTime()`, replace `this.syncMediaFn(timeInSeconds);` with:

```typescript
    if (this.syncMediaState === 0) {
      try {
        const { result } = await this.client!.send('Runtime.evaluate', {
          expression: "document.querySelectorAll('video, audio').length > 0",
          returnByValue: true
        });
        if (result && result.value) {
          this.syncMediaState = 1;
        } else {
          this.syncMediaState = 2;
        }
      } catch (e) {
        this.syncMediaState = 1; // Default to true if evaluation fails
      }
    }

    if (this.syncMediaState === 1) {
      this.defaultSyncMedia(timeInSeconds);
    }
```

**Why**: By matching the proven `stabilityCheckState` integer pattern from PERF-479, we eliminate the closure assignment (`syncMediaFn`) and defer the media existence evaluation to the first virtual clock tick, speeding up the `prepare()` phase and avoiding dynamic function dispatch in the hot loop.
**Risk**: Slightly slower first frame if media evaluation takes longer than the previous `prepare` implementation, though lazy initialization often feels faster overall.

## Variations

### Variation A: Inline evaluation
Instead of checking `document.querySelectorAll`, run `defaultSyncMedia` on the first frame anyway and modify `defaultSyncMedia` to set the state to 2 if it finds 0 elements in its own cache loop, bypassing the extra CDP evaluation entirely.

## Canvas Smoke Test
Run a canvas capture test to ensure `CdpTimeDriver` changes do not break basic time advancement in WebGL pipelines.

## Correctness Check
Run a DOM capture with media elements to ensure audio/video still synchronizes properly when `syncMediaState === 1`.
