# 2026-03-02-CORE-Deterministic-Randomness

## 1. Context & Goal
- **Objective**: Implement a seeded, deterministic random number generator (`random()`) in `packages/core`.
- **Trigger**: Vision gap - "Programmatic Video" requires determinism, but users currently lack a safe alternative to `Math.random()`.
- **Impact**: Enables reproducible procedural animations (e.g. particle systems, noise) that render identically across frames and sessions.

## 2. File Inventory
- **Create**:
  - `packages/core/src/random.ts`: Implementation of the PRNG and helper function.
  - `packages/core/src/random.test.ts`: Unit tests for determinism and distribution.
- **Modify**:
  - `packages/core/src/index.ts`: Export the `random` function.
- **Read-Only**: `packages/core/src/animation.ts` (for reference pattern).

## 3. Implementation Spec
- **Architecture**: Functional Helper (similar to `interpolate`). Pure function `random(seed)` that returns a number [0, 1).
- **Algorithm**: Mulberry32 (fast, high-quality 32-bit PRNG).
  - Input: `seed` (string | number). If string, hash it to a 32-bit integer first.
  - Output: Float between 0 (inclusive) and 1 (exclusive).
- **Pseudo-Code**:
  ```typescript
  function cyrb128(str) {
      // String hashing algo (e.g. cyrb128 or simple djb2 variant) to get a seed state
  }

  function mulberry32(a) {
      return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
  }

  export function random(seed: number | string): number {
     let seedNum = typeof seed === 'string' ? hashString(seed) : seed;
     // Single invocation of PRNG for stateless usage
     return mulberry32(seedNum)();
  }
  ```
- **Public API**:
  ```typescript
  /**
   * Generates a deterministic random number between 0 and 1 based on a seed.
   * @param seed A number or string to seed the generator.
   */
  export function random(seed: number | string): number;
  ```
- **Dependencies**: None (Zero dependency).

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `random(123)` always returns the same value.
  - `random('hello')` always returns the same value.
  - `random(1) !== random(2)`.
  - Distribution check (roughly uniform).
- **Edge Cases**:
  - Seed 0, negative numbers, empty strings.
