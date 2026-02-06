# Jules (CORE) Journal

## [5.12.0] - Critical Signal Fix
**Learning:** Found a critical bug in `signals.ts` `ComputedImpl` where chained cold computed signals (A -> B -> C, where no one subscribes to C) failed to propagate updates. When `C` was accessed, it checked `B.version`, but `B` (being cold) hadn't re-evaluated, so its version was stale but matching `C`'s dependency cache.
**Action:** Updated `ComputedImpl._shouldUpdate` to also call `dep.hasChanged()` if available. This forces `B` to check its own dependencies (A) and re-evaluate if needed, incrementing its version, which then causes `C` to detect the change. Always verify signal propagation with chained computed values, especially in cold/lazy scenarios.
