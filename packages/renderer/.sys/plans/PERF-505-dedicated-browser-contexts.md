---
status: complete
completed: 2024-05-15
result: failed
claimed_by: "executor-session"
---

# PERF-505: Dedicated Browser Contexts

## Objective
Optimize DOM capture by replacing the single shared browser context with dedicated browser contexts (`browser.newContext()`) for each worker in `BrowserPool.ts` to improve Chromium process isolation and CPU utilization.

## Background
Currently, all concurrent workers in `BrowserPool.ts` share a single `sharedContext`. In Chromium, a single browser context might share renderer processes or have shared state that causes thread contention. By giving each worker its own dedicated browser context, Chromium can better isolate the processes, potentially increasing parallel capture capacity and overall pipeline throughput on CPU-bound microVM environments.

## Steps
1. Modify `BrowserPool.ts` to create a dedicated context for each worker in `createPage`.
2. Ensure tracing, if enabled, is started on each context.
3. Update the `close` method to close all individual contexts instead of just the first worker's shared context.


## Results Summary
- **Best render time**: 19.487s (vs baseline 18.763s)
- **Improvement**: -3.8%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-505]
