# 📋 STUDIO: Composition Settings Modal

#### 1. Context & Goal
- **Objective**: Implement a "Composition Settings" modal to allow users to edit the metadata (Width, Height, FPS, Duration) of an existing composition.
- **Trigger**: Currently, users can define these settings during creation but cannot change them later without manually editing the `composition.json` file. This is a gap in the WYSIWYG vision.
- **Impact**: Unlocks full lifecycle management of composition settings from the UI, improving the developer experience.

#### 2. File Inventory
- **Create**:
    - `packages/studio/src/components/CompositionSettingsModal.tsx`: The modal UI component.
    - `packages/studio/src/components/CompositionSettingsModal.css`: Styles for the modal (can base on `CreateCompositionModal.css`).
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Add `updateCompositionMetadata` function.
    - `packages/studio/vite-plugin-studio-api.ts`: Add `PATCH /api/compositions` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Add `updateCompositionMetadata` action and `isSettingsOpen` state.
    - `packages/studio/src/components/Stage/StageToolbar.tsx`: Add a "Settings" (⚙️) button to open the modal.
    - `packages/studio/src/App.tsx`: Mount the `CompositionSettingsModal`.
- **Read-Only**:
    - `packages/studio/src/components/CreateCompositionModal.tsx`: For reference.

#### 3. Implementation Spec
- **Architecture**:
    - **Backend**: Expose a `PATCH /api/compositions` endpoint that accepts `{ id, width, height, fps, duration }`. It validates existence and permissions, then updates `composition.json`.
    - **Frontend State**: `StudioContext` manages `isSettingsOpen` and provides `updateCompositionMetadata(id, metadata)`. This function calls the API, then updates the local `compositions` list and `activeComposition` (which triggers canvas resize).
    - **UI**: A modal form, similar to "Create Composition", but pre-filled. Triggered by a new button in the `StageToolbar`.

- **Pseudo-Code**:
    - **`discovery.ts`**:
      ```typescript
      function updateCompositionMetadata(rootDir, id, metadata) {
        // validate paths
        // read composition.json
        // merge metadata
        // write composition.json
        // return updated info
      }
      ```
    - **`StudioContext.tsx`**:
      ```typescript
      const updateCompositionMetadata = async (id, meta) => {
        await fetch('/api/compositions', { method: 'PATCH', body: ... });
        // update local state
      }
      ```

- **Public API Changes**:
    - `StudioContext`: `isSettingsOpen`, `setSettingsOpen`, `updateCompositionMetadata`.
    - HTTP API: `PATCH /api/compositions`.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    - Run `npx helios studio`.
    - Open "Settings" modal via new toolbar button.
    - Change FPS and Resolution.
    - Save.
    - Verify Stage resizes immediately.
    - Reload page and verify settings persist.
- **Success Criteria**: `composition.json` is updated, and UI reflects changes without errors.
- **Edge Cases**: Updating a non-existent ID (404), invalid numeric values (backend validation).
