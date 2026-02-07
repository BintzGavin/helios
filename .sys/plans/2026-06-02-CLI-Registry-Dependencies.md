# Plan: CLI Recursive Registry Dependencies

## 1. Context & Goal
- **Objective**: Implement recursive installation of registry components to support shared dependencies (e.g., hooks) and prevent code duplication.
- **Trigger**: Currently, `helios add` is flat. Components like `timer` and `progress-bar` duplicate the `useVideoFrame.ts` file. "Shadcn-style" registries require shared components to be installed automatically.
- **Impact**: Reduces code duplication in the registry and enables building complex, composable component libraries.

## 2. File Inventory
- **Modify**: `packages/cli/src/registry/types.ts` (Add `registryDependencies` to `ComponentDefinition`)
- **Modify**: `packages/cli/src/utils/install.ts` (Implement recursive installation with cycle detection)
- **Modify**: `packages/cli/src/registry/manifest.ts` (Refactor `timer` and `progress-bar` to use a shared `use-video-frame` component)

## 3. Implementation Spec
- **Architecture**:
    - Extend `ComponentDefinition` with `registryDependencies?: string[]`.
    - Update `installComponent` to accept a `visited` Set to track recursion path.
    - Before installing a component, recursively install its `registryDependencies`.
    - Ensure all installed components are added to `helios.config.json` after successful installation.
- **Refactoring Strategy (manifest.ts)**:
    - Extract `useVideoFrame.ts` content into a new registry item: `use-video-frame`.
    - Update `timer` definition:
        - Remove `useVideoFrame.ts` from `files`.
        - Add `registryDependencies: ['use-video-frame']`.
    - Update `progress-bar` definition:
        - Remove `useVideoFrame.ts` from `files`.
        - Add `registryDependencies: ['use-video-frame']`.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
    1.  Create a temporary test project: `node packages/cli/bin/helios.js init test-project --yes`.
    2.  Run `cd test-project && node ../packages/cli/bin/helios.js add timer`.
    3.  **Check Files**: Verify `src/components/helios/Timer.tsx` AND `src/components/helios/useVideoFrame.ts` exist.
    4.  **Check Config**: Verify `helios.config.json` contains `timer` and `use-video-frame` in the `components` array.
    5.  **Check Content**: Ensure `Timer.tsx` imports `useVideoFrame` correctly from the same directory (default `src/components/helios`).
- **Success Criteria**:
    - `helios add timer` installs `use-video-frame` automatically.
    - `helios add progress-bar` installs `use-video-frame` automatically.
    - If `use-video-frame` is already installed, it is skipped (or overwritten if specified).
    - `helios.config.json` tracks all installed components.
- **Edge Cases**:
    - Circular dependencies (should be handled by `visited` check).
    - Invalid dependency name (should throw meaningful error).
