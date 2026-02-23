# Plan: Implement Asset Move Operation

#### 1. Context & Goal
- **Objective**: Implement the ability to move assets (files and folders) into other folders within the Studio Assets Panel using drag-and-drop.
- **Trigger**: The current "Asset Management" system supports uploading and deleting, but lacks organization capabilities (moving files), which is a critical gap for project scalability identified in previous learnings.
- **Impact**: Enables users to organize their project structure directly from the Studio UI, improving the developer experience and aligning with the "IDE" vision.

#### 2. File Inventory
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Add `moveAsset` backend function.
    - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` to context and provider.
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Implement drag-and-drop logic for moving assets.
    - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Ensure `draggable` attribute is set.
    - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: Ensure `onDrop` propagates correctly.

#### 3. Implementation Spec

**Backend (`discovery.ts`)**
- Implement `moveAsset(rootDir: string, sourceId: string, targetDir: string): AssetInfo`.
    - `sourceId`: Full path of the asset to move.
    - `targetDir`: Relative path (from project root) of the destination directory.
    - Logic:
        - Resolve `sourceId` and validate existence.
        - Resolve `targetDir` relative to project root/public.
        - Validate that both source and target are within the allowed scope (security check).
        - Construct destination path: `path.join(resolvedTargetDir, path.basename(sourceId))`.
        - Check for existence at destination (prevent overwrite).
        - Use `fs.renameSync` to move the file/directory.
        - Return the new `AssetInfo`.

**API (`plugin.ts`)**
- Add `POST /api/assets/move` route.
    - Payload: `{ sourceId: string, targetDir: string }`.
    - Validation: Ensure both fields exist.
    - Logic: Call `moveAsset` and return JSON result or error.

**Frontend Context (`StudioContext.tsx`)**
- Update `StudioContextType` with `moveAsset: (sourceId: string, targetDir: string) => Promise<void>`.
- Implement `moveAsset` in `StudioProvider`:
    - `fetch('/api/assets/move', { method: 'POST', body: ... })`.
    - On success: `fetchAssets()` and show success toast.
    - On error: Show error toast.

**Frontend UI (`AssetsPanel.tsx`)**
- Update `handleDrop` function:
    - Check for internal asset drop: `const internalAsset = e.dataTransfer.getData('application/helios-asset')`.
    - If present:
        - Parse JSON.
        - Prevent moving into self (if folder).
        - Call `moveAsset(asset.id, targetFolder || currentPath)`.
    - Else (external files):
        - Maintain existing upload logic.
- Update `FolderItem`:
    - Ensure `onDrop` is wired correctly to parent `handleDrop`.
- Update Breadcrumbs:
    - Make breadcrumbs drop targets to allow moving files "up" the tree.
    - Implement `onDragOver` and `onDrop` on breadcrumb items.

#### 4. Test Plan
- **Verification**:
    1.  Run `npx helios studio`.
    2.  Create a folder named "TestFolder".
    3.  Upload an image file "image.png" to the root.
    4.  Drag "image.png" onto "TestFolder".
    5.  Verify "image.png" disappears from root list and appears inside "TestFolder".
    6.  Check filesystem to confirm the move.
    7.  Drag "image.png" from "TestFolder" onto the "Home" breadcrumb.
    8.  Verify it returns to root.
- **Success Criteria**:
    - File moves successfully in filesystem and UI.
    - Moving a folder into another folder works recursively.
    - Moving a file to a location where it exists shows an error toast.
    - Moving a folder into itself shows an error toast.
