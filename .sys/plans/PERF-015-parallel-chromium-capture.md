---
id: PERF-015
slug: parallel-chromium-capture
status: unclaimed
claimed_by: ""
created: 2026-10-18
completed: ""
result: ""
---

# PERF-015: Parallel Chromium Capture

## Context & Goal
The frame capture loop is strictly sequential per frame: the Node.js process waits for Chromium to finish rendering and capturing frame `N` before asking Chromium to start rendering frame `N+1`. Although we decouple the capture from the FFmpeg write (PERF-013), the capture itself only utilizes a single Chromium renderer thread. By creating multiple Playwright Page instances, we can distribute the frame capture workload across multiple Chromium renderer processes. Each page seeks to its assigned frame, captures it in parallel, and returns the buffer. We then write the buffers to FFmpeg sequentially. This leverages the multi-core CPU availability of the microVM.

## File Inventory
- `packages/renderer/src/Renderer.ts`

## Implementation Spec

### Step 1: Initialize Multiple Pages
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the initialization block, instead of creating a single page, create a pool of pages based on a fixed concurrency limit. Wait for all pages to be created.

### Step 2: Prepare All Pages Concurrently
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Refactor the preparation block to run for all pages in parallel. Since the strategy and timeDriver hold state, they cannot be shared across multiple pages. You must instantiate a separate strategy and timeDriver for each page. Create arrays to store the strategies and time drivers.

### Step 3: Concurrent Frame Capture Loop
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
Modify the frame capture loop. Implement a sliding window or chunking approach to capture frames in parallel across the page pool, while strictly maintaining sequential writing to FFmpeg's stdin pipe.
For example, you can maintain an array of page promises. For a given frame index, target page is the index modulo the concurrency limit. The frame capture waits on the target page's previous promise, then executes the target timeDriver and strategy capture. The write promise waits for the frame capture promise to resolve before writing to FFmpeg to ensure sequential order.

### Step 4: Cleanup All Pages
**File**: `packages/renderer/src/Renderer.ts`
**What to change**:
In the cleanup phase, ensure all pages are correctly cleaned up. Ensure cleanup is called for all instantiated strategies.

## Test Plan
1. Run `cd packages/renderer && npx tsx tests/verify-codecs.ts` to ensure the codecs tests pass.
2. Execute the DOM rendering benchmark using a standard composition to verify output video frames are in chronological order and measure wall-clock render time.
