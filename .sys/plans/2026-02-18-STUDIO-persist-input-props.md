#### 1. Context & Goal
- **Objective**: Allow users to save their tweaked input props as defaults for the composition, persisting them to `composition.json`.
- **Trigger**: Currently, any changes made to input props in the Studio UI are lost upon page reload, breaking the "WYSIWYG" editor promise.
- **Impact**: This unlocks a true "Studio" workflow where the UI can be used to permanently configure compositions, not just preview them. It improves the Developer Experience by removing the need to manually copy-paste JSON into files.

#### 2. File Inventory
- **Modify**: `packages/studio/src/server/templates/types.ts` (Update `CompositionOptions` interface to include `defaultProps`).
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `CompositionMetadata` interface, handle `defaultProps` loading logic).
- **Modify**: `packages/studio/src/components/PropsEditor.tsx` (Add "Save Defaults" button to `PropsToolbar`).
- **Read-Only**: `packages/studio/src/server/discovery.ts` (Backend logic already supports merging metadata, but should be verified).

#### 3. Implementation Spec
- **Architecture**:
  - The `composition.json` file serves as the source of truth for metadata. We will extend it to store `defaultProps`.
  - The Backend (`discovery.ts`) already implements a generic merge strategy for metadata updates, so it likely requires no code changes if types are aligned.
  - The Frontend (`StudioContext`) needs to:
    1.  Awareness: Include `defaultProps` in the `CompositionMetadata` type.
    2.  Hydration: When a composition is loaded (or controller connects), check `activeComposition.metadata.defaultProps`. If present, inject them into the Player via `controller.setInputProps()`.
    3.  Persistence: Expose a way to save current props.
  - The UI (`PropsEditor`) will add a "Save Defaults" button that invokes the persistence logic.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/server/templates/types.ts
  export interface CompositionOptions {
    // ... existing fields
    defaultProps?: Record<string, any>;
  }

  // packages/studio/src/context/StudioContext.tsx
  export interface CompositionMetadata {
    // ... existing fields
    defaultProps?: Record<string, any>;
  }

  // Inside StudioProvider
  useEffect(() => {
    // When composition or controller changes, if we have saved defaults, apply them
    // Note: We should probably only do this once per composition load to avoid fighting the user
    if (activeComposition?.metadata?.defaultProps && controller) {
       // Logic to ensure we don't overwrite if the user has already started editing?
       // For MVP: Apply on load. If HMR happens, maybe we re-apply?
       // Ideally: Apply only if playerState.inputProps is empty or matching defaults?
       // Simple approach: controller.setInputProps(metadata.defaultProps)
    }
  }, [activeComposition?.id, controller]); // Be careful with deps

  const saveCompositionProps = async () => {
     if (!activeComposition) return;
     await updateCompositionMetadata(activeComposition.id, {
       defaultProps: playerState.inputProps
     });
  }
  ```

- **Public API Changes**:
  - `CompositionMetadata` and `CompositionOptions` types extended.

- **Dependencies**:
  - None.

#### 4. Test Plan
- **Verification**:
  1.  Launch Studio: `npm run dev` in `packages/studio`.
  2.  Select a composition.
  3.  Modify an input prop in the Props Editor.
  4.  Click the new "Save Defaults" button.
  5.  Reload the browser page.
  6.  Verify that the modified prop value is restored automatically.
  7.  Inspect `examples/[composition]/composition.json` to confirm `defaultProps` field exists.
- **Success Criteria**: Input props persist across a full page reload.
- **Edge Cases**:
  - `inputProps` containing complex objects (JSON).
  - Saving when `composition.json` does not exist (should create it).
  - Saving empty props.
