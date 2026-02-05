# 2026-02-18-STUDIO-Asset-Folders.md

#### 1. Context & Goal
- **Objective**: Implement a folder-based Tree View for the Assets Panel in Studio, replacing the current flat list.
- **Trigger**: Vision gap in "Manage Assets" - current flat list is unmanageable for large projects.
- **Impact**: Improves asset organization and alignment with `CompositionsPanel` UX.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AssetsPanel/AssetTree.tsx`: New component for rendering asset tree.
  - `packages/studio/src/components/AssetsPanel/AssetTree.css`: Styles for the asset tree.
- **Modify**:
  - `packages/studio/src/utils/tree.ts`: Refactor to be generic `buildTree<T>`.
  - `packages/studio/src/utils/tree.test.ts`: Update tests for generic implementation.
  - `packages/studio/src/components/CompositionsPanel/CompositionsPanel.tsx`: Update to use generic `buildTree`.
  - `packages/studio/src/components/CompositionsPanel/CompositionTree.tsx`: Update types.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Replace flat list with `AssetTree`.
  - `packages/studio/src/server/plugin.ts`: Update `/api/assets/upload` to support `x-folder` header.
  - `packages/studio/src/context/StudioContext.tsx`: Update `uploadAsset` to accept `folder` param.
- **Read-Only**:
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - Refactor `tree.ts` to `buildTree<T>(items: {id: string, data: T}[])`.
  - Frontend uses `AssetTree` (recursive folder rendering).
  - Backend `/api/assets/upload` accepts `x-folder` header to target subdirectories.
  - DnD logic in `AssetTree` folders calls `uploadAsset(files, folderPath)`.
- **Pseudo-Code**:
  ```typescript
  // tree.ts
  export function buildTree<T>(items: TreeItem<T>[]) { ... }

  // AssetTree.tsx
  const AssetFolder = ({ node, onUpload }) => {
     onDrop = (e) => onUpload(e.files, node.id);
  }

  // server/plugin.ts
  if (req.headers['x-folder']) {
     targetDir = path.join(publicDir, req.headers['x-folder']);
     fs.mkdirSync(targetDir, { recursive: true });
  }
  ```
- **Public API Changes**:
  - `StudioContext.uploadAsset(file: File, folder?: string)` signature change.
  - `/api/assets/upload` supports `x-folder` header.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:studio` to verify TS compilation.
  - Run `npx vitest run packages/studio/src/utils/tree.test.ts` to verify generic tree logic.
  - Run `npx vitest run packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` (update mocks if needed).
- **Success Criteria**:
  - `tree.test.ts` passes.
  - Assets Panel renders without errors (in verification script or manual check).
- **Edge Cases**:
  - Uploading to non-existent folder (backend should create it).
  - Traversal attacks in `x-folder` (backend should sanitize).
