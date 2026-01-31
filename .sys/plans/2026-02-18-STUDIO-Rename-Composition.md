# Context & Goal
- **Objective**: Implement "Rename Composition" functionality in Helios Studio.
- **Trigger**: Vision gap - basic CRUD functionality is incomplete; users cannot rename compositions without leaving the Studio interface.
- **Impact**: Improves workflow efficiency and polish for V1.x Studio by allowing full lifecycle management of compositions within the UI.

# File Inventory
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add backend logic to rename composition directories.
  - `packages/studio/vite-plugin-studio-api.ts`: Update `PATCH /api/compositions` to handle optional `name` parameter.
  - `packages/studio/src/context/StudioContext.tsx`: Update `updateCompositionMetadata` to support name changes and propagate API updates.
  - `packages/studio/src/components/CompositionSettingsModal.tsx`: Add "Name" input field to the settings modal.
- **Read-Only**:
  - `packages/studio/src/App.tsx`
  - `packages/studio/src/server/templates/types.ts`

# Implementation Spec

## Architecture
- **Backend**: New `renameComposition` function in `discovery.ts` handles the filesystem operation (`fs.renameSync`). It sanitizes the new name into a kebab-case directory name.
- **API**: `PATCH /api/compositions` is extended to accept `name`. If provided, it triggers the rename logic before applying any metadata updates. The response returns the *new* composition ID and URL.
- **Frontend**: The `CompositionSettingsModal` allows editing the name. The `StudioContext` handles the API call and updates the local state (including `activeComposition`) with the new ID returned by the backend.

## Pseudo-Code

### `packages/studio/src/server/discovery.ts`
```typescript
export function renameComposition(rootDir: string, id: string, newName: string): CompositionInfo {
  // 1. Resolve project root and source directory (id)
  // 2. Security check: Ensure inside project root
  // 3. Sanitize newName -> newDirName (kebab-case)
  // 4. Check if target directory already exists (throw error if so)
  // 5. fs.renameSync(sourceDir, targetDir)
  // 6. Return new CompositionInfo (using new path)
}
```

### `packages/studio/vite-plugin-studio-api.ts`
```typescript
// Inside PATCH /api/compositions middleware
const { id, name, width, height, fps, duration } = body;
let currentId = id;

if (name) {
  // Perform rename
  const newComp = renameComposition(process.cwd(), id, name);
  currentId = newComp.id;

  // If no metadata updates, we can return early or just use this info
}

// Check if there are metadata updates
const hasMetadata updates = (width !== undefined || height !== undefined ...);

if (hasMetadataUpdates) {
  // Apply metadata updates to the CURRENT ID (which might be the new one)
  const updatedComp = updateCompositionMetadata(process.cwd(), currentId, { ... });
  res.end(JSON.stringify(updatedComp));
} else if (name) {
  // If only name changed, return the rename result
  // We need to fetch the result from renameComposition
  // (Pseudo-code simplification: actually capture result from renameComposition)
  res.end(JSON.stringify(newComp));
}
```

### `packages/studio/src/context/StudioContext.tsx`
```typescript
// Update interface
updateCompositionMetadata: (id: string, metadata: CompositionMetadata, name?: string) => Promise<void>;

// Update implementation
const updateCompositionMetadata = async (id: string, metadata: CompositionMetadata, name?: string) => {
  const body = { id, ...metadata };
  if (name) body.name = name;

  // ... fetch call ...

  // Update state logic handles ID change automatically if backend returns new object
}
```

### `packages/studio/src/components/CompositionSettingsModal.tsx`
```typescript
// Add state
const [name, setName] = useState('');

// Initialize
useEffect(() => {
  // ...
  setName(activeComposition.name);
}, [...]);

// Update submit handler
updateCompositionMetadata(activeComposition.id, { ... }, name);

// Render
// Add Input field for Name
```

## Dependencies
- None.

# Test Plan
- **Verification**:
  - Run the Studio: `npx helios studio`
  - Create a new composition "Test Rename".
  - Open Settings Modal.
  - Change name to "Renamed Test".
  - Save.
  - **Success Criteria**:
    - The modal closes without error.
    - The Studio UI (header/switcher) shows "Renamed Test".
    - The composition continues to play (URL updated).
    - Inspecting the filesystem shows the directory name changed from `test-rename` to `renamed-test`.
- **Edge Cases**:
  - Rename to existing name -> Should show error in modal.
  - Rename to invalid name (empty) -> Should show error.
  - Rename while playing -> Should preserve playback state (handled by HMR/Context logic).
