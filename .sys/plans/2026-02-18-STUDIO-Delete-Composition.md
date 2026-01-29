#### 1. Context & Goal
- **Objective**: Implement "Delete Composition" functionality in Studio.
- **Trigger**: Vision gap. Users can create compositions (v0.43.0) but cannot delete them, leading to workspace clutter. This completes the basic CRUD lifecycle.
- **Impact**: Improves workspace management and user experience. Dependencies: None.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/studio/src/server/discovery.ts`: Add backend logic for directory deletion.
  - `packages/studio/vite-plugin-studio-api.ts`: Add DELETE API endpoint.
  - `packages/studio/src/context/StudioContext.tsx`: Add `deleteComposition` to context and state management.
  - `packages/studio/src/components/CompositionSwitcher.tsx`: Add delete button and confirmation logic to the UI.
- **Read-Only**:
  - `packages/studio/src/server/discovery.test.ts`: Reference for adding tests.

#### 3. Implementation Spec
- **Architecture**:
  - **Backend**: Expose a `deleteComposition` function in the discovery module that uses Node.js `fs` to remove directories.
  - **API**: Implement a RESTful `DELETE /api/compositions` endpoint in the Vite plugin.
  - **Frontend**: Expose the delete action via `StudioContext` and invoke it from the `CompositionSwitcher` UI with a confirmation step.

- **Pseudo-Code**:
  - **`packages/studio/src/server/discovery.ts`**:
    ```typescript
    export function deleteComposition(rootDir, id):
      projectRoot = getProjectRoot(rootDir)
      compDir = path.resolve(projectRoot, id)

      // SECURITY: strictly validate path is within project root
      if (!compDir.startsWith(projectRoot + path.sep)):
        throw Error("Access denied")

      if (!fs.exists(compDir)) throw Error("Not found")

      // Sanity check: ensure it looks like a composition (has composition.html)
      if (!fs.exists(path.join(compDir, 'composition.html'))):
         throw Error("Not a composition")

      fs.rmSync(compDir, { recursive: true, force: true })
    ```

  - **`packages/studio/vite-plugin-studio-api.ts`**:
    - Add `DELETE` handler to `/api/compositions` middleware.
    - Parse `id` from query parameters.
    - Call `deleteComposition`.
    - Return `{ success: true }` or error status.

  - **`packages/studio/src/context/StudioContext.tsx`**:
    - Add `deleteComposition(id)` to `StudioContextType`.
    - In `StudioProvider`:
      - Function `deleteComposition(id)`:
        - `await fetch('/api/compositions?id=' + id, { method: 'DELETE' })`
        - If success:
          - `setCompositions(prev => prev.filter(c => c.id !== id))`
          - If `activeComposition.id === id`:
            - `setActiveComposition(null)` or first available.

  - **`packages/studio/src/components/CompositionSwitcher.tsx`**:
    - In the composition list item render loop:
      - Add a "Delete" button (Trash icon 🗑).
      - On Click:
        - `e.stopPropagation()` (prevent selection).
        - `if (confirm("Are you sure...")): deleteComposition(id).catch(console.error)`

- **Public API Changes**:
  - Backend: `export function deleteComposition(...)`
  - HTTP API: `DELETE /api/compositions`
  - Frontend Context: `deleteComposition(id: string): Promise<void>`

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npx helios studio`.
  - Create a new composition "To Delete".
  - Open Composition Switcher (Cmd+K).
  - Verify "Delete" button appears.
  - Click "Delete", confirm dialog.
  - Verify composition disappears from list.
  - Verify directory is removed from disk.
- **Success Criteria**:
  - Composition is permanently removed from filesystem.
  - UI updates immediately without refresh.
  - Attempting to delete valid composition works.
  - Attempting to delete outside root fails (security check).
- **Edge Cases**:
  - Deleting the currently active composition (should handle gracefully).
  - Deleting a composition that was already deleted (404 handling).
