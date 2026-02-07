# STUDIO: Asset Folders Implementation

## 1. Context & Goal
- **Objective**: Implement folder support in the Studio Assets Panel to allow organizing assets into subdirectories.
- **Trigger**: Vision gap "Manage assets" (specifically organization) and journal entry identifying flat list as a scaling issue for larger projects.
- **Impact**: Enables users to structure large projects effectively by creating folders and uploading files into them, preventing UI clutter in the Assets Panel.

## 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Update `findAssets` to include directory entries.
  - `packages/studio/src/server/plugin.ts`: Add `/api/assets/folder` endpoint and update upload logic.
  - `packages/studio/src/context/StudioContext.tsx`: Update `Asset` type and add `createFolder` method.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Implement folder navigation and creation UI.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Add folder rendering support.
- **Read-Only**:
  - `packages/studio/src/server/mcp.ts` (for context on server setup)

## 3. Implementation Spec

### Architecture
- **Backend**:
  - `findAssets` currently skips directories. It will be updated to include directory entries with `type: 'folder'`.
  - New endpoint `POST /api/assets/folder` will wrap `fs.mkdirSync`.
  - existing `POST /api/assets/upload` will accept a `folder` query param to determine the target directory relative to the project root/public.
- **Frontend**:
  - `StudioContext` will expose `createFolder` and updated `uploadAsset` signatures.
  - `AssetsPanel` will maintain local state `currentPath` (string, default '').
  - `AssetsPanel` filtering logic will be updated to show items where `dirname(relativePath) === currentPath`.
  - `AssetItem` will render a folder icon when `type === 'folder'` and handle clicks to navigate down.
  - `AssetsPanel` will add "Up" navigation (if `currentPath !== ''`) and breadcrumbs.

### Public API Changes
- **Backend API**:
  - `POST /api/assets/folder`: Body `{ path: string }`. Returns success/error.
  - `POST /api/assets/upload`: Query param `?folder=path/to/folder` (optional).
- **StudioContext**:
  - `Asset` interface: `type` union updated to include `'folder'`.
  - `createFolder(name: string): Promise<void>` added.
  - `uploadAsset(file: File, folder?: string): Promise<void>` updated.

### Pseudo-Code

#### `packages/studio/src/server/discovery.ts`
```typescript
function findAssets(rootDir) {
  // ...
  if (entry.isDirectory()) {
    // Add folder asset
    assets.push({
      id: fullPath,
      name: entry.name,
      url: '', // Folders don't have a URL
      type: 'folder',
      relativePath: path.relative(scanRoot, fullPath)
    });
    // Recurse
  }
  // ...
}
```

#### `packages/studio/src/server/plugin.ts`
```typescript
// /api/assets/folder
if (req.method === 'POST') {
  const { path: folderPath } = body;
  // Security check: ensure inside project root
  fs.mkdirSync(fullPath);
}

// /api/assets/upload
const folder = req.query.folder || '';
// path.join(publicDir, folder, filename)
```

#### `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`
```typescript
const [currentPath, setCurrentPath] = useState('');

// Filter assets
const visibleAssets = assets.filter(a => {
  const assetDir = path.dirname(a.relativePath);
  // specific logic to match currentPath (handle root vs subdir)
  return assetDir === currentPath;
});

// Render
<Breadcrumbs path={currentPath} onNavigate={setCurrentPath} />
{visibleAssets.map(asset => (
  <AssetItem
    onClick={() => asset.type === 'folder' && setCurrentPath(asset.relativePath)}
  />
))}
```

## 4. Test Plan
- **Verification**:
  1. Start Studio: `npx helios studio`
  2. Create a folder named "images".
  3. Verify folder appears in list.
  4. Click folder to enter (list should be empty).
  5. Upload an image inside the folder.
  6. Verify image appears.
  7. Click "Up" or Breadcrumb to go back to root.
  8. Verify image is NOT visible in root.
  9. Verify folder "images" is visible in root.
  10. Check filesystem: `public/images/file.png` exists.
- **Success Criteria**:
  - Assets are correctly filtered by directory level.
  - Uploads respect the current directory context.
  - Folder creation works.
- **Edge Cases**:
  - Empty folders.
  - Nested folders (depth > 1).
  - Invalid folder names (backend validation).
