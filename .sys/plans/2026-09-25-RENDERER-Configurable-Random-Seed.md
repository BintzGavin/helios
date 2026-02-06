# 2026-09-25-RENDERER-Configurable-Random-Seed

## 1. Context & Goal
- **Objective**: Allow users to configure the random number generator seed via `RendererOptions` to generate different variations of procedural animations while maintaining determinism.
- **Trigger**: Vision Gap in "Deterministic Rendering". While `Math.random()` is deterministic (fixed seed), users currently cannot change this seed to produce "Variant B" of a generative composition without external hacks.
- **Impact**: Unlocks the ability to programmatically generate unique video variations (e.g., "Render 100 variations of this generative background") directly via the Renderer API, improving the generative video workflow.

## 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `randomSeed` to `RendererOptions`)
- **Modify**: `packages/renderer/src/utils/random-seed.ts` (Convert `RANDOM_SEED_SCRIPT` to a function `getSeedScript(seed: number)`)
- **Modify**: `packages/renderer/src/drivers/TimeDriver.ts` (Update `init` signature to accept `seed`)
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Inject seeded script in `init`)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Inject seeded script in `init`)
- **Modify**: `packages/renderer/src/Renderer.ts` (Pass `options.randomSeed` to `timeDriver.init`)

## 3. Implementation Spec
- **Architecture**: Extend the dependency injection pattern in `TimeDriver.init` to accept a runtime configuration value (`randomSeed`) and use a factory function to generate the appropriate client-side script.
- **Pseudo-Code**:
  - **`packages/renderer/src/utils/random-seed.ts`**:
    ```typescript
    export function getSeedScript(seed: number = 0x12345678): string {
      return `
        (function() {
           let seed = ${seed};
           // ... Mulberry32 implementation ...
        })();
      `;
    }
    ```
  - **`packages/renderer/src/types.ts`**:
    ```typescript
    export interface RendererOptions {
      // ...
      /**
       * Seed for the deterministic random number generator.
       * Defaults to 0x12345678.
       */
      randomSeed?: number;
    }
    ```
  - **`packages/renderer/src/drivers/TimeDriver.ts`**:
    ```typescript
    init(page: Page, seed?: number): Promise<void>;
    ```
  - **`packages/renderer/src/Renderer.ts`**:
    ```typescript
    await this.timeDriver.init(page, this.options.randomSeed);
    ```

- **Public API Changes**: `RendererOptions` gains `randomSeed?: number`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm run verify:random-seed` (New script to be added or ad-hoc verification)
  1. Render a composition logging `Math.random()` with `randomSeed: 123`.
  2. Render the same composition with `randomSeed: 456`.
  3. Verify logs/output differ.
  4. Render again with `randomSeed: 123`.
  5. Verify output matches Run 1.
- **Success Criteria**: Different seeds produce different outputs; same seed produces identical outputs.
- **Edge Cases**:
  - `undefined` seed -> Falls back to default `0x12345678` (Preserve backward compatibility).
  - `0` as seed -> Handled correctly.
