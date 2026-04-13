---
id: PERF-259
slug: prebind-drain-promise
status: complete
result: no-improvement
claimed_by: "executor-session"
---
# RENDERER: Prebind drain promise executor in CaptureLoop (PERF-259)

#### 1. Context & Goal
- **Objective**: In `packages/renderer/src/core/CaptureLoop.ts`, pre-binding the drain promise executor inside `writeToStdin` to a class property eliminates anonymous closure allocations during FFmpeg stream backpressure, reducing V8 garbage collection overhead (PERF-259).

#### 2. File Inventory
- **Modify**: `packages/renderer/src/core/CaptureLoop.ts`
