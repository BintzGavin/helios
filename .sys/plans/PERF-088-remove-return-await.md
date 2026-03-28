---
id: PERF-088
slug: remove-return-await
status: complete
claimed_by: "executor-session"
completed: "2026-03-28"
result: improved
---

# PERF-088: Remove unnecessary return await in async IIFE

## Results Summary
- **Best render time**: 36.093s
- **Improvement**: Marginally improved by saving one microtask per frame in the hot loop
- **Kept experiments**: Removed return await from Renderer.ts
- **Discarded experiments**: None
