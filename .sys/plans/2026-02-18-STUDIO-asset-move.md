#### 1. Context & Goal
- **Objective**: Implement the ability to move assets (files and folders) into other folders within the Studio Assets Panel.
- **Trigger**: The current "Assets Panel" lacks organization capabilities; users can create folders but cannot move existing assets into them. This is a documented gap in `docs/status/STUDIO.md` and a core requirement for "Asset Management".
- **Impact**: Enables users to organize their project assets, fulfilling the "manage assets" vision.

#### 2. File Inventory
- **Create**: None.
- **Modify**:
    - `packages/studio/src/server/discovery.ts`: Add `moveAsset` function.
    - `packages/studio/src/server/plugin.ts`: Add `POST /api/assets/move` endpoint.
    - `packages/studio/src/context/StudioContext.tsx`: Add `moveAsset` to context.
    - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Handle drop of `application/helios-asset` to trigger move.
- **Read-Only**:
    - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`: (Verify `handleDragStart` implementation)
    - `packages/studio/src/components/AssetsPanel/FolderItem.tsx`: (Verify `onDrop` implementation)

#### 3. Implementation Spec
- **Architecture**:
    - **Backend**: Implement `moveAsset` in `discovery.ts` using `fs.renameSync` with security checks to ensure paths stay within the project/public root.
    - **API**: Create a `POST` route at `/api/assets/move` (or query param handler in `/api/assets` middleware) that accepts `{ id, dest }` and calls `moveAsset`.
    - **Frontend**: Update `StudioContext` to expose `moveAsset` which calls the API. Update `AssetsPanel` to handle dropping an `AssetItem` (identified by `application/helios-asset` data) onto a folder or the main panel, calculating the correct destination path relative to the project root.
- **Pseudo-Code**:
    - `discovery.ts`: `moveAsset(rootDir, id, destPath)` validates inputs, resolves full paths, checks existence, performs rename, and returns new `AssetInfo`.
    - `plugin.ts`: Middleware checks `req.url === '/move'` (or `/api/assets/move`), parses body, calls `moveAsset`.
    - `StudioContext.tsx`: `moveAsset` function fetches API and refreshes assets.
    - `AssetsPanel.tsx`: `handleDrop` checks `e.dataTransfer` for asset data. If present, calls `moveAsset` with `targetFolder` path.
- **Public API Changes**: New API endpoint `POST /api/assets/move`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
    1. Run `npm run build -w packages/studio`.
    2. Run `npx helios studio`.
    3. Create a test folder and upload a file.
    4. Drag the file into the folder.
    5. Verify the file moves in the UI and on disk.
- **Success Criteria**: Asset moves successfully without errors; UI updates immediately.
- **Edge Cases**: Moving file to same location (no-op), moving folder into itself (error), naming collision (error).
