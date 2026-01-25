#### 1. Context & Goal
- **Objective**: Implement the Assets Panel UI in the Studio sidebar to allow previewing project assets.
- **Trigger**: Vision gap "Assets panel - Preview and manage assets from your project's public folder".
- **Impact**: Unlocks the ability for users to visualize their project's available media files, even if the data source is currently mocked.

#### 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AssetsPanel/AssetsPanel.tsx`
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx`
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx` (Add assets state and types)
  - `packages/studio/src/App.tsx` (Integrate AssetsPanel into sidebar)
- **Read-Only**:
  - `packages/studio/src/components/Layout/StudioLayout.tsx`

#### 3. Implementation Spec
- **Architecture**:
  - Extend `StudioContext` to hold an `assets` array.
  - Implement `AssetsPanel` as a consumer of this context.
  - Use a grid layout for thumbnails.
  - Mock data will be used initially (Vision gap: Backend API missing, but UI can be ready).
- **Public API Changes**:
  - `StudioContext` exports `Asset` interface and `assets` array.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build` in `packages/studio` to ensure type safety and build success.
  - (Manual) Run `npm run dev` and check the sidebar for the Assets grid.
- **Success Criteria**:
  - Sidebar displays "Assets" panel instead of placeholder.
  - Mock assets are rendered as a grid of thumbnails.
- **Edge Cases**:
  - Empty assets list (should show "No assets found").
  - Long asset names (should truncate).
