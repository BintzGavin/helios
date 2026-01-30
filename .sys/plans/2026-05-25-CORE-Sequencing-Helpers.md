# Plan: Implement Sequencing Helpers (stagger, shift)

#### 1. Context & Goal
- **Objective**: Implement `stagger` and `shift` helper functions in `packages/core`.
- **Trigger**: Vision gap in "Sequencing" capabilities. Current primitives (`sequence`, `series`) do not support common patterns like overlapping entrances or group delays easily.
- **Impact**: Enables concise, expressive animation code, reinforcing the "Headless Logic Engine" vision.

#### 2. File Inventory
- **Modify**: `packages/core/src/sequencing.ts` (Add `stagger` and `shift` implementations)
- **Modify**: `packages/core/src/sequencing.test.ts` (Add unit tests)
- **Read-Only**: `packages/core/src/index.ts` (Verify exports)

#### 3. Implementation Spec
- **Architecture**: Pure functional helpers that operate on arrays of objects, returning new arrays with modified `from` properties.
- **Pseudo-Code**:
```typescript
/**
 * Staggers a list of items by a fixed interval.
 * Assigns a 'from' time to each item based on its index.
 *
 * @param items The array of items to stagger.
 * @param interval The number of frames to stagger each item by.
 * @param startFrame The frame to start the first item at (default: 0).
 */
export function stagger<T>(items: T[], interval: number, startFrame = 0): (T & { from: number })[] {
  return items.map((item, i) => ({
    ...item,
    from: startFrame + (i * interval)
  }));
}

/**
 * Shifts the start time of a list of sequenced items.
 * Useful for delaying a group of animations relative to another.
 *
 * @param items Array of items with a 'from' property.
 * @param offset The number of frames to shift by (can be negative).
 */
export function shift<T extends { from: number }>(items: T[], offset: number): T[] {
  return items.map(item => ({
    ...item,
    from: item.from + offset
  }));
}
```
- **Public API Changes**:
  - New export `stagger` function.
  - New export `shift` function.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `stagger` correctly assigns `from` based on index * interval.
  - `shift` correctly adds offset to existing `from` values.
  - Chaining `stagger` and `shift` works as expected.
- **Edge Cases**:
  - Empty array input.
  - Single item array.
  - Zero interval/offset.
