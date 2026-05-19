---
id: PERF-548
slug: remove-synchronous-threading-flags
status: complete
claimed_by: "Jules"
created: 2024-05-19
completed: 2024-05-19
result: "discard"
---

# PERF-548: Remove Synchronous Threading Flags in Single-Process Mode

## Results Summary
- **Best render time**: 10.423s (vs baseline ~10.002s)
- **Improvement**: -4.2% (Regression)
- **Kept experiments**: []
- **Discarded experiments**: [Step 1: Remove Synchronous Threading Flags]

## Conclusion
The median render time degraded. While `--single-process` makes the browser conceptually single-threaded, these flags actually force deterministic execution of rendering operations within the main frame loop. Removing them allows Chromium to try offloading work to threads it doesn't have in this context, or breaks the synchronous pipeline expected by the deterministic beginFrame capture loop, leading to wait timeouts or stalls.
