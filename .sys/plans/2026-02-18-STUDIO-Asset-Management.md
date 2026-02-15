# 2026-02-18-STUDIO-Asset-Management

## 1. Context & Goal
- **Objective**: Implement folder creation and asset movement in the Assets Panel.
- **Trigger**: "Asset Management - Folders" is a critical gap identified in learnings `[0.109.0]`. The current implicit folder structure prevents empty folder creation and reorganization.
- **Impact**: Enables users to organize their assets effectively, a standard expectation for a file manager.

## 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Update `findAssets` to include `.helioskeep` files as `type: 'folder'`. Add `createFolder(path)` and `moveAsset(sourceId, targetPath)`.
  - `packages/studio/src/server/plugin.ts`: Add API endpoints `POST /api/assets/folder` and `POST /api/assets/move`.
  - `packages/studio/src/context/StudioContext.tsx`: Add `createFolder` and `moveAsset` methods to context and `Asset` interface update.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Add "New Folder" button, filter `.helioskeep` from file view, and implement Drag & Drop logic for moving assets.
  - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Ensure it accepts `application/x-helios-asset-id` drops.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Make items draggable with `application/x-helios-asset-id`.
- **Read-Only**:
  - `packages/studio/src/server/types.ts`

## 3. Implementation Spec
- **Architecture**:
  - **Implicit Folders**: Continue using `findAssets` implicit folder discovery but enhance it by treating `.helioskeep` files as "folder anchors".
  - **Persisted Folders**: `createFolder` writes a `.helioskeep` file. `findAssets` returns it as `type: 'folder'`.
  - **Frontend Handling**: `AssetsPanel` infers folders from file paths (as it does now). The presence of `.helioskeep` ensures the folder path exists in the file list, so the folder appears in the UI. We filter out the actual `.helioskeep` file entry to keep the view clean.
  - **Move Logic**: `moveAsset` backend function uses `fs.rename`. Frontend uses Drag & Drop API with a custom MIME type `application/x-helios-asset-id`.

- **Pseudo-Code**:
  - **Backend (`discovery.ts`)**:
    - `findAssets`: If file is `.helioskeep`, add to list with `type: 'folder'`.
    - `createFolder(path)`: Write `.helioskeep` at `path`.
    - `moveAsset(sourceId, targetPath)`: `fs.rename(sourceId, targetPath)`.
  - **Frontend (`AssetsPanel`)**:
    - `handleDrop`: Check `e.dataTransfer.types`. If `x-helios-asset-id`, call `moveAsset`. Else if `Files`, call `uploadAsset`.
    - `content.files`: Filter out `asset.name === '.helioskeep'`.
    - `New Folder`: Prompt for name -> `createFolder(currentPath + '/' + name)`.

- **Public API Changes**:
  - `POST /api/assets/folder`: Body `{ path: string }`.
  - `POST /api/assets/move`: Body `{ sourceId: string, targetPath: string }`.
  - `StudioContext`: `createFolder(path: string): Promise<void>`, `moveAsset(sourceId: string, targetPath: string): Promise<void>`.

## 4. Test Plan
- **Verification**:
  1.  `npx helios studio` (after build).
  2.  Go to Assets Panel.
  3.  Click "New Folder", enter "TestFolder". Verify folder appears.
  4.  Verify `.helioskeep` is NOT visible as a file.
  5.  Drag an asset (e.g., `image.png`) into `TestFolder`.
  6.  Verify asset disappears from root and appears inside `TestFolder`.
  7.  Reload page to verify persistence.
- **Success Criteria**:
  - Folders can be created and persist.
  - Assets can be moved into folders.
  - `.helioskeep` files are hidden from the user.
