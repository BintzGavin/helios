# 2026-02-18-STUDIO-Implement-Asset-Renaming.md

## 1. Context & Goal
- **Objective**: Implement the ability to rename assets directly within the Studio Assets Panel.
- **Trigger**: The "Vision" for the Assets Panel includes "manage assets", but currently only "Upload" and "Delete" are supported. Users cannot rename assets after uploading without leaving the Studio.
- **Impact**: Completes the CRUD "Update" capability for asset management, improving the "Manage" aspect of the Assets Panel vision and Agent Experience (AX).

## 2. File Inventory
- **Modify**: `packages/studio/src/server/discovery.ts` (Add `renameAsset` logic)
- **Modify**: `packages/studio/vite-plugin-studio-api.ts` (Add `PATCH /api/assets` endpoint)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `renameAsset` function)
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Add rename UI - edit mode)
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`

## 3. Implementation Spec
- **Architecture**:
    - **Backend**: New `renameAsset(rootDir, id, newName)` function in `discovery.ts` that uses `fs.renameSync`. It validates that the new path is within the project root and doesn't overwrite existing files.
    - **API**: `PATCH /api/assets` accepts JSON `{ id, newName }`.
    - **Frontend**:
        - `StudioContext`: Exposes `renameAsset(id, newName)` which calls the API and then triggers `fetchAssets()`.
        - `AssetItem`: Adds a "Rename" button (pencil icon) that toggles the name display into an input field. On blur/enter, it calls `renameAsset`.

- **Pseudo-Code**:
    - **discovery.ts**:
      ```typescript
      export function renameAsset(rootDir: string, id: string, newName: string) {
        // 1. Resolve project root
        // 2. Resolve source path (id) -> check exists & inside root
        // 3. Resolve target path (dirname(id) + newName) -> check NOT exists & inside root
        // 4. fs.renameSync(source, target)
        // 5. Return success / new asset info
      }
      ```
    - **vite-plugin-studio-api.ts**:
      ```typescript
      // Inside /api/assets middleware
      if (req.method === 'PATCH') {
         // Parse body: { id, newName }
         // Call renameAsset()
         // Return success
      }
      ```
    - **AssetItem.tsx**:
      ```typescript
      const [isEditing, setIsEditing] = useState(false);
      const [editName, setEditName] = useState(asset.name);

      const handleRename = async () => {
         if (!editName || editName === asset.name) {
             setIsEditing(false);
             return;
         }
         try {
             await renameAsset(asset.id, editName);
             setIsEditing(false);
         } catch (e) {
             alert(e.message);
         }
      }

      // Render:
      // If isEditing: <input autoFocus onBlur={handleRename} onKeyDown={Enter=>handleRename} />
      // Else: <span>{asset.name}</span> <button onClick={setIsEditing(true)}>✏️</button>
      ```

- **Public API Changes**:
    - `StudioContext` interface adds `renameAsset: (id: string, newName: string) => Promise<void>`.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Start Studio: `npm run dev` in `packages/studio`.
    2.  Upload a dummy file (e.g., `test-rename.txt`) to Assets Panel.
    3.  Click "Rename" (pencil icon) on the asset.
    4.  Change name to `renamed-asset.txt` and press Enter.
    5.  Verify the name updates in the UI.
    6.  Verify the file is renamed on disk in `public/` (check via terminal).
- **Success Criteria**: Asset is renamed on disk and UI reflects change without refresh.
- **Edge Cases**:
    - Renaming to an existing filename (should show error).
    - Renaming with invalid characters (backend should sanitize or reject).
    - Renaming outside project root (security check).
