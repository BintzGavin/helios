#### 1. Context & Goal
- **Objective**: Extend the Studio Assets Panel to support discovering and displaying 3D models (`.glb`, `.gltf`), data files (`.json`), and shaders (`.glsl`, `.vert`, `.frag`).
- **Trigger**: The current asset discovery logic (`discovery.ts`) actively filters out these file types, treating them as "other" and excluding them from the Assets Panel, which hinders development of advanced 3D/Canvas compositions.
- **Impact**: Unlocks the ability for users to manage and preview essential assets for Creative Coding (Three.js, WebGL) directly within the Studio interface.

#### 2. File Inventory
- **Modify**: `packages/studio/src/server/discovery.ts` (Expand `getAssetType` and `AssetInfo` to include new types).
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Update client-side `Asset` interface to match server types).
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Update `renderPreview` to display icons for new types).
- **Read-Only**: `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx` (Logic here is generic, just renders `AssetItem`).

#### 3. Implementation Spec
- **Architecture**:
  - The server-side discovery logic will now classify specific extensions into semantic types ('model', 'json', 'shader') instead of generic 'other'.
  - The client-side UI (`AssetItem`) will use these types to render appropriate placeholder icons (📦, {}, ⚡) since full previews (e.g., 3D viewer) are out of scope for this task.
- **Public API Changes**:
  - `AssetInfo` (server) and `Asset` (client) interfaces will accept `'model' | 'json' | 'shader'` as valid values for `type`.
- **Pseudo-Code**:
  - **In `discovery.ts`**:
    ```typescript
    function getAssetType(ext) {
      if (.glb, .gltf) return 'model';
      if (.json) return 'json';
      if (.glsl, .vert, .frag) return 'shader';
      // ... existing logic
    }
    ```
  - **In `AssetItem.tsx`**:
    ```typescript
    renderPreview() {
      switch(asset.type) {
        case 'model': return <div>📦</div>; // Styled icon
        case 'json': return <div>{}</div>;   // Styled icon
        case 'shader': return <div>⚡</div>; // Styled icon
        // ... existing cases
      }
    }
    ```

#### 4. Test Plan
- **Verification**:
  1.  Create a test directory (e.g., inside `examples/` or a temp dir if `HELIOS_PROJECT_ROOT` can be pointed there).
  2.  Add dummy files: `model.glb`, `data.json`, `test.frag`.
  3.  Run `npx helios studio`.
  4.  Verify that these files appear in the Assets Panel.
  5.  Verify that they have the correct distinct icons (not the generic file icon).
- **Success Criteria**: All new file types are visible, labeled correctly, and have distinct visual indicators.
- **Edge Cases**:
  - Files with no extension (should remain hidden or 'other').
  - Uppercase extensions (should be handled by existing normalization).
