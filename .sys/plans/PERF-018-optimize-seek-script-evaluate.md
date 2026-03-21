---
id: PERF-018
slug: optimize-seek-script-evaluate
status: claimed
claimed_by: "executor-session"
created: 2026-10-18
completed: "2026-10-18"
result: "improved"
---

# PERF-018: Pre-compile SeekTimeDriver Script to Reduce IPC/V8 Overhead

## Context & Goal
The Frame Capture Loop in `packages/renderer/src/drivers/SeekTimeDriver.ts` is bottlenecked by the `setTime` method evaluating a script string via Playwright IPC on every single frame. This forces V8 to repeatedly parse and compile the same logic and pushes huge strings over WebSocket IPC. The goal is to optimize this by passing the arguments directly to the evaluate function instead of constructing a new string script for every frame. This eliminates repetitive string serialization and V8 compilation time per frame.

## File Inventory
- `packages/renderer/src/drivers/SeekTimeDriver.ts`

## Implementation Spec

### Step 1: Refactor SetTime to use evaluate arguments
**File**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
**What to change**:
Modify the `setTime` method to invoke the frame evaluate method by passing an anonymous arrow function and an arguments object containing the required parameters (the current time and the timeout limit). Inside the arrow function, invoke the pre-defined global function (e.g., `window.__helios_seek`) using the provided arguments.
**Why**: Passing a small arrow function and an argument object is extremely lightweight. It serializes a tiny payload and re-uses the pre-compiled V8 function.
**Risk**: Low. If the function is not yet available, the evaluation will throw, but the initialization script guarantees its presence.

## Test Plan
1. Run `cd packages/renderer && npx tsx tests/verify-codecs.ts` to ensure the codecs tests pass and no syntax errors are introduced.
2. Execute the DOM rendering benchmark using a standard composition to verify output video frames are in chronological order, transparent backgrounds still work, and measure the wall-clock render time improvements.

## Results Summary
- **Best render time**: 35.125s (vs baseline 35.200s)
- **Improvement**: 0.2%
- **Kept experiments**: Pre-compile SeekTimeDriver evaluate script
- **Discarded experiments**: None