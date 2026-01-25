# 1. Context & Goal
- **Objective**: Implement the `series` helper function in `packages/core` to facilitate sequential layout of composition elements.
- **Trigger**: "Sequential composition helper" is a documented vision gap in the README Roadmap (V1.x Animation Helpers).
- **Impact**: Enables users to declaratively define timelines where items follow one another, without manually calculating start frames. This brings `packages/core` closer to the feature parity promised in the Roadmap.

# 2. File Inventory
- **Modify**: `packages/core/src/sequencing.ts` (Add `series` function and interfaces)
- **Modify**: `packages/core/src/sequencing.test.ts` (Add unit tests for `series`)
- **Read-Only**: `packages/core/src/index.ts` (Already exports `* from './sequencing'`)

# 3. Implementation Spec
- **Architecture**: Pure functional helper. Takes an array of descriptors, returns an array of descriptors with calculated time offsets. It follows the existing pattern of pure functions in `sequencing.ts`.
- **Pseudo-Code**:
  ```typescript
  interface SeriesItem {
    durationInFrames: number
    offset?: number
  }

  function series(items, startFrame = 0) {
    let current = startFrame;
    return items.map(item => {
      // Offset shifts the start time of THIS item relative to the end of the PREVIOUS item
      const from = current + (item.offset || 0);

      // The next item starts after this one ends
      // End time = from + duration
      current = from + item.durationInFrames;

      return { ...item, from };
    })
  }
  ```
- **Public API Changes**:
  - Export `interface SeriesItem { durationInFrames: number; offset?: number; [key: string]: any; }`
  - Export `function series<T extends SeriesItem>(items: T[], startFrame?: number): (T & { from: number })[]`

# 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - **Standard Sequence**: `series([{durationInFrames: 10}, {durationInFrames: 10}])` -> Item 1 at 0, Item 2 at 10.
  - **With Offset**: `series([{durationInFrames: 10}, {durationInFrames: 20, offset: -5}])` -> Item 1 at 0, Item 2 at 5 (10-5). Item 3 (if any) would start at 25 (5+20).
  - **Prop Pass-through**: Extra properties on input items must be present in output items.
  - **Start Frame**: `series(..., 100)` shifts everything by 100.
- **Edge Cases**:
  - Empty array returns empty array.
  - Zero duration items work correctly (act as markers).
  - Negative offsets allowing overlap.
