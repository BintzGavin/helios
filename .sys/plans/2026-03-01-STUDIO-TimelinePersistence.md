# 2026-03-01-STUDIO-TimelinePersistence.md

#### 1. Context & Goal
- **Objective**: Implement persistence for timeline state (Current Frame, In Point, Out Point, Loop) per composition, ensuring the editor restores the user's context after page reloads or composition switches.
- **Trigger**: Vision Gap - The "Browser-based development environment" requirement implies a stable workspace, but the current implementation resets the timeline state whenever the user reloads or switches compositions.
- **Impact**: Improves Developer Experience by preserving context during debugging sessions and reloads.

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add persistence logic)
- **Read-Only**: `packages/studio/src/hooks/usePersistentState.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Use `localStorage` to store a `TimelineState` object keyed by `helios-studio:timeline:${compositionId}`.
  - State object: `{ inPoint: number, outPoint: number, loop: boolean, frame: number }`.
- **Logic Flow**:
  - **Saving**:
    - Listen for changes to `inPoint`, `outPoint`, `loop`. Save immediately.
    - Listen for `isPlaying` transition to `false` (pause). Save `currentFrame`.
    - Listen for `beforeunload` event. Save `currentFrame`.
    - Avoid saving `currentFrame` on every update (60fps).
  - **Restoring**:
    - When `activeComposition` changes (or on mount):
      - Check `localStorage` for `helios-studio:timeline:${id}`.
      - If found:
        - `setInPoint(saved.inPoint)`
        - `setOutPoint(saved.outPoint)`
        - `setLoop(saved.loop)`
        - Wait for `controller` to be non-null.
        - Call `controller.seek(saved.frame)`.
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Open a composition.
  - Set In=10, Out=50, Loop=ON, Seek to frame 25.
  - Reload page.
  - Verify state is restored (In=10, Out=50, Loop=ON, Frame=25).
  - Switch to another composition, change state, switch back. Verify persistence.
- **Success Criteria**: Timeline state survives page reloads and composition switches.
- **Edge Cases**:
  - `activeComposition` is null (do nothing).
  - Saved frame > Duration (Controller should handle clamping, but good to verify).
  - Storage quota full (catch errors).
