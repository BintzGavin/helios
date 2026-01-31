# 📋 STUDIO: Recursive Composition Discovery

## 1. Context & Goal
- **Objective**: Update the Studio backend to recursively discover compositions within the project directory, allowing for nested organization.
- **Trigger**: The current "flat list" discovery limits users to a single directory level, preventing effective project organization (e.g., `client/project` folders) which is a gap in the "Studio as a Tool" vision.
- **Impact**: Enables users to structure their projects with subdirectories. Studio will automatically find any folder containing `composition.html` at any depth (excluding standard ignore patterns).

## 2. File Inventory
- **Modify**: `packages/studio/src/server/discovery.ts` (Implement recursive scan logic)
- **Modify**: `packages/studio/src/server/discovery.test.ts` (Add tests for `findCompositions` with nested structures)

## 3. Implementation Spec
- **Architecture**: Refactor `findCompositions` from a flat loop to a recursive directory walker, mirroring the logic in `findAssets`.
- **Logic**:
    - Implement a `scan(dir)` helper function inside `findCompositions`.
    - Iterate through directory entries:
        - Skip ignored directories: `node_modules`, `.git`, `dist`, `build`.
        - If directory contains `composition.html`:
            - Register as a composition.
            - **ID**: Use the relative path from project root (e.g., `marketing/promo-v1`).
            - **Name**: Continue using the formatted leaf folder name (e.g., "Promo V1").
            - **Description**: Update to show the full relative path for clarity (e.g., `marketing/promo-v1`).
        - If directory does *not* contain `composition.html`:
            - Recurse into the directory to check for nested compositions.
- **Public API Changes**:
    - `findCompositions` return type remains `CompositionInfo[]`, but `id` values will now contain forward slashes for nested items.
    - `deleteComposition` and `updateCompositionMetadata` already support paths via `id`, so no changes needed there (they use `path.resolve`).

## 4. Test Plan
- **Verification**:
    - Add a unit test in `discovery.test.ts` mocking a nested file system:
        - `root/comp1/composition.html`
        - `root/folder/comp2/composition.html`
    - Verify `findCompositions` returns both items.
    - Verify IDs are correctly formatted as relative paths (`comp1`, `folder/comp2`).
- **Edge Cases**:
    - Deeply nested compositions.
    - Windows path separators (ensure IDs use forward slashes for consistency).
    - Ignored directories (`node_modules`).
    - Folders with similar names in different paths.
