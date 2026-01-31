# Context & Goal
- **Objective**: Restrict the Studio Assets Panel to prioritize the project's `public` directory (aligning with vision) and display relative paths to resolve name collisions.
- **Trigger**: `README.md` states "Assets Panel - Preview and manage assets from your project's public folder", but current implementation scans the entire project root, causing clutter and potential performance issues. Duplicate filenames in different folders are also indistinguishable.
- **Impact**: Improves Studio performance, reduces clutter, aligns with the documented vision, and fixes UX issues with duplicate filenames.

# File Inventory
- **Modify**: `packages/studio/src/server/discovery.ts` (Update `findAssets` logic and `AssetInfo` type)
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update `Asset` type)
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Display `relativePath` in tooltip)
- **Read-Only**: `packages/studio/src/server/discovery.test.ts` (Update unit tests)

# Implementation Spec
- **Architecture**:
  - `findAssets` will prioritize the `public` directory. If it exists, it scans ONLY that directory. If not, it falls back to the project root (legacy behavior).
  - `AssetInfo` and `Asset` interfaces will include a `relativePath` field.
  - The `url` generation will be context-aware:
    - If scanning `public`: Use `/${relativePath}` (Vite standard serving).
    - If scanning root: Use `/@fs${fullPath}` (Vite file system serving).
  - `relativePath` will be normalized to use forward slashes.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/server/discovery.ts
  export interface AssetInfo {
    // ... existing fields
    relativePath: string;
  }

  export function findAssets(rootDir: string): AssetInfo[] {
    const projectRoot = getProjectRoot(rootDir);
    const publicDir = path.join(projectRoot, 'public');
    const hasPublic = fs.existsSync(publicDir);
    const scanRoot = hasPublic ? publicDir : projectRoot;

    // ... scan recursively ...
    // relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/');
    // url = hasPublic ? `/${relativePath}` : `/@fs${fullPath}`;
    // ...
  }
  ```

- **Public API Changes**:
  - `AssetInfo` in `discovery.ts` adds `relativePath`.
  - `/api/assets` response objects will include `relativePath`.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm test` in `packages/studio` to ensure `discovery.test.ts` passes with new logic.
  - Inspect `discovery.ts` via unit tests to confirm:
    - Prioritization of `public` folder.
    - Correct `url` format (no `/@fs` prefix for public assets).
    - `relativePath` calculation and normalization.
- **Success Criteria**:
  - `findAssets` prioritizes `public` folder.
  - `url` is correctly formatted for `public` assets.
  - `relativePath` is correctly calculated.
- **Edge Cases**:
  - `public` folder does not exist (fallback to root).
  - Nested folders in `public`.
  - Windows path separators.
