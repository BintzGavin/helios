# 2026-06-26-CORE-Marker-Metadata.md

#### 1. Context & Goal
- **Objective**: Update the `Marker` interface to support arbitrary metadata and optional labels, aligning with the "Agent Experience First" vision.
- **Trigger**: `SKILL.md` defines `label` as optional, but implementation enforces it. Additionally, agents need a way to attach semantic data (e.g., "scene-type") to markers.
- **Impact**: Enables richer timeline descriptions and "tagging" of video sections, which is critical for AI-driven workflows and Studio integration.

#### 2. File Inventory
- **Modify**: `packages/core/src/markers.ts` (Update interface and validation logic)
- **Modify**: `packages/core/src/markers.test.ts` (Add tests for metadata and optional label)
- **Modify**: `.agents/skills/helios/core/SKILL.md` (Update documentation to reflect `metadata` property)

#### 3. Implementation Spec
- **Architecture**: Extend `Marker` interface with `metadata` bag and optional `label`. Update `validateMarker` to pass through metadata and allow missing label.
- **Public API Changes**:
  ```typescript
  export interface Marker {
    id: string;
    time: number;
    label?: string; // Now optional
    color?: string;
    metadata?: Record<string, any>; // New property
  }
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `validateMarker` accepts `{ id: '1', time: 0, metadata: { type: 'intro' } }`.
  - `validateMarker` accepts `{ id: '1', time: 0 }` (no label).
  - Existing tests pass.
- **Edge Cases**:
  - Metadata containing complex objects (should be passed through).
  - Empty label vs undefined label (both valid).
