# P0: Asset Folder Navigation

## 1. Context & Goal
- **Objective**: Implement folder-based navigation and organization in the Studio Assets Panel.
- **Trigger**: Vision gap - The current Assets Panel renders a flat list, making it difficult to manage large asset libraries ("Manage assets" vision).
- **Impact**: Improves scalability and organization of assets, allowing users to navigate directories and upload files to specific locations.

## 2. File Inventory
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Implement navigation logic, virtual folder derivation)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `uploadAsset` to accept target directory)
- **Modify**: `packages/studio/src/server/plugin.ts` (Update upload endpoint to handle `x-directory` header and create directories)
- **Create**: `packages/studio/src/components/AssetsPanel/FolderItem.tsx` (UI component for folder icons)
- **Create**: `packages/studio/src/components/AssetsPanel/AssetBreadcrumbs.tsx` (UI component for navigation path)

## 3. Implementation Spec
- **Architecture**:
    - **Frontend**: The `AssetsPanel` will maintain a `currentPath` state. It will derive the view by processing the `relativePath` of all assets.
        - Assets are grouped: if `relativePath` starts with `currentPath`, the next segment determines if it's a file in current view or a subfolder.
        - Filtering (Search/Type) will filter the underlying assets, and folders will only be shown if they contain matching assets.
    - **Backend**: The `upload` endpoint will be enhanced to respect a target directory, allowing uploads into the currently viewed folder.
- **Pseudo-Code**:
    - `AssetsPanel.tsx`:
        - `const [currentPath, setCurrentPath] = useState('')`
        - Function `getFolderContent(assets, path)`:
            - Filter assets where `asset.relativePath` starts with `path`.
            - Map to `files` (immediate children) and `folders` (unique next path segments).
        - Render `AssetBreadcrumbs` passing `currentPath` and `onNavigate`.
        - Render `FolderItem`s (double click or click -> `setCurrentPath`).
        - Render `AssetItem`s.
        - Update `handleUpload` to pass `currentPath` to `uploadAsset`.
    - `StudioContext.tsx`:
        - Update `uploadAsset(file, directory)` signature.
        - Send `x-directory` header in fetch.
    - `plugin.ts`:
        - Read `x-directory` header.
        - Sanitize and append to root.
        - `fs.mkdirSync(targetDir, { recursive: true })` before writing.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Start Studio: `npx helios studio`.
    2.  Manually create a folder `public/test-folder` and add an image `test.png` inside it (OS level).
    3.  Refresh Studio. Verify `AssetsPanel` shows `test-folder`.
    4.  Click `test-folder`. Verify it enters and shows `test.png`.
    5.  Check Breadcrumbs update.
    6.  Click "Upload" while in `test-folder`. Upload `new.png`.
    7.  Verify `new.png` appears in the list and exists in `public/test-folder/` on disk.
    8.  Navigate back to root using Breadcrumbs.
- **Success Criteria**:
    - Folder structure is correctly visualized.
    - Navigation works (in/out).
    - Uploads respect the current folder.
    - Empty folders (if supported by implicit logic) or populated folders show up.
