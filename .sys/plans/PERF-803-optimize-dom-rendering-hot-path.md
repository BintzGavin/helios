---
id: PERF-803
slug: optimize-dom-rendering-hot-path
status: complete
claimed_by: "executor"
created: 2024-05-24
completed: "2024-05-24"
result: "improved"
---

# PERF-803: Optimize DOM Rendering Hot Path via Bitwise Capacity Math and Getter Aliasing

## Focus Area
The `DomStrategy.ts` base64 decoding logic and `CdpTimeDriver.ts` time progression logic. This targets the per-frame overhead during the absolute hottest paths of DOM rendering.

## Background Research
In the fast path of `CaptureLoop.ts`, `DomStrategy.processCaptureResult` is called on every frame. Currently, it uses `Math.floor(this.decodeBuffer.length * 1.5)` to calculate buffer reallocation capacity, and repeatedly accesses `this.decodeBuffer` (a class property). Property lookups on `this` inside hot loops incur a small overhead, and `Math.floor(x * 1.5)` involves floating point math and a V8 built-in function call. Replacing this with integer bitwise math `x + (x >> 1)` and aliasing `this.decodeBuffer` to a local variable reduces V8 property lookups and math overhead.

Additionally, `CdpTimeDriver.ts`'s `setTime` computes `delta = timeInSeconds - this.currentTime` on every single frame, even though `delta` is only used to set the CDP budget in `canvas` mode. In `dom` mode, the budget is not needed, meaning this subtraction is wasted arithmetic overhead.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/dom-benchmark/composition.html`
- **Render Settings**: 600x600, 60fps, DOM mode
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~1.948s (from PERF-793)
- **Bottleneck analysis**: Micro-optimizations in V8 execution. Property lookups and unnecessary arithmetic inside the tightest frame loops contribute to GC and JIT overhead.

## Implementation Spec

### Step 1: Streamline buffer reallocation property lookups and math
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In `processCaptureResult`, optimize the capacity reallocation:
1. Alias `this.decodeBuffer` to a local variable `let buf = this.decodeBuffer;` before the capacity check.
2. Replace `Math.floor(this.decodeBuffer.length * 1.5)` with `buf.length + (buf.length >> 1)`.
3. Use the local `buf` variable for the `.write` and `.subarray` operations.
4. Only assign back to `this.decodeBuffer = buf;` when a new buffer is allocated.
**Why**: Aliasing avoids repeated property getter lookups on `this` inside the hot loop. Bitwise math avoids floating point operations and `Math.floor` function overhead, keeping the calculation purely in integer space.
**Risk**: Negligible risk. Integer bitwise math is exact for standard memory sizes.

### Step 2: Avoid unused CDP budget computation
**File**: `packages/renderer/src/drivers/CdpTimeDriver.ts`
**What to change**:
In `setTime`, optimize the early returns:
1. Replace `const delta = timeInSeconds - this.currentTime; if (delta <= 0) return;` with `if (timeInSeconds <= this.currentTime) return;`.
2. Move the `delta` calculation down into the `this.mode !== 'dom'` path. Do this by calculating `const budget = (timeInSeconds - this.currentTime) * 1000;` *before* updating `this.currentTime = timeInSeconds;`, or just caching `previousTime`.
3. Update `this.currentTime = timeInSeconds;` after media sync.
4. If `this.mode === 'dom'`, return. Otherwise, set the budget using the calculated value.
**Why**: Avoids performing subtraction and allocating the `delta` variable for every frame in DOM mode, slightly reducing V8 arithmetic overhead.
**Risk**: Very low risk, as the logic flow and conditions remain identical.

## Variations
### Variation A: Direct Buffer Assignment
If bitwise math introduces unexpected bugs (highly unlikely), fall back to `Math.floor` but retain the local variable aliasing `buf` to still save property access overhead.

## Canvas Smoke Test
Run a basic `npm run build` and `npx tsx scripts/benchmark-perf.ts --mode canvas` to ensure Canvas mode still captures frames correctly since `CdpTimeDriver.ts` is shared.

## Correctness Check
Run `npx tsx scripts/benchmark-perf.ts --mode dom` and verify the video output is still visually correct and does not crash.
