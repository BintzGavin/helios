## 2026-01-20 - Unexpected State Sync
**Learning:** The implementation of `HeliosPlayer` already matched the plan (using `window.helios` instead of `updateAnimationAtTime`), but the status file and plan implied it was yet to be done. This suggests a disconnect between the codebase state and the tracking documents.
**Action:** Always verify the actual code state against the plan before assuming work needs to be done. In this case, verification (reading source + build) confirmed the feature was present, allowing me to focus on updating status rather than redundant coding.

## 2026-01-21 - Hybrid Bridge Architecture
**Learning:** Implementing the bridge required a "Dual Mode" controller strategy to support both legacy/direct access (needed for DOM export) and secure bridge access (for sandboxing). The `HeliosController` interface proved essential for abstracting this complexity from the UI logic.
**Action:** When introducing secure/remote patterns to existing local-access code, define a common interface early to decouple the implementation details (Direct vs. IPC) from the consumer logic.
