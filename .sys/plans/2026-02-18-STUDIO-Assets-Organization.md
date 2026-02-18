# Context & Goal
- **Objective**: Implement explicit folder creation and asset moving capabilities in the Studio Assets Panel.
- **Trigger**: The "Manage assets" vision is currently limited to upload/delete/rename (in-place). Users cannot organize assets into folders or move them, making project management difficult for larger projects.
- **Impact**: Unlocks true asset management, allowing users to organize large projects directly from the Studio UI, bridging a significant gap in the "Manage Assets" vision.

# File Inventory
- **Create**: None.
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Update `findAssets` to include `.helioskeep` files and add `createFolder` and `moveAsset` functions.
    - `packages/studio/src/server/plugin.ts`: Add API endpoints `POST /api/assets/folder` and `POST /api/assets/move`.
    - `packages/studio/src/context/StudioContext.tsx`: Add `createAssetFolder` and `moveAsset` methods to context.
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Add "New Folder" button and implement drag-and-drop handler for moving assets.
    - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Verify/Ensure drop handling logic.
- **Read-Only**:
    - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`

# Implementation Spec
- **Architecture**:
    - **Backend**:
        - Use `.helioskeep` file as a marker for empty folders to ensure they are discovered by `findAssets`.
        - Update `findAssets` to include `.helioskeep` files (type: `hidden` or `other`).
        - Implement `moveAsset` using `fs.rename`, ensuring cross-directory moves are supported (unlike current `renameAsset` which is same-directory).
    - **Frontend**:
        - `AssetsPanel` will filter out `.helioskeep` from the file list display but use them to infer folder existence in the folder tree.
        - `AssetItem` drag start already sets `application/helios-asset`. `AssetsPanel` drop handler will detect this MIME type and call `moveAsset`.
        - Add a "New Folder" button (using `window.prompt` for MVP folder naming).

- **Public API Changes**:
    - `POST /api/assets/folder`: Body `{ path: string }`
    - `POST /api/assets/move`: Body `{ id: string, destPath: string }`
    - `StudioContext`: `createAssetFolder(name: string, path: string)`, `moveAsset(id: string, destPath: string)`

- **Dependencies**: None.

# Test Plan
- **Verification**:
    - Run `npx helios studio`.
    - Click "New Folder", enter name "images".
    - Verify "images" folder appears in the list.
    - Drag an existing asset (e.g., `logo.png`) onto the "images" folder.
    - Verify `logo.png` disappears from root and appears inside "images".
    - Refresh the page to verify persistence.
    - Check `.helioskeep` existence via `ls` in terminal.

- **Success Criteria**:
    - Users can create a new empty folder.
    - Users can move assets into folders.
    - Folder structure persists across reloads.
