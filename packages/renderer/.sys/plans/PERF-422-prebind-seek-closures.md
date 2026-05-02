---
id: PERF-422
slug: prebind-seek-closures
status: complete
claimed_by: "executor-session"
---

# RENDERER: Prebind SeekTimeDriver Closures (PERF-422)

#### 1. Context & Goal
- **Objective**: Prebind closures (`stabilityExecutor`, `finish`, `fail`) in the `SeekTimeDriver.ts` injected script (`window.__helios_seek`) and cache media promise handlers directly on DOM elements.
- **Goal**: Eliminate per-frame dynamic allocations and reduce V8 garbage collection overhead in the `SeekTimeDriver` hot path.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Introduce a module-scoped `seekState` object in the injected script to track variables across the pre-bound stability promise executor.
  - Pre-bind `stabilityFinish`, `stabilityFail`, and `stabilityExecutor` functions to avoid creating new closures dynamically inside `window.__helios_seek`.
  - Cache `el.__helios_media_finish` and `el.__helios_media_executor` handlers directly on the media element inside `createMediaPromise` to prevent dynamic allocation of these closures for every seek.
- **Pseudo-Code**:
  ```javascript
  // In window.__helios_seek
  const seekState = { t: 0, timeoutMs: 0, ... };
  const stabilityFinish = () => { /* use seekState */ };
  const stabilityFail = (err) => { /* use seekState */ };
  const stabilityExecutor = (resolve, reject) => { /* use seekState */ };

  // In createMediaPromise
  if (!el.__helios_media_finish) {
     el.__helios_media_finish = () => { ... };
  }
  if (!el.__helios_media_executor) {
     el.__helios_media_executor = (resolve) => { ... };
  }
  ```
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- Run `npm run build` to verify compilation.
- Run `npm test` to verify `SeekTimeDriver` and all other tests pass, ensuring no scoping or functional issues.
- Benchmark and compare DOM render time using `node benchmark.ts` (or standard benchmark tool).
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.


## Results Summary
- **Best render time**: 33.253s (vs baseline 33.432s)
- **Improvement**: ~0.5%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-422]
