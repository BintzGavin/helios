#### 1. Context & Goal
- **Objective**: Implement internal asset organization via Drag-and-Drop within the Assets Panel.
- **Trigger**: Vision gap identified in `.jules/STUDIO.md` (`[0.114.2] - Asset Drag-and-Drop Gap`): "AssetsPanel implementation supported uploading files via drag-and-drop but lacked the logic to handle internal Asset drag-and-drop for moving files, despite AssetItem being draggable."
- **Impact**: Enables users to easily move and organize assets into folders directly in the UI, fulfilling the full "Manage assets" vision constraint.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Update `handleDrop` to support internal asset moving)
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` (Add tests for moving an asset to a folder and moving an asset to the root)
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/FolderItem.tsx` (References `onDrop`)
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (References `application/helios-asset-id`)
  - `packages/studio/src/context/StudioContext.tsx` (References `moveAsset`)

#### 3. Implementation Spec
- **Architecture**:
  - The `AssetItem` component already sets `application/helios-asset-id` during `onDragStart`.
  - The `FolderItem` component already attempts to handle this with `moveAsset` when dropped on a specific folder.
  - The main `AssetsPanel`'s `handleDrop` (which catches drops on the background/root or breadcrumbs) currently *only* processes `e.dataTransfer.files` (external OS files) and ignores internal React drag events containing the asset ID.
  - Update `AssetsPanel.tsx`'s `handleDrop` to check for `application/helios-asset-id`. If it exists, call `moveAsset(assetId, uploadDir)` instead of attempting to upload OS files.
  - Update the breadcrumb navigation in `AssetsPanel.tsx` to accept `onDrop` events so users can drop assets into parent folders.
- **Public API Changes**: None
- **Pseudo-Code**:
  ```tsx
  // In packages/studio/src/components/AssetsPanel/AssetsPanel.tsx
  const handleDrop = async (e: React.DragEvent, targetFolder?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const uploadDir = targetFolder !== undefined ?
        (currentPath ? \`\${currentPath}/\${targetFolder}\` : targetFolder) :
        currentPath;

    // 1. Check for internal asset move
    const assetId = e.dataTransfer.getData('application/helios-asset-id');
    if (assetId) {
        try {
             await moveAsset(assetId, uploadDir || ''); // Pass empty string for root if uploadDir is empty
        } catch (err) {
            // Handled by toast in moveAsset (StudioContext)
        }
        return;
    }

    // 2. Handle external OS file upload
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       for (let i = 0; i < e.dataTransfer.files.length; i++) {
           await uploadAsset(e.dataTransfer.files[i], uploadDir);
       }
    }
  };
  ```
- **Dependencies**: None. `moveAsset` is already implemented in `discovery.ts` and exposed via `StudioContext`.

#### 4. Test Plan
- **Verification**: Run `npm run test packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` to verify logic.
- **Success Criteria**:
  - Internal asset IDs dropped on `AssetsPanel` trigger `moveAsset` with the correct destination folder (or `''` for root).
  - External OS files continue to trigger `uploadAsset`.
- **Edge Cases**:
  - Dropping an asset into the folder it already resides in (backend `moveAsset` might throw, handled by toast).
  - Dropping an asset onto the root breadcrumb to move it out of a subfolder.
