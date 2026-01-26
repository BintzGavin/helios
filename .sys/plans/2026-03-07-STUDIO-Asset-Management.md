# Plan: Implement Asset Management

## 1. Context & Goal
- **Objective:** Enable users to upload and delete assets (images, video, audio) directly from the Studio UI.
- **Trigger:** Vision Gap "Preview and **manage** assets from your project's public folder" in `README.md`.
- **Impact:** Unlocks full asset management workflow within the Studio, reducing the need to switch to the file explorer.

## 2. File Inventory
- **Modify:** `packages/studio/vite-plugin-studio-api.ts` (Add API endpoints for Upload and Delete)
- **Modify:** `packages/studio/src/context/StudioContext.tsx` (Add `uploadAsset` and `deleteAsset` methods)
- **Modify:** `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Add Drag & Drop zone and Upload button)
- **Modify:** `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Add Delete button with hover effect)
- **Read-Only:** `packages/studio/src/server/discovery.ts` (Use for path validation logic if needed)

## 3. Implementation Spec

### Architecture
- **Backend (Vite Middleware):**
  - Uses `vite-plugin-studio-api.ts` to intercept requests.
  - **Upload:** `POST /api/assets/upload` receives raw binary body and `x-filename` header. Writes to `public/` folder (or project root if `public` missing).
  - **Delete:** `DELETE /api/assets` receives JSON `{ id: string }`. Validates that `id` is within project root, then deletes the file.
- **Frontend (React):**
  - **Context:** Exposes `uploadAsset(file)` and `deleteAsset(id)` which call the API and then trigger a refresh (`fetchAssets`).
  - **UI:** `AssetsPanel` handles `onDrop` events to trigger upload. `AssetItem` handles delete click.

### Pseudo-Code

#### `vite-plugin-studio-api.ts`
```typescript
// POST /api/assets/upload
const filename = req.headers['x-filename'];
// Sanitize filename (basename only)
const targetDir = path.join(process.cwd(), 'public');
// Ensure dir exists, fallback to cwd if not
const stream = fs.createWriteStream(targetPath);
req.pipe(stream);
// On finish -> 200 OK

// DELETE /api/assets
const { id } = body;
// Security: Check if id starts with process.cwd()
fs.unlink(id);
// On success -> 200 OK
```

#### `StudioContext.tsx`
```typescript
uploadAsset = async (file) => {
  await fetch('/api/assets/upload', {
    method: 'POST',
    headers: { 'x-filename': file.name },
    body: file // Body is the file blob
  });
  refreshAssets();
}

deleteAsset = async (id) => {
  await fetch('/api/assets', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  refreshAssets();
}
```

### Public API Changes
- New API Endpoints: `POST /api/assets/upload`, `DELETE /api/assets`
- New Context Methods: `uploadAsset`, `deleteAsset`

### Dependencies
- No new npm packages (using native `fs` and streams).

## 4. Test Plan
- **Verification:**
  1. Start Studio: `npx helios studio`.
  2. Drag and drop an image file (e.g., `test.png`) into the Assets Panel.
  3. Verify the file appears in the list.
  4. Check the file system to ensure `test.png` exists in `public/` (or root).
  5. Hover over the asset and click the Delete button.
  6. Verify the asset is removed from the list.
  7. Check the file system to ensure `test.png` is deleted.
- **Success Criteria:** Assets can be uploaded and deleted without errors; UI updates immediately.
- **Edge Cases:**
  - Uploading file with same name (should overwrite).
  - Deleting non-existent file (should handle gracefully).
  - Attempting to delete file outside project root (security check).
