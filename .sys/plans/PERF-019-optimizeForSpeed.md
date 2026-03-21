---
id: PERF-019
slug: optimizeForSpeed
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: "2026-03-21"
result: "no-improvement"
---

# PERF-019: Enable optimizeForSpeed flag in CDP Page.captureScreenshot

## Context & Goal
The DOM-to-Video path spends a significant amount of its time capturing frames. In `DomStrategy.ts`, we use `Page.captureScreenshot` through CDP, which has an experimental boolean flag `optimizeForSpeed`. Setting this to `true` optimizes image encoding for speed rather than resulting size. Given that these frames are immediately piped to FFmpeg and not persisted individually, size does not matter but speed is critical in our CPU-only Jules microVM environment. The goal is to optimize image encoding for speed.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Add optimizeForSpeed to CDP captureParams
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**:
In the block where the `captureParams` object is built for `this.cdpSession.send('Page.captureScreenshot', captureParams)`, add `optimizeForSpeed: true`.
**Why**: This instructs Chromium's internal encoder to prioritize speed over compression size when generating the base64 string.
**Risk**: If the version of Chromium bundled with Playwright does not support the flag, it might error or silently ignore it. If there is an error, we may need to remove it or catch and fallback. If the image size gets substantially larger, IPC overhead might offset encoding gains.

## Test Plan
1. Run `npx tsx packages/renderer/tests/verify-codecs.ts` to ensure the codecs tests pass and no syntax errors are introduced.
2. Execute the DOM rendering benchmark using a standard composition to verify output video frames are in chronological order, transparent backgrounds still work, and measure the wall-clock render time improvements.

## Results Summary
- **Best render time**: 35.455s (vs baseline 35.141s)
- **Improvement**: 0% (no improvement)
- **Kept experiments**: []
- **Discarded experiments**: [Enable optimizeForSpeed flag in CDP Page.captureScreenshot]
