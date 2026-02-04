# 2026-02-18-STUDIO-persistent-props

## 1. Context & Goal
- **Objective**: Implement persistence for composition input props so user edits in the Studio survive session restarts.
- **Trigger**: Vision gap - "Browser-based development environment" requires saving state. Currently, `inputProps` modified in the Studio are lost on page refresh.
- **Impact**: Unlocks a true IDE workflow where users can fine-tune composition parameters and save them as project defaults in `composition.json`.

## 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/templates/types.ts`: Update `CompositionOptions` to include `defaultProps`.
  - `packages/studio/src/context/StudioContext.tsx`: Update `CompositionMetadata` interface and add logic to apply defaults on load.
  - `packages/studio/src/components/PropsEditor.tsx`: Add "Save Defaults" button to the toolbar.
- **Read-Only**:
  - `packages/studio/src/server/discovery.ts`: (Used for reference, handles generic metadata updates).

## 3. Implementation Spec
### Architecture
- **Data Store**: Use the existing `composition.json` file (which stores `width`, `height`, etc.) to store a new field `defaultProps`.
- **API**: Reuse the existing `PATCH /api/compositions` endpoint which already merges metadata into `composition.json`.
- **Frontend**:
  - `StudioContext` will detect when a new composition is loaded and inject `defaultProps` into the `HeliosController`.
  - `PropsEditor` will provide a UI to save the current runtime `inputProps` back to the server as `defaultProps`.

### Pseudo-Code

**1. Update Types (`packages/studio/src/server/templates/types.ts`)**
```typescript
export interface CompositionOptions {
  // ... existing fields
  defaultProps?: Record<string, any>;
}
```

**2. Update Context (`packages/studio/src/context/StudioContext.tsx`)**
```typescript
interface CompositionMetadata {
  // ... existing fields
  defaultProps?: Record<string, any>;
}

// State to track if we've applied defaults for the current session/composition
const [appliedDefaultsCompId, setAppliedDefaultsCompId] = useState<string | null>(null);

// Effect: Apply defaults when composition changes
useEffect(() => {
  if (controller && activeComposition && activeComposition.id !== appliedDefaultsCompId) {
    if (activeComposition.metadata?.defaultProps) {
      // Only apply if we have defaults
      controller.setInputProps(activeComposition.metadata.defaultProps);
    }
    // Mark as applied so we don't overwrite if HMR reloads the controller later
    setAppliedDefaultsCompId(activeComposition.id);
  }
}, [controller, activeComposition, appliedDefaultsCompId]);
```

**3. Update UI (`packages/studio/src/components/PropsEditor.tsx`)**
```typescript
// Add Save Handler
const handleSaveDefaults = async () => {
  if (activeComposition && inputProps) {
     await updateCompositionMetadata(activeComposition.id, {
       ...activeComposition.metadata, // (optional, API merges, but safer to be explicit if needed)
       defaultProps: inputProps
     });
  }
};

// Add Button to Toolbar
<button onClick={handleSaveDefaults}>Save Defaults</button>
```

### Public API Changes
- **Type Definition**: `CompositionOptions` now includes `defaultProps?: Record<string, any>`.
- **REST API**: `PATCH /api/compositions` payload now accepts `defaultProps` within the metadata object (implicitly supported by generic implementation).

## 4. Test Plan
### Verification
- **Automated**: Run `npm test` to ensure no regression in `StudioContext`.
- **Manual Verification Script**:
  - Since this involves UI persistence, an E2E test or manual verification is best.
  - Create a temporary test composition.
  - Open Studio, modify props.
  - Click "Save Defaults".
  - Inspect `composition.json` to verify `defaultProps` are written.
  - Refresh Studio page.
  - Verify props are restored to the saved values.

### Success Criteria
- `composition.json` is updated with `defaultProps` after saving.
- Reloading the Studio with that composition active restores the saved props.
- Switching to a different composition and back restores the saved props.

### Edge Cases
- **HMR**: Ensure Hot Module Reloading does NOT trigger the "Apply Defaults" logic (it should restore `lastStateRef` instead).
- **Empty Props**: Saving empty props should result in empty object or undefined in JSON.
- **Stale Props**: If code schema changes (e.g. prop removed), `defaultProps` might contain extra keys. Helios Core should handle this gracefully (ignoring unknown props), but UI might show them if not filtered. (Acceptable for this iteration).
