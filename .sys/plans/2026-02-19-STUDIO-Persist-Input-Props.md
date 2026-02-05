# Context & Goal
- **Objective**: Implement persistence for user-configured input props in the Studio by saving them to `composition.json` and restoring them on load.
- **Trigger**: Users currently lose their Props Editor changes when reloading the page, violating the "WYSIWYG" and "Persistent Workspace" vision.
- **Impact**: Enables a true "Studio" experience where configuration is saved, allowing the `composition.json` to act as the single source of truth for composition state. This addresses a documented "Critical Learning" regarding data persistence.

# File Inventory
- **Modify**:
  - `packages/studio/src/server/templates/types.ts`: Update `CompositionOptions` to include optional `defaultProps`.
  - `packages/studio/src/server/plugin.ts`: Update the `PATCH /api/compositions` handler to extract `defaultProps` from the request body and pass it to `updateCompositionMetadata`.
  - `packages/studio/src/context/StudioContext.tsx`: Update `CompositionMetadata` interface to include `defaultProps`.
  - `packages/studio/src/components/PropsEditor.tsx`: Implement a `useEffect` that debounces changes to `inputProps` and calls `updateCompositionMetadata` to save them.
  - `packages/studio/src/components/Stage/Stage.tsx`: Update the controller connection logic to check for `activeComposition.metadata.defaultProps` and apply them via `controller.setInputProps()` if present.

# Implementation Spec
- **Architecture**:
  - **Backend**: Extend the `composition.json` schema to store `defaultProps`. The existing `updateCompositionMetadata` function in `discovery.ts` already merges metadata, so we just need to ensure the API endpoint allows `defaultProps` to pass through.
  - **Frontend**:
    - `PropsEditor` acts as the "Editor" for this state. It will maintain a local "dirty" state (implicitly via the `inputProps` change stream) and debounce writes to the API (e.g., 1000ms delay) to avoid excessive filesystem I/O.
    - `Stage` acts as the "Consumer" of this state. When a new controller connects (initial load or HMR), it must check if the composition has persisted props that override the code defaults.
- **Pseudo-Code**:
  - *server/plugin.ts*:
    ```typescript
    if (req.method === 'PATCH') {
      // ... existing code ...
      const { width, height, fps, duration, defaultProps } = body;
      const options: any = {};
      // ... existing checks ...
      if (defaultProps !== undefined) options.defaultProps = defaultProps;
      // ... call updateCompositionMetadata ...
    }
    ```
  - *components/PropsEditor.tsx*:
    ```typescript
    useEffect(() => {
      // Debounce logic
      const timer = setTimeout(() => {
        if (inputProps && activeComposition) {
           updateCompositionMetadata(activeComposition.id, { defaultProps: inputProps });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }, [inputProps, activeComposition]);
    ```
  - *components/Stage/Stage.tsx*:
    ```typescript
    // Inside controller connection effect
    if (freshCtrl && freshCtrl !== controller) {
       setController(freshCtrl);
       // Check for persisted props
       if (activeComposition?.metadata?.defaultProps) {
          freshCtrl.setInputProps(activeComposition.metadata.defaultProps);
       }
       // ... existing HMR logic ...
    }
    ```
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. **Initial State**: Open Studio and select a composition. Verify `composition.json` does not have `defaultProps`.
  2. **Edit**: Change a prop value (e.g., a color or number) in the Props Editor. Wait 1-2 seconds.
  3. **Persist Check**: Check `composition.json` on disk. It should now contain the `defaultProps` field with the new value.
  4. **Reload**: Refresh the browser page (F5).
  5. **Restore Check**: Verify that the Props Editor shows the saved value, not the code default.
- **Success Criteria**:
  - User configuration survives a full page reload.
  - `composition.json` remains valid JSON.
  - No infinite loops or performance degradation from auto-save.
- **Edge Cases**:
  - **Rapid Typing**: Ensure we don't spam the API for every keystroke (debounce verification).
  - **Empty Props**: Ensure clearing props doesn't break the file.
  - **Conflict**: If HMR reloads the code defaults, does it override the saved props? (Saved props should take precedence, or at least be re-applied).
