---
status: complete
---

# Plan: Increment `currentTime` instead of re-multiplying in `CaptureLoop.ts` single-worker paths
(Discarded: caused shadow DOM timing regressions. The pre-calculated `(startFrame + i + 1) * compTimeStep` ensures strict frame precision without floating point compounding errors).
