# Context & Goal
- **Objective**: Implement search and filtering capabilities in the Assets Panel to improve asset management.
- **Trigger**: The addition of new asset types (model, json, shader) in v0.56.0 has increased the variety of files, making a simple list difficult to navigate.
- **Impact**: Improves the "Manage" aspect of the "Preview and manage assets" vision, allowing users to quickly find specific assets by name or type.

# File Inventory
- **Create**: `packages/studio/src/components/AssetsPanel/AssetsPanel.css`
  - Will contain styles for the new toolbar and existing layout (migrating from inline styles).
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`
  - Import new CSS.
  - Add state for `searchQuery` and `filterType`.
  - Add toolbar UI (Search Input, Filter Dropdown/Tabs).
  - Implement filtering logic.
- **Read-Only**: `packages/studio/src/context/StudioContext.tsx` (for `Asset` type definition).

# Implementation Spec
- **Architecture**:
  - **State**: Local React state for `searchQuery` (string) and `filterType` (enum string).
  - **UI**: A toolbar at the top of the panel (below the upload button) containing:
    - Text input for search.
    - Select dropdown or filter chips for Asset Type.
  - **Logic**:
    - Filter `assets` array based on:
      - `name` includes `searchQuery` (case-insensitive).
      - `type` matches `filterType` (unless `filterType` is 'all').

- **Pseudo-Code**:
  ```typescript
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<Asset['type'] | 'all'>('all');

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="assets-panel">
      {/* Upload Area */}

      {/* Toolbar */}
      <div className="assets-toolbar">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="font">Fonts</option>
          <option value="model">Models</option>
          <option value="json">JSON</option>
          <option value="shader">Shaders</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* List */}
      <div className="assets-list">
        {filteredAssets.map(...)}
      </div>
    </div>
  )
  ```

- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Upload various asset types (image, video, json).
  3. Type in the search box -> verify list updates.
  4. Select a filter type -> verify list updates.
  5. Drag and drop file -> verify it still uploads and appears (if it matches filter).
- **Success Criteria**:
  - Search filters by name correctly.
  - Dropdown filters by type correctly.
  - "All" shows everything.
  - Layout is clean and usable.
- **Edge Cases**:
  - Filter by type X when no assets of type X exist (should show empty message).
  - Search for string that matches no assets.
  - Verify drag-and-drop overlay still covers the whole panel including toolbar.
