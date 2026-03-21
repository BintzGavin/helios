---
id: PERF-021
slug: optimize-seek-raf
status: unclaimed
claimed_by: ""
created: 2026-03-21
completed: ""
result: ""
---

# PERF-021: Optimize redundant requestAnimationFrame waits in DOM capture

## Context & Goal
The Frame Capture Loop (phase 4) relies heavily on advancing time and waiting for the DOM to settle before taking a screenshot. Currently, there are 5 sequential requestAnimationFrame calls per frame capture, causing a significant idle wait time (up to ~83ms per frame at 60Hz) which dominates the wall-clock render time. The goal is to minimize these waits to the bare minimum needed for layout stability.

## File Inventory
- `packages/renderer/src/drivers/SeekTimeDriver.ts`
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Reduce nested rAF calls in SeekTimeDriver
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**: Refactor the end of the time synchronization logic to await a single requestAnimationFrame callback instead of four nested callbacks.
**Why**: 1 frame is usually enough for most animations and layout updates to settle. The extra 3 frames are pure waste and artificially slow down the rendering loop.
**Risk**: If a specific framework requires multiple frames to settle, animations might drop or tear. We will rely on variations if the correctness check fails.

### Step 2: Remove redundant rAF in DomStrategy
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: Remove the line in the capture method that evaluates and awaits a new requestAnimationFrame Promise.
**Why**: Removing this saves another IPC roundtrip and an additional 16.6ms per frame. The SeekTimeDriver already ensures we wait for the necessary frame ticks before capture.
**Risk**: Timing issues if the capture happens before the layout engine has painted the frame from SeekTimeDriver.

## Test Plan
Run a standard Canvas smoke test using the verification script. Run the DOM rendering benchmark using `npx tsx packages/renderer/scripts/render-dom.ts` and inspect the output video visually to ensure no frames are dropped or torn.
