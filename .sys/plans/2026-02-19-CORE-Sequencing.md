# 📋 CORE: Implement Sequencing Primitives

## 1. Context & Goal
- **Objective**: Implement `sequence` and `series` logic primitives in `packages/core`.
- **Trigger**: Vision Gap - `README.md` lists "Timeline sequencing component" and "Sequential composition helper" as planned features.
- **Impact**: Enables framework-agnostic time manipulation (e.g., `<Sequence>` logic) without dependencies, closing a gap in the "Animation Helpers" roadmap.

## 2. File Inventory
- **Create**:
  - `packages/core/src/sequencing.ts`: Implementation of sequencing logic.
  - `packages/core/src/sequencing.test.ts`: Unit tests for sequencing logic.
- **Modify**:
  - `packages/core/src/index.ts`: Export the new module.
- **Read-Only**:
  - `packages/core/src/animation.ts`

## 3. Implementation Spec
- **Architecture**: Pure functional primitives with no side effects.
- **Pseudo-Code**:
  ```typescript
  // sequencing.ts

  export interface SequenceOptions {
    frame: number;
    from: number;
    durationInFrames?: number;
  }

  export interface SequenceResult {
    localFrame: number;
    relativeFrame: number; // Same as localFrame, alias for clarity
    progress: number; // 0 to 1
    isActive: boolean; // true if within duration (or infinite if no duration)
  }

  export function sequence(options: SequenceOptions): SequenceResult {
    // calculate localFrame = frame - from
    // determine isActive based on durationInFrames
    // calculate progress (clamped 0-1)
    // return object
  }
  ```
- **Public API Changes**:
  - Export `sequence` function.
  - Export `SequenceOptions` and `SequenceResult` interfaces.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/core`
- **Success Criteria**:
  - `sequencing.test.ts` passes all tests.
  - Tests cover:
    - Before start time (`isActive: false`)
    - During duration (`isActive: true`, `localFrame` correct)
    - After duration (`isActive: false`)
    - Infinite duration (no `durationInFrames` provided)
- **Edge Cases**:
  - `durationInFrames: 0`
  - Negative start time
