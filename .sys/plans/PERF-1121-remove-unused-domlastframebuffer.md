---
id: PERF-1121
slug: remove-unused-domlastframebuffer
status: unclaimed
claimed_by: ""
created: 2024-10-21
completed: ""
result: ""
---

# PERF-1121: Remove unused domLastFrameBuffer in CaptureLoop.ts

## Focus Area
`CaptureLoop.ts` single and multi-worker paths (`packages/renderer/src/core/CaptureLoop.ts`).

## Background Research
The `domLastFrameBuffer` was originally introduced to handle missing frames when `startScreencast` was used and it only emitted damage (when the screen hadn't changed, there was no screenshot data).
Since `startScreencast` was replaced with explicit `captureScreenshot` calls which always return the full image data (`PERF-1114`), the fallback logic was removed, and we now return `r.data` explicitly (`PERF-1118`).
However, the local variable `domLastFrameBuffer` is still being initialized and updated on every single frame in both single-worker and multi-worker loops, but it is **never read** for fallback logic anymore. It is just dead state.
Removing it will reduce V8 AST size, slightly lower GC pressure (as we won't keep the previous frame referenced longer than necessary or do variable assignment), and simplify the JS code parsing inside the hottest loops.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 1080p, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Bottleneck analysis**: The redundant assignment `domLastFrameBuffer = buf` and `let domLastFrameBuffer` logic requires V8 memory slots and parser logic. Removing this dead code simplifies the hot path.

## Implementation Spec

### Step 1: Remove `domLastFrameBuffer` from Single-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `let domLastFrameBuffer: Buffer | null = null;` around line 165.
2. In the initial frame block:
   Change:
   ```typescript
            domLastFrameBuffer = Buffer.from(rawResult as string, "base64");

            pendingBytes += domLastFrameBuffer!.length;
            if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
   ```
   To:
   ```typescript
            const buf = Buffer.from(rawResult as string, "base64");

            pendingBytes += buf.length;
            if (!stream.write(buf) && pendingBytes >= 16777216) {
   ```
3. In the main `while` loop block:
   Change:
   ```typescript
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");
              const buf = domLastFrameBuffer!;
   ```
   To:
   ```typescript
              const buf = Buffer.from(rawResult as string, "base64");
   ```
4. In the final `totalFrames > 1` block:
   Change:
   ```typescript
              domLastFrameBuffer = Buffer.from(rawResult as string, "base64");

              pendingBytes += domLastFrameBuffer!.length;
              if (!stream.write(domLastFrameBuffer!) && pendingBytes >= 16777216) {
   ```
   To:
   ```typescript
              const buf = Buffer.from(rawResult as string, "base64");

              pendingBytes += buf.length;
              if (!stream.write(buf) && pendingBytes >= 16777216) {
   ```

### Step 2: Remove `domLastFrameBuffer` from Multi-worker path
**File**: `packages/renderer/src/core/CaptureLoop.ts`
**What to change**:
1. Remove `let domLastFrameBuffer: Buffer | null = null;` in `runWorker` (around line 466).
2. Inside the `isDomStrategy` block in `runWorker`:
   Change:
   ```typescript
            if (isDomStrategy) {
              const rawResult = await strategy.capture(page, i * timeStep);
              let buf: Buffer = Buffer.from(rawResult as string, "base64");
              domLastFrameBuffer = buf;
              frameBufferRing[i & ringMask] = buf;
            }
   ```
   To:
   ```typescript
            if (isDomStrategy) {
              const rawResult = await strategy.capture(page, i * timeStep);
              frameBufferRing[i & ringMask] = Buffer.from(rawResult as string, "base64");
            }
   ```

**Why**: Removes entirely unused variable assignments and references from the fast paths, simplifying V8 JIT and GC tracking.

## Canvas Smoke Test
Run `npm run test -w packages/renderer` to ensure canvas paths are completely unaffected.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode=dom` inside `packages/renderer` to verify DOM frame generation still completes without hangs and accurately returns identical time or very slightly faster.