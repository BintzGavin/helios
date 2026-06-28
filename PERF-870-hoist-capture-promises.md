---
id: PERF-870
slug: hoist-capture-promises
status: unclaimed
claimed_by: ""
created: 2024-06-28
completed: ""
result: ""
---

# PERF-870: Optimizing `timePromise` check in Single Worker loops

## Focus Area
The single worker paths in `CaptureLoop.ts` involve a pattern where we optionally await `timePromise` only when it is defined.

## Background Research
Currently in the chunked fast paths, we evaluate:
```typescript
if (timePromise) await timePromise;
```
For `isDomStrategy` paths, `timePromise` is always defined. For `!isDomStrategy` paths, we could initialize `timePromise` identically to `isDomStrategy` to remove the branch overhead, or better yet, since the loops are already unswitched (isDomStrategy vs !isDomStrategy), we know definitively whether `timePromise` is going to be null or non-null. By strictly resolving this at the unswitched level, we can eliminate the `if (timePromise)` check.

Looking at the code, `timePromise` is a ReusableThenable or a `timeDriver.setTime()` promise.
Wait, let's check `CaptureLoop.ts` around line 280 to see how `timePromise` is used.
