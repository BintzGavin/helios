---
status: complete
result: "Discarded"
---
# PERF-805: Optimize Base64 Decode Buffer Allocation

## Hypothesis
Base64 encoding represents 3 bytes of data for every 4 characters. Currently in `DomStrategy.ts`, we calculate buffer capacity by taking the raw string length of the Base64 string `const chars = b64.length;`. This results in allocating at least 33% more memory than is strictly needed since the maximum binary length is `(chars * 3) / 4`. Furthermore, calculating it via `(chars * 3) >>> 2` allows a fast bitwise operation for upper bound calculation. Optimizing this calculation will reduce memory over-allocation and unnecessary buffer capacity thresholds, slightly decreasing memory usage and potentially reducing GC pressure.

## Approach
1. In `packages/renderer/src/strategies/DomStrategy.ts`, update `processCaptureResult` to calculate the max required byte length: `const maxBytes = (chars * 3) >>> 2;`.
2. Use `maxBytes` instead of `chars` for the buffer capacity check and reallocation threshold: `if (!buf || maxBytes > buf.length)` and `Math.max(maxBytes, buf.length + (buf.length >> 1))`.

## Steps
1. Edit `packages/renderer/src/strategies/DomStrategy.ts` using `sed` or `git apply` to apply the optimized allocation logic.
2. Build the renderer (`npm run build -w packages/renderer`).
3. Run the performance benchmark 3 times: `npx tsx packages/renderer/scripts/benchmark-perf.ts --mode dom`.
4. Run tests to verify correctness: `npm run test -w packages/renderer`.
5. Update `docs/status/RENDERER-EXPERIMENTS.md` with the outcome.
6. Record results to `packages/renderer/.sys/perf-results-PERF-805.tsv`.
7. Mark plan complete and PR changes.

## Results Summary
Discarded as obsolete: The Base64 decode logic in `DomStrategy.ts` was refactored and hoisted to `CaptureLoop.ts` in previous experiments, and the `(length * 3) >>> 2` bitwise optimization is already natively present in the codebase. No changes necessary.
