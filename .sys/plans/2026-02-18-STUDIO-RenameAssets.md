# STUDIO: Asset Renaming

## 1. Context & Goal
- **Objective**: Implement the ability to rename assets (files in the project's public directory) directly from the Studio Assets Panel.
- **Trigger**: The "Manage assets" vision in `README.md` requires full CRUD capabilities. Currently, Studio supports Create (Upload) and Delete, but lacks Update (Rename).
- **Impact**: This achieves feature parity with standard file explorers and improves the asset management workflow within Studio, reducing the need for users to switch to their OS file manager.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/RenameAssetModal.tsx`: A new modal component for renaming assets.
  - `packages/studio/src/components/RenameAssetModal.css`: Styles for the renaming modal.
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add backend logic to rename files securely.
  - `packages/studio/vite-plugin-studio-api.ts`: Add `PATCH /api/assets` endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `renameAsset` method and state for the modal.
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: Add a rename button/icon to trigger the modal.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Render the `RenameAssetModal`.
- **Read-Only**:
  - `packages/studio/src/server/discovery.test.ts`: Reference for existing file operation tests.

## 3. Implementation Spec
### Architecture
- **Backend (Node.js)**:
  - The `discovery.ts` module will expose a `renameAsset(rootDir, id, newName)` function.
  - It uses `fs.renameSync` after validating that the source exists, the target does NOT exist, and both paths are within the project root (security).
  - It returns the new `AssetInfo` object.
- **API (Vite Plugin)**:
  - The `vite-plugin-studio-api.ts` will handle `PATCH /api/assets`.
  - Accepts JSON body: `{ id: string, name: string }`.
  - Calls `renameAsset` and returns the result.
- **Frontend (React)**:
  - `StudioContext` manages the `isRenameAssetOpen` state and the `assetToRename` object.
  - `renameAsset(id, newName)` method in context calls the API and refreshes the asset list (`fetchAssets`).
  - `AssetItem` adds a "Pencil" icon (or "Rename" text) visible on hover (next to Delete). Clicking it sets `assetToRename` and opens the modal.
  - `RenameAssetModal` handles the user input, validation (non-empty), and calls `renameAsset`.

### Pseudo-Code
**packages/studio/src/server/discovery.ts**
```typescript
export function renameAsset(rootDir: string, id: string, newName: string): AssetInfo {
  // Resolve project root
  // Resolve source path (id)
  // Security Check: source must be in root

  // Construct target path (join root/public with newName)
  // Security Check: target must be in root

  // Check if target exists -> Throw Error

  // fs.renameSync(source, target)

  // Construct and return new AssetInfo
}
```

**packages/studio/vite-plugin-studio-api.ts**
```typescript
// Inside middleware config
if (req.method === 'PATCH') {
  const body = await getBody(req);
  const { id, name } = body;
  try {
    const asset = renameAsset(process.cwd(), id, name);
    res.end(JSON.stringify(asset));
  } catch (e) {
    res.statusCode = 500; // or 400/403 based on error
    res.end(JSON.stringify({ error: e.message }));
  }
}
```

## 4. Test Plan
### Verification
1. **Start Studio**: Run `npx helios studio` (or `npm run dev` in studio package).
2. **Prepare Asset**: Upload a file named `original.png`.
3. **Trigger Rename**: Hover over `original.png` in Assets Panel, click the new "Rename" icon.
4. **Input**: In the modal, enter `renamed.png`. Click "Rename".
5. **Verify UI**: The asset item should now display `renamed.png`.
6. **Verify FS**: Check the file system to ensure `original.png` is gone and `renamed.png` exists.
7. **Verify Persistence**: Refresh the browser. The asset should still be `renamed.png`.

### Edge Cases
- **Duplicate Name**: Try renaming `A.png` to `B.png` where `B.png` already exists. API should return error, Modal should show error message.
- **Invalid Characters**: Try renaming to `../outside.png`. Backend should block it.
- **Empty Name**: Modal should disable submit button.
- **Extension Change**: Renaming `test.png` to `test.txt`. Allowed by FS, but might change how Studio treats it (asset type). This is acceptable behavior.
