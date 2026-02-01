# 📋 STUDIO: Implement Smart Empty State

## 1. Context & Goal
- **Objective**: Improve the onboarding experience by replacing the generic "No composition selected" text with a dedicated "Empty State" screen that guides users to create their first composition or select an existing one.
- **Trigger**: Vision Gap - "V1.x Studio" implies a polished IDE experience, but the current "Empty State" is raw and unhelpful (just gray text).
- **Impact**: New users (and developers starting fresh projects) will see a clear call-to-action ("Welcome to Helios Studio"), reducing confusion and improving perceived polish.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/Stage/EmptyState.tsx` (New component for the welcome screen)
  - `packages/studio/src/components/Stage/EmptyState.css` (Styles for the welcome screen)
- **Modify**:
  - `packages/studio/src/components/Stage/Stage.tsx` (Integrate EmptyState)
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx` (To understand state availability)

## 3. Implementation Spec
- **Architecture**:
  - The `EmptyState` component will consume `StudioContext` to determine if the project has *any* compositions (`compositions.length`).
  - **Scenario A (No Compositions)**: Display "Welcome to Helios Studio" with a prominent "Create Composition" button.
  - **Scenario B (Compositions Exist, None Selected)**: Display "No Composition Selected" with a "Select Composition (⌘K)" button.
  - The component will be rendered inside `Stage.tsx` but *outside* the transformable `stage-content` div, ensuring it remains static and readable regardless of canvas pan/zoom settings.

- **Pseudo-Code (`EmptyState.tsx`)**:
  ```tsx
  export const EmptyState = () => {
    const { compositions, setCreateOpen, setSwitcherOpen } = useStudio();

    // Scenario A: Fresh Project
    if (compositions.length === 0) {
      return (
        <div className="empty-state-overlay">
          <h1>Welcome to Helios Studio</h1>
          <p>Get started by creating your first composition.</p>
          <button className="primary-button" onClick={() => setCreateOpen(true)}>
            + Create Composition
          </button>
        </div>
      );
    }

    // Scenario B: Project Loaded, No Active Tab
    return (
      <div className="empty-state-overlay">
        <h2>No Composition Selected</h2>
        <button className="secondary-button" onClick={() => setSwitcherOpen(true)}>
          Select Composition (⌘K)
        </button>
      </div>
    );
  }
  ```

- **Integration (`Stage.tsx`)**:
  ```tsx
  // ... imports
  import { EmptyState } from './EmptyState';

  export const Stage = ({ src }) => {
    // ... hooks
    const { compositions, setCreateOpen, setSwitcherOpen } = useStudio(); // Add destructuring

    return (
      <div className="stage-container">
         <div className="stage-content" style={{...transform}}>
            {src && <helios-player ... />}
         </div>
         {/* Render overlay if no src */}
         {!src && <EmptyState />}
         <StageToolbar ... />
      </div>
    );
  };
  ```

## 4. Test Plan
- **Verification**:
  1. **Fresh Start**: Run `npx helios studio` in an empty directory. Verify "Welcome" screen and "Create Composition" button appear.
  2. **Creation Flow**: Click "Create", make a composition. Verify Stage loads the player and "Welcome" screen vanishes.
  3. **Deselect/Delete**: Delete the composition. Verify "Welcome" screen returns.
  4. **Multi-Composition**: Create 2 compositions. Manually set URL to invalid/empty. Verify "Select Composition" variant appears (simulating unselected state).
- **Success Criteria**:
  - The "Empty State" is clearly visible and centered.
  - Buttons (`Create`, `Select`) successfully trigger their respective modals.
  - The UI does not pan/zoom when the empty state is active (since it's an overlay).
- **Edge Cases**:
  - `compositions` array is `undefined` (should handle gracefully, though Context init sets `[]`).
  - API failure (compositions fetch fails) -> should probably show "Welcome" or generic empty state.
