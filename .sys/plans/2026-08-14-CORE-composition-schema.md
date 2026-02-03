# Context & Goal
- **Objective**: Define a pure JSON-serializable schema for Helios compositions (`HeliosComposition`, `HeliosTimeline`, `HeliosClip`) to enable "Prompt to Composition" workflows and distributed rendering.
- **Trigger**: "Prompt to Composition" vision gap and `docs/BACKLOG.md` requirement for "structured prompt schema".
- **Impact**: Enables AI agents to generate valid compositions as structured JSON, and lays the groundwork for saving/loading projects and distributed rendering logic.

# File Inventory
- **Create**:
  - `packages/core/src/types.ts`: Will contain `HeliosConfig`, `HeliosClip`, `HeliosTrack`, `HeliosTimeline`, `HeliosComposition` interfaces.
  - `packages/core/src/types.test.ts`: Unit tests to verify the types can be instantiated and type-checked.
- **Modify**:
  - `packages/core/src/Helios.ts`: Refactor `HeliosOptions` to extend `HeliosConfig` and ensure constructor compatibility.
  - `packages/core/src/index.ts`: Export the new types.
- **Read-Only**:
  - `packages/core/src/schema.ts`: Reference for `HeliosSchema` (input props validation).

# Implementation Spec
- **Architecture**:
  - **Separation of Concerns**: Extract JSON-serializable properties (config) from runtime-only callbacks (options).
  - **Data Structure**: Define a recursive or hierarchical structure for the Timeline -> Track -> Clip model.
  - **Inheritance**: `HeliosOptions` extends `HeliosConfig` to maintain backward compatibility while promoting the Config as the "save format".
- **Pseudo-Code**:
  ```typescript
  // packages/core/src/types.ts

  export interface HeliosConfig {
    width: number;
    height: number;
    duration: number;
    fps: number;
    // ... other serializable props
  }

  export interface HeliosClip {
    id: string;
    source: string;
    start: number;
    duration: number;
    // ...
  }

  export interface HeliosTimeline {
    tracks: HeliosTrack[];
  }

  export interface HeliosComposition extends HeliosConfig {
    timeline?: HeliosTimeline;
  }
  ```
- **Public API Changes**:
  - New exports: `HeliosConfig`, `HeliosComposition`, `HeliosTimeline`, `HeliosTrack`, `HeliosClip`.
  - `HeliosOptions` now extends `HeliosConfig`.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - All existing tests pass (ensuring `HeliosOptions` refactor is non-breaking).
  - New test `packages/core/src/types.test.ts` passes, confirming that objects matching the new interfaces can be created and used.
- **Edge Cases**:
  - `HeliosOptions` properties that overlap with `HeliosConfig` (e.g. `duration`) must work correctly when passed via the constructor.
  - Optional fields in `HeliosConfig` should be handled gracefully.
