# 2026-02-18-STUDIO-Asset-Move

## 1. Context & Goal
- **Objective**: Implement the ability to move assets between folders in the Studio Assets Panel using Drag & Drop.
- **Trigger**: Vision gap in "Manage Assets" and specific blocker identified in `v0.112.0` (lack of move capability in backend).
- **Impact**: Enables users to organize their project assets, fulfilling the "Asset Management" vision.

## 2. File Inventory
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Add `moveAsset` function.
    - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` to context.
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Update `handleDrop` to support internal asset moving.
    - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Ensure `onDrop` propagates `folderName`.
- **Create**:
    - `packages/studio/src/server/discovery-move.test.ts`: Test file for the new backend logic.

## 3. Implementation Spec
- **Architecture**:
    - **Backend**: New `moveAsset` function in `discovery.ts` using `fs.renameSync` with path validation to prevent traversal.
    - **API**: New `POST /api/assets/move` endpoint accepting `{ id, destPath }`.
    - **Frontend**: Update `StudioContext` to consume the API. Update `AssetsPanel` to handle `application/helios-asset` drop events, calculating the target path based on the drop target (folder or current view).

- **Pseudo-Code (AssetsPanel.tsx handleDrop)**:
  ```typescript
  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Handle Internal Asset Move
    const assetData = e.dataTransfer.getData('application/helios-asset');
    if (assetData) {
        const asset = JSON.parse(assetData);
        // Calculate destination directory
        const destDir = targetFolder
            ? (currentPath ? `${currentPath}/${targetFolder}` : targetFolder)
            : currentPath;

        // Calculate full destination path (dir + filename)
        // If destDir is empty (root), just filename
        const destPath = destDir ? `${destDir}/${asset.name}` : asset.name;

        // Only move if destination is different from source relative path
        if (asset.relativePath !== destPath) {
             try {
                await moveAsset(asset.id, destPath);
             } catch (err) {
                // handle error
             }
        }
        return;
    }

    // 2. Handle External File Upload (Existing)
    // ...
  }
  ```

- **Public API Changes**:
    - **Backend (`discovery.ts`)**: `export function moveAsset(rootDir: string, id: string, destPath: string): AssetInfo`
    - **API (`plugin.ts`)**: `POST /api/assets/move` endpoint. Body: `{ id: string, destPath: string }`
    - **Frontend (`StudioContext.tsx`)**: `moveAsset(id: string, destPath: string): Promise<void>`

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Create verification script `scripts/verify-move-asset.ts` (or rely on `npm test` for backend logic).
    2.  Run `npx vitest run packages/studio/src/server/discovery-move.test.ts` to verify backend logic (creation, moving, security checks).
    3.  (Manual) Start Studio (`npm run dev`), drag a file from the root into a subfolder, and verify it moves and the list updates.
- **Success Criteria**:
    - `discovery-move.test.ts` passes.
    - `moveAsset` successfully moves the file on disk.
    - Frontend refreshes asset list after move.
- **Edge Cases**:
    - Moving a file to a location where it already exists (should throw error).
    - Moving a file outside project root (security check).
    - Moving a folder (recursive move).
