# CLI Registry Dependency Resolution

## 1. Context & Goal
- **Objective**: Implement recursive installation of registry components to support composable component architectures.
- **Trigger**: The V2 vision ("Shadcn-style registry") requires components to declare dependencies on other registry items (e.g., a "Card" component depending on a "Button" component), which the current flat installer does not support.
- **Impact**: Enables the creation of complex, modular component libraries where users can install a high-level component (like a "Hero Section") and automatically receive all necessary sub-components and shared hooks.

## 2. File Inventory
- **Modify**: `packages/cli/src/registry/types.ts` (Add `registryDependencies` property to `ComponentDefinition`)
- **Modify**: `packages/cli/src/utils/install.ts` (Implement recursive installation logic with cycle detection)
- **Modify**: `packages/cli/src/registry/manifest.ts` (Add test components `parent-component` and `child-component` for verification)

## 3. Implementation Spec
- **Architecture**:
  - Extend the `ComponentDefinition` interface in `types.ts` to include an optional `registryDependencies: string[]` property.
  - Refactor `installComponent` in `install.ts` to accept a `visited` Set (defaults to empty) to track installation progress and prevent infinite recursion.
  - In `installComponent`:
    - Check if `componentName` is already in `visited`. If so, return immediately.
    - Add `componentName` to `visited`.
    - Retrieve the component definition.
    - If `registryDependencies` exist, iterate through them and recursively call `installComponent` for each dependency *before* installing the current component's files.
    - Ensure `helios.config.json` is updated to include all installed components (both parent and children).
- **Public API Changes**:
  - `ComponentDefinition` type updated.
  - `helios add` command will now recursively fetch and install registry dependencies.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  1.  **Setup**: Modify `packages/cli/src/registry/manifest.ts` to include two new components:
      - `child-component`: A simple component with no dependencies.
      - `parent-component`: A component that lists `child-component` in its `registryDependencies`.
  2.  **Execution**: Run `helios add parent-component` in a test project (or the repo root if simulated).
  3.  **Validation**:
      - Check that files for both `parent-component` and `child-component` exist in the target directory (e.g., `src/components/helios/`).
      - Check that `helios.config.json` contains both `parent-component` and `child-component` in the `components` array.
- **Success Criteria**:
  - `helios add parent-component` successfully installs both components.
  - No infinite loops occur even if dependencies are circular (handled by `visited` check).
  - The CLI outputs log messages indicating that dependencies are being installed.
- **Edge Cases**:
  - Circular dependencies (A -> B -> A).
  - Dependency already installed (should skip or overwrite based on flag).
  - Missing dependency (should throw meaningful error).
