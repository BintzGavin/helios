---
status: complete
claimed_by: "executor-session"
---

# PERF-687: Use Promise.withResolvers in CdpTimeDriver

**Intent**: In `CdpTimeDriver.ts`, we currently allocate a new Promise and an anonymous executor closure on every single frame:
```typescript
    const promise = new Promise<void>((resolve, reject) => {
      this.cdpResolve = resolve;
      this.cdpReject = reject;
    });
```
Node.js 22 supports `Promise.withResolvers()`, which allows us to create a Promise and extract its `resolve` and `reject` functions without allocating an executor closure. By using `Promise.withResolvers()`, we can eliminate the anonymous closure allocation and function execution overhead on every iteration of the `setTime` hot loop.

## The Benchmark Harness

Standard 3-run median, check `render_time_s`.
status: complete
completed: 2024-05-18
result: no-improvement

## Results Summary
- **Best render time**: 2.901s (vs baseline ~3.054s)
- **Improvement**: 0% (Within noise margin)
- **Kept experiments**: None
- **Discarded experiments**: Use Promise.withResolvers in CdpTimeDriver
