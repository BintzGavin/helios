# 2026-09-12-RENDERER-Deterministic-Randomness

## 1. Context & Goal
- **Objective**: Enforce deterministic `Math.random()` behavior across all rendering strategies to ensure consistent visual output in distributed rendering workflows.
- **Trigger**: The README promises "Deterministic" rendering, but `Math.random()` currently relies on the browser's implementation, which is not seeded or consistent across process restarts (distributed chunks). This causes visual jumps in generative compositions (e.g., particles) at chunk boundaries.
- **Impact**: Enables seamless distributed rendering for compositions using `Math.random()`, eliminating visual artifacts and ensuring that "Run A" and "Run B" produce bit-exact identical outputs.

## 2. File Inventory
- **Create**: `packages/renderer/src/utils/random-seed.ts` (Contains the Mulberry32 PRNG polyfill script)
- **Create**: `tests/verify-random-determinism.ts` (Verification script)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Inject random polyfill in `init`)
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Inject random polyfill in `init`)
- **Read-Only**: `packages/renderer/src/Renderer.ts`

## 3. Implementation Spec
- **Architecture**: Use `page.addInitScript` (via `TimeDriver.init`) to overwrite `window.Math.random` with a seeded PRNG (Mulberry32) before the page loads. This ensures all scripts (including framework initialization) consume the same random sequence.
- **Pseudo-Code**:
  - **`utils/random-seed.ts`**:
    - Export `RANDOM_SEED_SCRIPT` string containing a closure that overrides `Math.random`.
    - Use a fixed hardcoded seed (e.g., `0x12345678`) to ensure global consistency.
  - **`CdpTimeDriver.init`**:
    - Call `page.addInitScript` injecting `RANDOM_SEED_SCRIPT`.
  - **`SeekTimeDriver.init`**:
    - Update existing `addInitScript` call to also include `RANDOM_SEED_SCRIPT`.

- **Public API Changes**: None. Internal behavioral change only.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run verify:random` (New script `tests/verify-random-determinism.ts`)
  - The script will:
    1. Render a "Run A" of a composition that draws `Math.random()` values to a canvas.
    2. Render a "Run B" of the same composition.
    3. Compare the output screenshots/buffers.
- **Success Criteria**: The outputs of Run A and Run B must be identical.
- **Edge Cases**:
  - Verify that framework hydration (which might use random IDs) doesn't break.
  - Verify that `crypto.getRandomValues` (if used) is unaffected.
