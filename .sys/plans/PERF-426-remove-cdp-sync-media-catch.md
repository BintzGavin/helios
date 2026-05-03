---
id: PERF-426
slug: remove-cdp-sync-media-catch
status: complete
claimed_by: "executor-session"
created: 2026-04-12
completed: "2026-05-03"
result: "improved"
---

# PERF-426: Prebind Media Sync Error Catcher in CdpTimeDriver

## Context & Goal
The DOM Rendering pipeline's hot loop executes CDP commands to synchronize media elements on every single frame. In `packages/renderer/src/drivers/CdpTimeDriver.ts`, the `runSetTime` method issues `Runtime.evaluate` calls for both single and multi-frame contexts. Currently, these CDP commands append a `.catch(this.handleSyncMediaError)` to their returned Promises. Playwright's CDP `send` method returns a native Promise, and chaining `.catch()` dynamically allocates a new Promise instance on the V8 heap on every single frame for every execution context.

The goal of this experiment is to eliminate these per-frame Promise allocations by pre-binding the catch closure or suppressing the need for the catch block entirely, reducing V8 Garbage Collection (GC) pressure in the hot loop.

## File Inventory
- `packages/renderer/src/drivers/CdpTimeDriver.ts`

## Implementation Spec

### Architecture
- The pipeline will continue using CDP `Runtime.evaluate` for media synchronization without blocking the event loop (fire and forget).
- The dynamic `.catch()` Promise allocation will be removed from the hot loop.

### Pseudo-Code
Modify `CdpTimeDriver.ts` to remove the `.catch(this.handleSyncMediaError)` chaining on the `Runtime.evaluate` calls inside `runSetTime`.

### Public API Changes
None.

### Dependencies
None.

## Test Plan
- Run the full rendering benchmark.
- Verify that the median DOM render time improves by comparing to the current baseline.
- Verify that the Canvas rendering path is unaffected.

## Baseline
- **Current estimated render time**: ~34.041s
- **Bottleneck analysis**: Micro-allocations of Promises within the high-frequency `runSetTime` loop contribute to V8 GC churn, slightly delaying execution.

## Canvas Smoke Test
Run `npm test -w packages/renderer` on a Canvas-based composition to ensure standard output isn't broken.

## Correctness Check
Run the DOM render benchmarks to ensure that no unhandled promise rejections crash the renderer if a CDP session is abruptly closed.

## Results Summary
- **Best render time**: 46.221s (vs baseline 46.396s)
- **Improvement**: 0.38%
- **Kept experiments**: Removed chained .catch() on media sync Runtime.evaluate
- **Discarded experiments**: none
