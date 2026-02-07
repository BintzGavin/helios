# 1. Context & Goal
- **Objective**: Implement folder grouping in the Studio Assets Panel to organize assets by their directory structure.
- **Trigger**: The current Assets Panel displays a flat list of all assets, creating a gap in the "Manage assets" vision as projects scale.
- **Impact**: Improves asset manageability by visually grouping files based on their directory paths, resolving ambiguity between files with the same name in different folders.

# 2. File Inventory
- **Create**: None.
- **Modify**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`: Implement grouping logic and rendering.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.css`: Update layout styles for grouping.
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx`: Update mock data and add grouping tests.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx`: Reference Asset interface.

# 3. Implementation Spec
- **Architecture**:
  - The `AssetsPanel` component will post-process `filteredAssets` (which filters by search and type) to group them by directory path (derived from `relativePath`).
  - Rendering will change from a flat flex grid to a vertical list of groups, where each group contains a flex grid of assets.

- **Pseudo-Code**:
  ```typescript
  // In AssetsPanel.tsx
  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {};
    filteredAssets.forEach(asset => {
      // Extract directory from relativePath (e.g. "images/logo.png" -> "images")
      const parts = asset.relativePath.split('/');
      const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';

      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(asset);
    });
    return groups;
  }, [filteredAssets]);

  const sortedGroups = Object.keys(groupedAssets).sort();

  // Rendering
  sortedGroups.map(dir => (
      <div key={dir} className="assets-group">
          <div className="assets-group-header">{dir}</div>
          <div className="assets-group-items">
              {groupedAssets[dir].map((asset) => (
                  <AssetItem key={asset.id} asset={asset} />
              ))}
          </div>
      </div>
  ))
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

# 4. Test Plan
- **Verification**:
  - Run `npm test -w packages/studio` to ensure grouping tests pass (update tests in `packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx` to include `relativePath` and check for headers).
  - Start Studio (`npx helios studio`) and manually verify:
    - Assets in root show under `/`.
    - Assets in subfolders show under their folder name (e.g., `images`).
    - Drag and drop still works (drop anywhere).
    - Filtering/Search still works and preserves grouping structure (e.g. searching "logo" shows "images" header with logo inside).

- **Success Criteria**:
  - Assets are visually separated by folder.
  - Folder headers are displayed correctly.
  - No regression in existing features (upload, delete, rename).

- **Edge Cases**:
  - No assets (empty state).
  - All assets in root.
  - Assets with deep nesting (e.g., `a/b/c/d.png`). The group header should show `a/b/c`.
