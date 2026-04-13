---
id: PERF-270
slug: prebind-capture-loop-then
status: completed
claimed_by: "executor-session"
---

# RENDERER: Prebind CaptureLoop then closures (PERF-270)

#### 1. Context & Goal
- **Objective**: Pre-allocate closures for the promise chain in `CaptureLoop.ts` to avoid creating anonymous `.then` closures inside the hot loop.
- **Trigger**: Identified as an open question in `docs/status/RENDERER-EXPERIMENTS.md`.
- **Impact**: Reduces GC overhead.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/core/CaptureLoop.ts`

## Results Summary
- **Best render time**: 32.14s (vs baseline ~32.13s)
- **Improvement**: ~0%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-270]
