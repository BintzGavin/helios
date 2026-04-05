---
id: PERF-181
slug: screencast-streaming
status: unclaimed
claimed_by: ""
created: 2025-05-28
completed: ""
result: ""
---

# PERF-181: Streamline Capture using CDP Page.startScreencast

## Focus Area
DOM Frame Capture via `Page.startScreencast` instead of `HeadlessExperimental.beginFrame` + `screenshotData` to push frames from the browser without explicit CDP frame capture requests.

## Background Research
The current DOM architecture uses `HeadlessExperimental.beginFrame` sequentially, which sends an IPC message per frame to request a screenshot and waits for a response containing the frame data. This round-trip latency limits capture throughput.

Previous experiments (PERF-033, PERF-156) tried using `Page.startScreencast`, which operates in a push model (Chrome continuously sends `Page.screencastFrame` events). They failed primarily because the screencast mechanism in Chromium is "damage-driven": if there is no visual change (damage) between frames, Chromium skips sending a `screencastFrame` event. This causes the Node.js pipeline to starve or deadlock because it expects exactly one frame buffer per virtual time tick.

By forcing a layout/paint mutation (e.g., an invisible ticking DOM element) inside `SeekTimeDriver`'s `setTime` callback, we can theoretically trick the compositor into registering visual damage on every virtual tick. This ensures Chrome pushes a `screencastFrame` event exactly once for every `setTime` evaluation.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, duration 5s
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s
- **Bottleneck analysis**: IPC overhead of synchronous frame requests.

## Implementation Spec

### Step 1: Force Damage on Seek
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the injected `initScript`, inside `window.__helios_seek`, append a small DOM mutation to force the compositor to paint.
```javascript
  // Force a microscopic DOM update to trigger screencast damage
  let d = document.getElementById('__helios_damage');
  if (!d) {
    d = document.createElement('div');
    d.id = '__helios_damage';
    d.style.position = 'fixed';
    d.style.top = '0';
    d.style.left = '0';
    d.style.width = '1px';
    d.style.height = '1px';
    d.style.opacity = '0.001';
    d.style.pointerEvents = 'none';
    d.style.zIndex = '999999';
    document.body.appendChild(d);
  }
  // Toggle the background color or opacity slightly
  d.style.backgroundColor = (t % 2 === 0) ? '#000' : '#111';
```
**Why**: This forces the compositor to emit a frame.
**Risk**: Might not reliably force the screencast frame.

### Step 2: Enable Screencast in `DomStrategy.prepare`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
1. Add `screencastQueue: Buffer[] = []` and `screencastResolvers: ((buf: Buffer) => void)[] = []`.
2. In `prepare()`, call `this.cdpSession!.send('Page.startScreencast', { format: format, quality: quality, everyNthFrame: 1 });`
3. Add a listener for `Page.screencastFrame`:
```typescript
this.cdpSession!.on('Page.screencastFrame', (event: any) => {
    const buffer = this.writeToBufferPool(event.data);
    this.cdpSession!.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    if (this.screencastResolvers.length > 0) {
        const resolve = this.screencastResolvers.shift()!;
        resolve(buffer);
    } else {
        this.screencastQueue.push(buffer);
    }
});
```
**Why**: This enables the screencast and handles frame resolution.
**Risk**: Potential timing issues if screencast events don't match up perfectly with setTime.

### Step 3: Consume Screencast Frames in `capture()`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `capture()`, instead of `beginFrame`, wait for the next frame from the screencast queue:
```typescript
capture(page: Page, frameTime: number): Promise<Buffer> {
    return new Promise((resolve) => {
        if (this.screencastQueue.length > 0) {
            resolve(this.screencastQueue.shift()!);
        } else {
            this.screencastResolvers.push(resolve);
        }
    });
}
```
**Why**: Consumes the push stream instead of actively polling `beginFrame`.
**Risk**: Hangs if screencast stalls.

## Variations
- If `Screencast` requires a delay to initialize, add a small sleep or wait for the first frame.
- Add timeout logic in `capture()` to avoid hanging if the damage mutation fails.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` against the canvas output.

## Correctness Check
Run the benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to ensure it finishes without hanging and produces a valid output video.

## Prior Art
- PERF-153 / PERF-156
