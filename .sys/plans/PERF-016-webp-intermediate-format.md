---
id: PERF-016
slug: webp-intermediate-format
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: 2026-10-18
result: improved
---

# PERF-016: Intermediate Format Optimization (WEBP)

## Context & Goal
The Frame Capture Loop (phase 4) in `packages/renderer/src/strategies/DomStrategy.ts`. The focus is on reducing the CPU overhead of encoding and decoding intermediate image frames during DOM capture. Currently, Playwright's `page.screenshot()` defaults to generating PNGs when an alpha channel is needed. PNG encoding in Chromium and decoding in FFmpeg is extremely CPU-bound and generates large IPC payloads between the Chromium and Node.js processes. `webp` is a modern image format that supports transparency (like PNG) but offers significantly faster encoding/decoding and smaller file sizes, which reduces IPC overhead. Switching the default format to `webp` when alpha is needed should reduce the per-frame capture time without sacrificing alpha channel support.

## File Inventory
- `packages/renderer/src/strategies/DomStrategy.ts`

## Implementation Spec

### Step 1: Update DomStrategy default format for alpha
**File**: `packages/renderer/src/strategies/DomStrategy.ts`
**What to change**: In the frame capture logic, change the default format assigned when an alpha channel is needed from `'png'` to `'webp'`. Also ensure that the `quality` parameter is passed to `screenshotOptions` if the format is `'webp'` and `quality` is defined, similar to `jpeg`.
**Why**: Defaulting to `webp` provides the performance benefits out of the box while retaining alpha channel capabilities.
**Risk**: Low. Playwright supports `type: 'webp'`. FFmpeg with `image2pipe` supports WebP inputs.

## Test Plan
1. Run `cd packages/renderer && npx tsx tests/verify-codecs.ts` to ensure the codecs tests pass.
2. Execute the DOM rendering benchmark using a standard composition to verify output video frames are in chronological order and measure wall-clock render time.

## Results Summary
- **Best render time**: 35.156s (vs baseline 35.555s)
- **Improvement**: 1.1%
- **Kept experiments**: Default to 'webp' format for alpha channel support.
- **Discarded experiments**: None
