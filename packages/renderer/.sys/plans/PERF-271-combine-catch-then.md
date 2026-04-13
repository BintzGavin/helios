---
id: PERF-271
slug: combine-catch-then
status: complete
claimed_by: "executor-session"
completed: 2024-05-18
result: improved
---

## 1. Context & Goal
The goal is to combine `.catch` and `.then` handlers into a single `.then(resolve, reject)` in `CaptureLoop.ts` to reduce GC overhead and microtask serialization delays.

## 2. File Inventory
- `packages/renderer/src/core/CaptureLoop.ts`

## 3. Implementation Spec
Replace `worker.activePromise.catch(noopCatch).then(...)` with a single `.then(execute, execute)`.

## 4. Test Plan
Run benchmark, verify output and test suite.

## Results Summary
- **Best render time**: 32.105s (vs baseline 43.939s)
- **Improvement**: ~26.9%
- **Kept experiments**: [PERF-271] Combined `.catch` and `.then` in `CaptureLoop.ts`
- **Discarded experiments**: none
