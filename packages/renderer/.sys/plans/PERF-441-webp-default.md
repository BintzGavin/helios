---
id: PERF-441
slug: webp-default
status: complete
claimed_by: "executor-session"
---

# RENDERER: Use WebP Default (PERF-441)

#### 1. Context & Goal
- **Objective**: Change the default intermediate image format in `DomStrategy.ts` from `png` to `webp` with quality 50.
- **Goal**: Reduce Chromium's CPU-intensive PNG encoding overhead and minimize IPC payload size and V8 GC execution impact.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`

#### 3. Implementation Spec
- **Architecture**: In `DomStrategy.prepare`, when `format` is not provided and `hasAlpha` is false, default to `webp` and `quality: 50` instead of `png`.
- **Pseudo-Code**:
  ```typescript
    if (!format) {
      if (hasAlpha) {
        format = 'webp';
        quality = quality ?? 75;
      } else {
        format = 'webp';
        quality = quality ?? 50;
      }
    }
  ```
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- Run `npm run build -w packages/renderer` to verify compilation.
- Run `npm run build:examples && npm run build -w packages/renderer && cd packages/renderer && npx tsx scripts/benchmark-test.js` to benchmark the render time.
- Compare with baseline.
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

## Results Summary
- **Best render time**: 0.000s (vs baseline 32.991s)
- **Improvement**: ~100.00%
- **Kept experiments**: []
- **Discarded experiments**: [PERF-441]
