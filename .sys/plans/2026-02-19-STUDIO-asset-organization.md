# Context & Goal
- **Objective**: Implement **Asset Organization** features in Helios Studio, specifically the ability to create folders and move assets into them.
- **Trigger**: Vision gap - "Manage assets" is limited to upload/delete/rename; file organization is missing. Users cannot structure their asset library.
- **Impact**: Enables scalable asset management for larger projects. Unlocks better "Agent Experience" by allowing agents to structure generated assets logically.

## File Inventory
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add `moveAsset` and `createAssetFolder` functions; update `findAssets` to include `.helioskeep`.
  - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` and `POST /api/assets/folder` endpoints.
  - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` and `createFolder` to context and `Asset` type.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Add "New Folder" UI, filter `.helioskeep` from grid, and implement drag-to-move logic.
  - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Update drop handler to distinguish between file upload (File) and asset move (Asset ID).
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Ensure drag event carries `application/helios-asset` data type.
  - `packages/studio/src/server/discovery.test.ts`: Add unit tests for `moveAsset` and `createAssetFolder` verifying logic and security checks.

## Implementation Spec
### Architecture
- **Backend**:
  - `createAssetFolder(rootDir, path)`: Creates directory and a hidden `.helioskeep` file to ensure the folder persists and is discoverable by `findAssets`.
  - `moveAsset(rootDir, sourcePath, targetPath)`: Uses `fs.rename` to move files.
    - **Security**: Must validate that both `sourcePath` and `targetPath` resolve to paths within the `projectRoot` (or `publicDir`) to prevent directory traversal attacks.
  - `findAssets`: Updated to include `.helioskeep` files in the results so the frontend can infer folder existence.
- **Frontend**:
  - **Drag & Drop**: Use `application/helios-asset` MIME type in `dataTransfer` to identify internal moves vs external file uploads.
  - **Context**: Expose `moveAsset` and `createFolder` methods.
  - **UI**:
    - Add "New Folder" button in `AssetsPanel` header.
    - Filter out `.helioskeep` files from the asset grid view (visually hidden).
    - When dropping an asset on `FolderItem`, call `moveAsset`.

### Public API Changes
- **Backend API**:
  - `POST /api/assets/move`: Body `{ sourceId: string, destinationDir: string }` (destinationDir is relative to root).
  - `POST /api/assets/folder`: Body `{ directory: string, name: string }` (directory is relative parent path, name is new folder name).
- **StudioContext**:
  - `moveAsset(id: string, destinationDir: string): Promise<void>`
  - `createFolder(name: string): Promise<void>`

### Dependencies
- None.

## Test Plan
- **Verification**:
  1.  **Automated Tests**: Run `npx vitest run packages/studio/src/server/discovery.test.ts` to verify backend logic for `moveAsset` and `createAssetFolder`.
  2.  **Manual Verification**:
      - Run `npx helios studio`.
      - Click "New Folder", enter "Textures". Verify folder appears.
      - Verify `.helioskeep` is created in filesystem but HIDDEN in file grid.
      - Drag an image from root to "Textures" folder. Verify it disappears from root and appears in "Textures".
      - Verify file location in filesystem matches UI state.
- **Success Criteria**:
  - Folders can be created and persist on reload.
  - Assets can be moved into folders (via FolderItem).
- **Edge Cases**:
  - Moving a file to a folder where a file with the same name exists (should fail or prompt).
  - Creating a folder that already exists.
  - Moving a file to the same folder (no-op).
  - Moving a file outside the project root (security check).
