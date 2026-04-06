---
id: PERF-190
slug: remove-cdp-session-check-overhead
status: complete
claimed_by: ""
created: 2026-04-06
completed: ""
result: failed
---

# PERF-190: Remove CDP Session Check Overhead in DomStrategy Hot Loop

## Focus Area
The `capture()` hot loop in `DomStrategy.ts`.

## Background Research
In PERF-141, the truthiness checks for `this.cdpSession` and `this.client` were successfully removed from the `setTime` methods in `SeekTimeDriver.ts` and `CdpTimeDriver.ts`. These drivers are initialized with their respective CDP sessions during the `prepare()` phase, so repeatedly checking for their existence inside the highly-executed hot loop added unnecessary branch prediction overhead for V8.

A similar truthiness check for `if (this.cdpSession)` exists inside the `capture()` method of `DomStrategy.ts`. The `cdpSession` is guaranteed to be initialized during `DomStrategy.prepare()`, before `capture()` is called.

Currently in `DomStrategy.ts` `capture()`:
```typescript
    if (this.targetElementHandle) {
      if (this.cdpSession) {
          // ... CDP capture path
      }
      // ... fallback
    }

    if (this.cdpSession) {
        // ... CDP capture path
    } else {
        // ... fallback
    }
```

By removing the explicit `if (this.cdpSession)` checks and the fallback `else` branches in both the target element and full-page capture paths, we can reduce V8 bytecode size and branching overhead within the capture loop. The non-null assertion `this.cdpSession!` is already used within these blocks, reinforcing that the session is expected to exist.

## Benchmark Configuration
- **Composition URL**: `file:///app/examples/simple-animation/composition.html`
- **Render Settings**: 1280x720, 30 FPS, duration 5s (150 frames)
- **Mode**: `dom`
- **Metric**: Wall-clock render time in seconds
- **Minimum runs**: 3 per experiment, report median

## Baseline
- **Current estimated render time**: ~33.9s
- **Bottleneck analysis**: Micro-optimizing execution branching inside the Node-to-Chromium IPC capture hot loop.

## Implementation Spec

### Step 1: Remove truthiness checks for `cdpSession` in `DomStrategy.ts`
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the `capture(page: Page, frameTime: number)` method:
1.  **For the target element path (`if (this.targetElementHandle)`):**
    Remove the `if (this.cdpSession)` wrapper and the fallback `const fallback = await this.targetElementHandle.screenshot(...)`. Keep only the code currently inside the `if (this.cdpSession)` block.

2.  **For the full page capture path:**
    Remove the `if (this.cdpSession)` wrapper and the fallback `else { const fallback = await page.screenshot(...) }`. Keep only the code currently inside the `if (this.cdpSession)` block.

**Why**: Eliminating branching inside the hot loop reduces V8 bytecode processing and execution stalls. The CDP session is already initialized in `prepare()`.
**Risk**: If `capture()` is somehow called before `prepare()` or in an environment where CDP fails to initialize entirely, it will throw an error instead of falling back to Playwright's `page.screenshot()`. However, CDP initialization is a hard requirement for the current high-performance pipeline anyway.

## Correctness Check
Run the renderer benchmark script `npx tsx packages/renderer/tests/fixtures/benchmark.ts` to verify the DOM rendering still succeeds.

## Canvas Smoke Test
Run `npx tsx packages/renderer/tests/verify-canvas-strategy.ts` to ensure Canvas mode still works properly.

## Results Summary
- **Best render time**: 35.690 (vs baseline 33.9s)
- **Improvement**: N/A (Degradation)
- **Discarded experiments**: Removed this.cdpSession checks in DomStrategy
