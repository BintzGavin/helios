# STUDIO: Persist Input Props

#### 1. Context & Goal
- **Objective**: Implement persistence for composition input props so they are saved to `composition.json` and restored on load.
- **Trigger**: "Vision Gap" - The "WYSIWYG" experience is broken because any changes to props in the Studio are lost when the page is reloaded.
- **Impact**: Enables a true "Studio" workflow where users can configure their composition's default state visually, serving as the single source of truth.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/templates/types.ts` (Update `CompositionOptions` type)
  - `packages/studio/src/server/plugin.ts` (Update PATCH handler in `studioApiPlugin`)
  - `packages/studio/src/context/StudioContext.tsx` (Update `CompositionMetadata` interface)
  - `packages/studio/src/components/Stage/Stage.tsx` (Inject defaults on controller connection)
  - `packages/studio/src/components/PropsEditor.tsx` (Implement debounced auto-save)
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts` (Verifying metadata merge logic)

#### 3. Implementation Spec
- **Architecture**:
  - Extend the `composition.json` schema to include a `defaultProps` field.
  - The Studio Backend (`plugin.ts`) will accept `defaultProps` in the `PATCH /api/compositions` endpoint and pass it to `updateCompositionMetadata` (which merges it into `composition.json`).
  - The Studio Frontend (`Stage.tsx`) will inject these `defaultProps` into the `HeliosController` immediately after connection (for fresh loads), ensuring the preview matches the persisted state.
  - The `PropsEditor` will implement a debounced auto-save mechanism to persist user changes back to `composition.json` without explicit "Save" actions, aligning with the "Hot Reloading" / "WYSIWYG" philosophy.

- **Pseudo-Code**:
  - **`templates/types.ts`**:
    ```typescript
    export interface CompositionOptions {
      // ... existing
      defaultProps?: Record<string, any>;
    }
    ```
  - **`plugin.ts`**:
    - In `PATCH /api/compositions` handler:
      ```typescript
      const { width, height, fps, duration, defaultProps } = body;
      const options: any = {};
      // ... existing checks
      if (defaultProps !== undefined) options.defaultProps = defaultProps;
      // ... call updateCompositionMetadata
      ```
  - **`StudioContext.tsx`**:
    ```typescript
    export interface CompositionMetadata {
      // ... existing
      defaultProps?: Record<string, any>;
    }
    ```
  - **`Stage.tsx`**:
    - Destructure `activeComposition` from `useStudio`.
    - Inside the `setInterval` loop where `freshCtrl` is detected:
      ```typescript
      if (lastStateRef.current.src !== src) {
         // Fresh load logic
         if (activeComposition?.metadata?.defaultProps) {
             freshCtrl.setInputProps(activeComposition.metadata.defaultProps);
         }
      }
      ```
  - **`PropsEditor.tsx`**:
    - Add `useDebounce` or `setTimeout` effect.
    - Monitor `playerState.inputProps`.
    - When changed, wait 1000ms, then call `updateCompositionMetadata(activeComposition.id, { defaultProps: inputProps })`.
    - Ensure we don't trigger if `inputProps` hasn't effectively changed (deep compare or JSON stringify check).

- **Public API Changes**:
  - `CompositionOptions` and `CompositionMetadata` interfaces extended to include `defaultProps`.
  - `composition.json` file schema extended.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1.  Start Studio: `npm run dev` in `packages/studio`.
  2.  Select an existing composition (or create new).
  3.  Open "Properties" panel.
  4.  Change a text or number prop.
  5.  Wait 1-2 seconds (for debounce).
  6.  Reload the browser page (Cmd+R).
  7.  Verify the prop value persists and is applied to the player on load.
  8.  Check the `composition.json` file in the file system to ensure `defaultProps` field is populated.
- **Success Criteria**: User configuration survives a hard refresh.
- **Edge Cases**:
  - Rapidly typing (debounce should prevent spam).
  - Switching compositions before debounce fires (should probably flush or accept loss, for MVP accept loss).
  - `defaultProps` containing types not supported by JSON (e.g. functions - `PropsEditor` handles JSON serializable types).
