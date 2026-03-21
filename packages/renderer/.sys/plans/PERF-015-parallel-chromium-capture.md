---
id: PERF-015
slug: parallel-chromium-capture
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: 2026-10-20
result: improved
---

# PERF-015: Parallel Chromium Capture

## Context & Goal
The frame capture loop is strictly sequential per frame: the Node.js process waits for Chromium to finish rendering and capturing frame `N` before asking Chromium to start rendering frame `N+1`. Although we decouple the capture from the FFmpeg write (PERF-013), the capture itself only utilizes a single Chromium renderer thread. By creating multiple Playwright Page instances, we can distribute the frame capture workload across multiple Chromium renderer processes. Each page seeks to its assigned frame, captures it in parallel, and returns the buffer. We then write the buffers to FFmpeg sequentially. This leverages the multi-core CPU availability of the microVM.

## File Inventory
- `packages/renderer/src/Renderer.ts`

## Results Summary
- **Best render time**: 35.555s (vs baseline 46.571s)
- **Improvement**: ~23.6%
- **Kept experiments**: parallel chromium capture using a pool of pages
- **Discarded experiments**: none
