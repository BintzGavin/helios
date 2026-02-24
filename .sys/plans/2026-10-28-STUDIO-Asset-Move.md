# Plan: Asset Drag-and-Drop Organization

## 1. Context & Goal
- **Objective**: Implement drag-and-drop support for moving assets (files and folders) into other folders within the Studio Assets Panel.
- **Trigger**: Vision gap in "Manage assets" - currently users can upload and delete, but cannot organize assets into folders using the UI, limiting scalability for larger projects.
- **Impact**: Improves usability and allows for better project organization, aligning with the "IDE-like" vision of Helios Studio.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add `moveAsset` function to handle filesystem move operations.
  - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` endpoint to expose the functionality.
  - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` function to the context for consumption by components.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Add draggable attributes and event handlers.
  - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Add drop handlers to accept assets.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Refactor to support drop logic (optional, mainly handled in FolderItem).
- **Read-Only**:
  - `packages/studio/src/types.ts`: Verify `Asset` type (already confirmed).

## 3. Implementation Spec

### Backend: `discovery.ts`
- **Function**: `export function moveAsset(rootDir: string, sourceId: string, targetFolderId: string): AssetInfo`
- **Logic**:
  - Resolve `sourcePath` from `sourceId`.
  - Resolve `targetDirPath` from `targetFolderId`.
  - **Validation**:
    - Ensure both paths are within project root/public directory (security).
    - Ensure source exists.
    - Ensure target is a directory.
    - **Self-Move Check**: Ensure `targetDirPath` does not start with `sourcePath` (prevent moving a folder into itself).
    - **Collision Check**: Calculate `destPath = path.join(targetDirPath, path.basename(sourcePath))`. If `destPath` exists, throw error (or auto-rename? Error is safer for V1).
  - **Operation**: `fs.renameSync(sourcePath, destPath)`.
  - **Return**: New `AssetInfo` object for the moved asset.

### API: `plugin.ts`
- **Endpoint**: `POST /api/assets/move`
- **Body**: `{ sourceId: string, targetFolderId: string }`
- **Handler**: Calls `moveAsset` and returns the new asset info or error.

### Frontend: `StudioContext.tsx`
- **Function**: `moveAsset: (sourceId: string, targetFolderId: string) => Promise<void>`
- **Logic**:
  - Call API.
  - On success, call `fetchAssets()` to refresh the list.
  - Handle errors with `addToast`.

### UI: `AssetItem.tsx`
- **Props**: `draggable={true}`
- **Handler**: `onDragStart(e)`:
  - `e.dataTransfer.setData('application/helios-asset-id', asset.id)`
  - Set drag image/effect.

### UI: `FolderItem.tsx`
- **Handler**: `onDragOver(e)`:
  - `e.preventDefault()`
  - Set `isDragOver` state for visual feedback.
- **Handler**: `onDrop(e)`:
  - `e.preventDefault()`
  - Check `e.dataTransfer.getData('application/helios-asset-id')`.
  - If present, call `moveAsset(sourceId, asset.id)`.
  - Else, call existing `onDrop` (for external file upload).

## 4. Test Plan
- **Verification**:
  - **Manual UI Test**:
    1. Run `npx helios studio`.
    2. Upload a file `test.png`.
    3. Create a folder `images`.
    4. Drag `test.png` onto `images`.
    5. Verify `test.png` disappears from root and appears inside `images`.
    6. Verify filesystem reflects the change.
    7. Try dragging `images` into itself (should fail or be prevented).
  - **Automated Backend Verification**:
    - Create a temporary script `scripts/verify-move.ts` that mocks the server/fs calls (or integration test) to ensure `moveAsset` throws correctly on invalid moves.

- **Success Criteria**:
  - Assets can be moved into folders via drag-and-drop.
  - UI updates correctly after move.
  - Invalid moves (collision, self-move) are handled gracefully (error toast).
