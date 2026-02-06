# 2026-09-25-STUDIO-OpenInEditor

#### 1. Context & Goal
- **Objective**: Implement "Open in Editor" functionality to allow users to open composition files and assets in their default code editor directly from the Studio UI.
- **Trigger**: Vision gap "Browser-based development environment". Users currently have to manually navigate their file system to edit the code they are previewing, which breaks the "Hot Reloading" feedback loop.
- **Impact**: Significantly improves Developer Experience (DX) by reducing friction between the Studio (Preview) and the Editor (Code).

#### 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add `openInEditor` function)
- **Modify**: `packages/studio/src/components/CompositionsPanel/CompositionItem.tsx` (Add "Open" button)
- **Modify**: `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Add "Open" button)
- **Read-Only**: `packages/studio/src/server/plugin.ts` (To confirm middleware behavior if needed)

#### 3. Implementation Spec
- **Architecture**: Leverage Vite's built-in `/__open-in-editor` middleware, which is available in the dev server used by both `vite` and `npx helios studio`.
- **Pseudo-Code**:
  ```typescript
  // StudioContext.tsx
  const openInEditor = (path: string) => {
    // Strip /@fs prefix if present to get absolute path (Vite serves absolute paths with /@fs)
    const safePath = path.replace(/^\/@fs/, '');

    // Fire and forget request to Vite's middleware
    fetch('/__open-in-editor?file=' + encodeURIComponent(safePath))
      .catch(err => console.error('Failed to open in editor', err));
  };
  ```
- **Public API Changes**: No external API changes. `StudioContext` adds `openInEditor`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio` (after implementing).
  - Click "Open in Editor" icon/button on a composition item.
  - Click "Open in Editor" icon/button on an asset item.
  - Verify network request to `/__open-in-editor?file=...`.
- **Success Criteria**:
  - The fetch request is sent with the correct path.
  - Ideally, the local editor opens (if configured in environment).
- **Edge Cases**:
  - Path encoding (spaces, special chars).
  - Windows paths (handled by `/@fs` and Vite).
