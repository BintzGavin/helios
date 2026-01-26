# 2026-01-26-CORE-Deterministic-Randomness

## 1. Context & Goal
- **Objective**: Implement a deterministic random number generator (`random()`) in `packages/core`.
- **Trigger**: Vision gap. Programmatic video requires deterministic rendering, meaning the same seed must produce the same output across renders. `Math.random()` violates this, causing "glitching" or inconsistent frames during seeking/rendering.
- **Impact**: Enables generative art, particle systems, and consistent procedural content within Helios compositions.

## 2. File Inventory
- **Create**: `packages/core/src/random.ts` - Implementation of the PRNG.
- **Modify**: `packages/core/src/index.ts` - Export the random function.
- **Read-Only**: `packages/core/package.json`

## 3. Implementation Spec
- **Architecture**: A pure function `random(seed)` that returns a number between 0 and 1. It must be stateless (or appear so) to avoid managing RNG state instances.
- **Algorithm**: Implement a proven hashing algorithm (like a simplified Mulberry32 or SplitMix32 variant) that takes a seed input and produces a uniform float.
  - If seed is `null` or `undefined`, it should probably throw or fallback to a fixed default? *Decision: Fallback to seed 0 or throw.* -> Let's treat null/undefined as a random seed derived from `Math.random()`? No, that breaks determinism. It should be **required**. Or fallback to 0. *Spec: Seed is optional, defaults to 0.*
- **Public API**:
  ```typescript
  /**
   * Generates a deterministic random number between 0 (inclusive) and 1 (exclusive) based on a seed.
   * @param seed - The seed value (number or string).
   */
  export function random(seed: string | number | null): number;
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `random(1)` always returns the same value.
  - `random(1)` != `random(2)`.
  - Output is within [0, 1).
  - Works with string and number seeds.
- **Edge Cases**: Empty string seed, 0, negative numbers.
