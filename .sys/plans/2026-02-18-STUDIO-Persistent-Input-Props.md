# STUDIO: Persistent Input Props

#### 1. Context & Goal
- **Objective**: Implement persistence for composition input props so they can be saved as defaults and restored when the composition is loaded.
- **Trigger**: "Vision Gap" - The "WYSIWYG" experience is broken when reloading the page resets all tweaked props.
- **Impact**: Improves the "Studio" experience by allowing users to save their parameter tweaks as the new defaults for the composition.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/templates/types.ts` (Update `CompositionOptions`)
  - `packages/studio/src/context/StudioContext.tsx` (Update `CompositionMetadata` interface)
  - `packages/studio/src/components/PropsEditor.tsx` (Add "Save Defaults" button and handler)
  - `packages/studio/src/components/Stage/Stage.tsx` (Apply defaults on load)
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts` (Already handles generic metadata merging, but verify logic)
  - `packages/studio/src/server/plugin.ts` (API handler)

#### 3. Implementation Spec
- **Architecture**:
  - Extend the `composition.json` schema (via `CompositionOptions` type) to include `defaultProps`.
  - Use the existing `updateCompositionMetadata` flow in `StudioContext` -> API -> `discovery.ts` to save the props.
  - In `PropsEditor`, add a "Save Defaults" button that calls `updateCompositionMetadata(activeComposition.id, { defaultProps: inputProps })`.
  - In `Stage`, detect "Fresh Load" (non-HMR) by checking if `src` has changed. If so, apply `activeComposition.metadata.defaultProps` to the controller.

- **Pseudo-Code**:
  - **`templates/types.ts`**:
    ```typescript
    interface CompositionOptions {
      // ... existing fields
      defaultProps?: Record<string, any>;
    }
    ```
  - **`StudioContext.tsx`**:
    ```typescript
    interface CompositionMetadata {
      // ... existing fields
      defaultProps?: Record<string, any>;
    }
    ```
  - **`PropsEditor.tsx`**:
    - Add `handleSaveDefaults` function:
      ```typescript
      const handleSaveDefaults = () => {
        updateCompositionMetadata(activeComposition.id, {
           ...activeComposition.metadata,
           defaultProps: inputProps
        });
        toast('Defaults saved');
      }
      ```
    - Add button to `PropsToolbar`.
  - **`Stage.tsx`**:
    - Inside `useEffect` for controller detection:
      ```typescript
      if (freshCtrl && freshCtrl !== controller) {
         // ...
         if (isNewComposition) { // checked via lastStateRef
             if (activeComposition.metadata.defaultProps) {
                 freshCtrl.setInputProps(activeComposition.metadata.defaultProps);
             }
         }
      }
      ```

- **Public API Changes**:
  - `CompositionOptions` and `CompositionMetadata` interfaces updated.
  - `composition.json` file format extended (backward compatible).

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Run `npx helios studio` (or `npm run dev` in package).
  2.  Select a composition.
  3.  Modify some input props in the Props Editor.
  4.  Click "Save Defaults".
  5.  Reload the page (Cmd+R).
  6.  Verify that the modified props are applied automatically.
  7.  Check `composition.json` on disk to verify `defaultProps` are saved.
- **Success Criteria**: Props persist across page reloads.
- **Edge Cases**:
  - Saving empty props.
  - Saving props that violate schema (should be allowed as "input", validation happens in player).
  - Schema changing after defaults saved (Player logic handles extra props gracefully).
