---
id: PERF-017
slug: optimize-seek-script
status: complete
claimed_by: "executor-session"
created: 2026-10-18
completed: "2026-10-18"
result: "improved"
---

# PERF-017: Pre-compile SeekTimeDriver Script to Reduce IPC/V8 Overhead

## Context & Goal
The Frame Capture Loop in `packages/renderer/src/drivers/SeekTimeDriver.ts` is bottlenecked by the `setTime` method evaluating a massive, multi-kilobyte anonymous script string via Playwright IPC on every single frame. This forces V8 to repeatedly parse and compile the same logic and pushes huge strings over WebSocket IPC. The goal is to optimize this by injecting the script logic once during the initialization phase as a global function (e.g., `window.__helios_seek`), and simply invoking this function with a lightweight payload on every frame. This eliminates repetitive IPC overhead and V8 compilation time per frame.

## File Inventory
- `packages/renderer/src/drivers/SeekTimeDriver.ts`

## Implementation Spec

### Step 1: Define Global Function During Initialization
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
In the `init` method, inject the entire logic of `setTime` into the page as a global async function using an initialization script injection method. Refactor the large string currently constructed in `setTime` into a new initialization script that assigns an asynchronous function to a property on the global window object. Include all necessary helper variables defined in `dom-scripts.ts` above this global function declaration so they are parsed exactly once per page load.
**Why**: This causes V8 to parse and compile the bytecode exactly once before the composition loads, keeping the optimized logic in memory.
**Risk**: Low. Similar initialization scripts are already injected.

### Step 2: Refactor SetTime to Invoke Global Function
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `setTime` method to invoke the pre-defined global function. Instead of passing the massive string to the frame evaluation method, pass a lightweight arrow function that calls the global function with the required parameters (the current time and the timeout limit).
**Why**: Passing a small arrow function and an argument object is extremely lightweight. It serializes a tiny payload and re-uses the pre-compiled V8 function.
**Risk**: Low. If the function is not yet available, the evaluation will throw, but the initialization script guarantees its presence.

## Test Plan
1. Run `cd packages/renderer && npx tsx tests/verify-codecs.ts` to ensure the codecs tests pass and no syntax errors are introduced.
2. Execute the DOM rendering benchmark using a standard composition to verify output video frames are in chronological order, transparent backgrounds still work, and measure the wall-clock render time improvements.

## Results Summary
- **Best render time**: 32.217s (vs baseline 33.823s)
- **Improvement**: 4.7%
- **Kept experiments**: Verified precompiled `SeekTimeDriver` optimization.
- **Discarded experiments**: None.
