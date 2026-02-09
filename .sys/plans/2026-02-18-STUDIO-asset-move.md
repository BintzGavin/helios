# 2026-02-18-STUDIO-asset-move.md

#### 1. Context & Goal
- **Objective**: Implement "Move Asset" functionality allowing users to reorganize assets via Drag & Drop into folders (and breadcrumbs).
- **Trigger**: Vision gap "Manage assets" - currently users can only upload/delete/rename, but cannot organize assets into folders after upload.
- **Impact**: Enables proper project organization. Updates `discovery.ts`, `plugin.ts`, and Studio UI.

#### 2. File Inventory
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add `moveAsset` function.
  - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` method.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Implement DnD logic (handle `onDrop` for folders and breadcrumbs), add `ConfirmationModal`.
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: (Passes drag event).
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: (Sets drag data).

#### 3. Implementation Spec
- **Architecture**:
  - **Backend**: `fs.rename` wrapper in `discovery.ts` that takes `id` (source path) and `destDirectory` (relative to root). Checks for naming conflicts. Ensures destination directory exists.
  - **API**: `POST /api/assets/move` with body `{ id, directory }`.
  - **Frontend**: HTML5 Drag & Drop. `AssetsPanel` listens for `application/helios-asset` drop events on `FolderItem` (move down) and Breadcrumbs (move up/across).
  - **Safety**: Triggers `ConfirmationModal` before moving, warning about broken paths (same as rename).
- **Pseudo-Code**:
  - `discovery.ts`: `moveAsset(rootDir, id, newDir)` -> Resolve paths, check bounds, `fs.mkdir(dest)`, `fs.rename(src, dest)`, return new AssetInfo.
  - `plugin.ts`: Add `POST /api/assets/move` endpoint calling `moveAsset`.
  - `StudioContext.tsx`: Add `moveAsset(id, destDir)` calling API.
  - `AssetsPanel.tsx`:
    - `handleAssetDrop(assetId, targetPath)`: set `moveTarget` state, open Modal.
    - `confirmMove()`: call `context.moveAsset(id, targetPath)`.
    - Handle `onDrop` from `FolderItem` to invoke `handleAssetDrop`.
    - Update Breadcrumbs to be drop targets calling `handleAssetDrop`.
- **Public API Changes**:
  - New Endpoint: `POST /api/assets/move`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm test packages/studio` to verify `discovery.ts` logic and `AssetsPanel` interactions.
  - Run `npx helios studio`.
  - Upload `test.png`.
  - Upload `folder/other.png` (to create folder).
  - Drag `test.png` into `folder/`.
  - Confirm modal.
  - Verify `test.png` is now inside `folder/` in UI and filesystem.
  - Drag `test.png` from `folder/` to "Home" breadcrumb.
  - Verify it moves back to root.
- **Success Criteria**: Assets move correctly, UI updates, errors (conflicts) are handled.
- **Edge Cases**: Moving to same folder (ignore), moving to folder with existing filename (show error/toast).
