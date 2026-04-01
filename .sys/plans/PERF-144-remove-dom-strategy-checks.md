---
id: PERF-144
slug: remove-dom-strategy-checks
status: unclaimed
claimed_by: ""
created: 2024-05-24
completed: ""
result: ""
---

# PERF-144: Remove Branch Evaluation Overhead in DomStrategy Hot Loop

## Focus Area
The `capture` method inside `packages/renderer/src/strategies/DomStrategy.ts` is called for every frame and is the most performance-sensitive hot loop in the DOM rendering pipeline. It currently contains multiple truthiness checks for properties that are guaranteed to exist after `prepare()` is called, as well as arithmetic that can be pre-calculated.

## Background Research
V8 optimization works best when code paths are strictly deterministic. Unnecessary branching (e.g., `if (this.cdpSession)`) forces the JIT compiler to maintain fallback paths and perform truthiness evaluations on every invocation. Additionally, performing repeated arithmetic (`1000 / this.options.fps`) adds unnecessary micro-stalls to the event loop when this value is a constant for the duration of the render. Following the success of PERF-142 (removing `this.cdpSession` and `this.client` checks in the TimeDrivers), similar optimizations should be applied to `DomStrategy`.

## Benchmark Configuration
- **Composition URL**: `file:///app/output/example-build/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30fps, 5 seconds (150 frames), libx264
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.5s (from previous optimizations)
- **Bottleneck analysis**: The `capture` method evaluates `if (this.cdpSession)` and `if (this.beginFrameParams)` for every frame, and calculates `1000 / (this as any).options.fps`.

## Implementation Spec

### Step 1: Pre-calculate `interval` in `prepare`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- Add a private property `private frameInterval: number = 0;` to the `DomStrategy` class.
- In the `prepare` method, calculate `this.frameInterval = 1000 / this.options.fps;`.
- In the `capture` method, replace `const interval = 1000 / (this as any).options.fps;` with `this.frameInterval`. Also, since `beginFrameTargetParams` and `beginFrameParams` are initialized in `prepare`, assign the interval to them *once* in `prepare` instead of assigning it on every frame inside `capture`. Note that `frameTimeTicks` must still be updated per frame.

**Why**: Avoids repeated division and property lookups (`this.options.fps`) in the hot loop.

### Step 2: Remove truthiness checks in `capture`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
- In the `capture` method, remove the `if (this.cdpSession)` checks and use the non-null assertion operator (`this.cdpSession!`) where it's used. Since `cdpSession` is initialized in `prepare`, we can assume it's available. If `capture` is called when CDP isn't available, it will fail, but the current code already assumes CDP is the primary path. *Wait, looking at the code, it has an `else` branch for fallback to `page.screenshot`.* If we are optimizing for the CDP path (which is the fast path), we should keep the check, or we can assume `cdpSession` is always there in `dom` mode? In the `prepare` method, `this.cdpSession = await page.context().newCDPSession(page);` is always executed. Therefore, `this.cdpSession` is *always* initialized for `DomStrategy`. We can remove the `if (this.cdpSession)` and its `else` block (the `page.screenshot` fallback) entirely, because the `else` block will never be hit.
- Remove the `if (this.beginFrameParams)` check inside the `capture` block.
- Remove the `if (this.beginFrameTargetParams)` check inside the `targetElementHandle` block.

**Why**: Eliminates V8 branching overhead and dead code (the fallback `page.screenshot` blocks are unreachable since `prepare` always creates a CDP session).

## Variations
None.

## Canvas Smoke Test
Run `npm run verify:error -w packages/renderer` or `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure the Canvas strategy remains unaffected.

## Correctness Check
Run `npx tsx packages/renderer/tests/verify-dom-strategy-capture.ts` or a similar DOM verification test to ensure frames are still captured correctly.
